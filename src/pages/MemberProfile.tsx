import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import RankBadge from '@/components/RankBadge';
import { Loader2, ArrowLeft, Building, Phone, Mail, Globe, Linkedin, Instagram, Cake, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';

interface MemberProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  business_segment: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  birthday: string | null;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';
  points: number;
  slug: string | null;
  is_active: boolean;
}

export default function MemberProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, isFacilitator, isLoading: roleLoading } = useAdmin();

  // Buscar equipes do usuário atual
  const { data: currentUserTeams } = useQuery({
    queryKey: ['current-user-teams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);
      return data?.map(tm => tm.team_id) || [];
    },
    enabled: !!user?.id,
  });

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member-profile', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Slug do membro não informado');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error && slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: dataById, error: errorById } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', slug)
          .maybeSingle();

        if (errorById) throw errorById;
        return dataById as MemberProfile | null;
      }

      if (error) throw error;
      return data as MemberProfile | null;
    },
    enabled: !!slug,
  });

  const { data: teamInfo } = useQuery({
    queryKey: ['member-team', member?.id],
    queryFn: async () => {
      if (!member?.id) return null;
      
      const { data } = await supabase
        .from('team_members')
        .select('team_id, is_facilitator, teams(name, color)')
        .eq('user_id', member.id)
        .single();

      return data;
    },
    enabled: !!member?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['member-stats', member?.id],
    queryFn: async () => {
      if (!member?.id) return null;
      
      const [attendances, genteEmAcao, testimonials, businessDeals, referrals] = await Promise.all([
        supabase.from('attendances').select('id', { count: 'exact' }).eq('user_id', member.id),
        supabase.from('gente_em_acao').select('id', { count: 'exact' }).eq('user_id', member.id),
        supabase.from('testimonials').select('id', { count: 'exact' }).eq('from_user_id', member.id),
        supabase.from('business_deals').select('value').eq('closed_by_user_id', member.id),
        supabase.from('referrals').select('id', { count: 'exact' }).eq('from_user_id', member.id),
      ]);

      const totalDealsValue = businessDeals.data?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;

      return {
        attendances: attendances.count || 0,
        genteEmAcao: genteEmAcao.count || 0,
        testimonials: testimonials.count || 0,
        businessDealsValue: totalDealsValue,
        referrals: referrals.count || 0,
      };
    },
    enabled: !!member?.id,
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${member?.full_name}`,
          text: `Confira o perfil de ${member?.full_name} na comunidade Gente Networking`,
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copiado!',
        description: 'O link do perfil foi copiado para a área de transferência',
      });
    }
  };

  const formatBirthday = (birthday: string | null) => {
    if (!birthday) return null;
    try {
      const date = new Date(birthday + 'T00:00:00');
      return format(date, "dd 'de' MMMM", { locale: ptBR });
    } catch {
      return null;
    }
  };

  if (isLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verificar permissão de acesso
  const hasAccess = () => {
    // Admin pode ver todos
    if (isAdmin) return true;
    
    // Facilitador pode ver todos
    if (isFacilitator) return true;
    
    // Membro pode ver o próprio perfil
    if (user?.id === member?.id) return true;
    
    // Membro pode ver outros do mesmo grupo
    if (member && teamInfo?.team_id && currentUserTeams?.includes(teamInfo.team_id)) {
      return true;
    }
    
    // Se não tem member ainda, não podemos verificar
    if (!member) return false;
    
    return true; // Por padrão, permite visualização
  };

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Membro não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/membros')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Membros
        </Button>
      </div>
    );
  }

  if (!hasAccess()) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Você não tem permissão para visualizar este perfil</p>
        <p className="text-sm text-muted-foreground">Apenas administradores, facilitadores ou membros do mesmo grupo podem visualizar este perfil</p>
        <Button variant="outline" onClick={() => navigate('/membros')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Membros
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/membros')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Compartilhar
        </Button>
      </div>

      {/* Profile Card with Banner */}
      <Card className="overflow-hidden">
        {/* Banner */}
        <div 
          className="h-32 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20"
          style={member.banner_url ? { 
            backgroundImage: `url(${member.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : undefined}
        />
        
        <CardContent className="relative pt-6">
          {/* Avatar overlapping banner */}
          <div className="absolute -top-16 left-6">
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={member.avatar_url || ''} alt={member.full_name || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content with proper spacing */}
          <div className="flex flex-col md:flex-row gap-6 pt-20 md:pt-4">
            {/* Rank e Pontos - sidebar on desktop */}
            <div className="hidden md:flex flex-col items-center gap-4 min-w-[140px]">
              <RankBadge rank={member.rank} size="lg" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Pontos</p>
                <p className="text-2xl font-bold text-primary">{member.points || 0}</p>
              </div>
            </div>

            {/* Member Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{member.full_name}</h1>
                {member.position && member.company && (
                  <p className="text-muted-foreground">
                    {member.position} na {member.company}
                  </p>
                )}
                {member.business_segment && (
                  <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {member.business_segment}
                  </span>
                )}
              </div>

              {/* Team Badge */}
              {teamInfo?.teams && (
                <div className="flex items-center gap-2">
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: (teamInfo.teams as any).color || 'hsl(var(--primary))' }}
                  >
                    {(teamInfo.teams as any).name}
                  </span>
                  {teamInfo.is_facilitator && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-medium">
                      Facilitador
                    </span>
                  )}
                </div>
              )}

              {member.bio && (
                <p className="text-foreground/80">{member.bio}</p>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 pt-2">
                {member.email && (
                  <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="w-4 h-4" />
                    <span>{member.email}</span>
                  </a>
                )}
                {member.phone && (
                  <a href={`https://wa.me/${member.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-4 h-4" />
                    <span>{member.phone}</span>
                  </a>
                )}
                {member.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="w-4 h-4" />
                    <span>{member.company}</span>
                  </div>
                )}
                {member.birthday && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Cake className="w-4 h-4" />
                    <span>{formatBirthday(member.birthday)}</span>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex gap-3 pt-2">
                {member.linkedin_url && (
                  <a
                    href={member.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {member.instagram_url && (
                  <a
                    href={`https://instagram.com/${member.instagram_url.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {member.website_url && (
                  <a
                    href={member.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
              </div>

              {/* Rank e Pontos - mobile only */}
              <div className="flex md:hidden justify-center gap-6 pt-4">
                <RankBadge rank={member.rank} size="lg" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Pontos</p>
                  <p className="text-2xl font-bold text-primary">{member.points || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      {stats && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Estatísticas na Comunidade</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{stats.attendances}</p>
                <p className="text-sm text-muted-foreground">Presenças</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{stats.genteEmAcao}</p>
                <p className="text-sm text-muted-foreground">Gente em Ação</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{stats.testimonials}</p>
                <p className="text-sm text-muted-foreground">Depoimentos</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">R$ {(stats.businessDealsValue / 1000).toFixed(1)}k</p>
                <p className="text-sm text-muted-foreground">Em Negócios</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{stats.referrals}</p>
                <p className="text-sm text-muted-foreground">Indicações</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
