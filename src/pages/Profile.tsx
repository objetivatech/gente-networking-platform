import { useState, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import RankBadge from '@/components/RankBadge';
import { PointsHistoryCard } from '@/components/PointsHistoryCard';
import { PointsEvolutionChart } from '@/components/PointsEvolutionChart';
import { Loader2, Save, User, Building, Phone, Mail, Globe, Linkedin, Instagram, Camera, Upload, ImagePlus, Cake } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Profile() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { data: stats } = useStats();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    position: '',
    business_segment: '',
    phone: '',
    bio: '',
    linkedin_url: '',
    instagram_url: '',
    website_url: '',
    birthday: '',
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company: profile.company || '',
        position: profile.position || '',
        business_segment: profile.business_segment || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        linkedin_url: profile.linkedin_url || '',
        instagram_url: profile.instagram_url || '',
        website_url: profile.website_url || '',
        birthday: profile.birthday || '',
      });
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingBanner(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

      updateProfile({ banner_url: `${publicUrl}?t=${Date.now()}` });

      toast({
        title: 'Sucesso!',
        description: 'Foto de capa atualizada',
      });
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload da capa',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });

      toast({
        title: 'Sucesso!',
        description: 'Avatar atualizado com sucesso',
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload do avatar',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
        {!isEditing ? (
          <Button onClick={handleEdit}>Editar Perfil</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Card do Perfil */}
      <Card className="overflow-hidden">
        {/* Banner */}
        <div 
          className="relative h-32 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20"
          style={profile?.banner_url ? { 
            backgroundImage: `url(${profile.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : undefined}
        >
          <button
            onClick={handleBannerClick}
            disabled={isUploadingBanner}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploadingBanner ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <div className="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-lg">
                <ImagePlus className="h-5 w-5" />
                <span>Alterar capa</span>
              </div>
            )}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </div>

        <CardContent className="relative pt-0">
          <div className="flex flex-col md:flex-row gap-6 -mt-16 md:-mt-20">
            {/* Avatar e Rank */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-muted-foreground">Clique para alterar</p>
              {profile && <RankBadge rank={profile.rank} size="lg" />}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Pontos</p>
                <p className="text-2xl font-bold text-primary">{profile?.points || 0}</p>
              </div>
            </div>

            {/* Dados */}
            <div className="flex-1 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">WhatsApp</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Empresa</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business_segment">Segmento de Negócio</Label>
                      <Input
                        id="business_segment"
                        value={formData.business_segment}
                        onChange={(e) => setFormData({ ...formData, business_segment: e.target.value })}
                        placeholder="Ex: Tecnologia, Advocacia..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Cargo</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Data de Aniversário</Label>
                      <Input
                        id="birthday"
                        type="date"
                        value={formData.birthday}
                        onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Conte um pouco sobre você..."
                      rows={3}
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn</Label>
                      <Input
                        id="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram_url">Instagram</Label>
                      <Input
                        id="instagram_url"
                        value={formData.instagram_url}
                        onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                        placeholder="@usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website_url">Website</Label>
                      <Input
                        id="website_url"
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
                    {profile?.position && profile?.company && (
                      <p className="text-muted-foreground">
                        {profile.position} na {profile.company}
                      </p>
                    )}
                  </div>

                  {profile?.bio && (
                    <p className="text-foreground/80">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 pt-2">
                    {profile?.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{profile.email}</span>
                      </div>
                    )}
                    {profile?.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile?.company && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="w-4 h-4" />
                        <span>{profile.company}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    {profile?.linkedin_url && (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {profile?.instagram_url && (
                      <a
                        href={`https://instagram.com/${profile.instagram_url.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {profile?.website_url && (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas do Membro */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Estatísticas</CardTitle>
          <CardDescription>Resumo das suas atividades na comunidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-primary">{stats?.attendances || 0}</p>
              <p className="text-sm text-muted-foreground">Presenças</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-primary">{stats?.genteEmAcao?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Gente em Ação</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-primary">{stats?.testimonials?.sent || 0}</p>
              <p className="text-sm text-muted-foreground">Depoimentos</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-primary">R$ {((stats?.businessDeals?.value || 0) / 1000).toFixed(1)}k</p>
              <p className="text-sm text-muted-foreground">Em Negócios</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-primary">{stats?.referrals?.sent || 0}</p>
              <p className="text-sm text-muted-foreground">Indicações</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução de Pontos */}
      {user?.id && <PointsEvolutionChart userId={user.id} />}

      {/* Histórico de Pontos */}
      {user?.id && <PointsHistoryCard userId={user.id} />}
    </div>
  );
}
