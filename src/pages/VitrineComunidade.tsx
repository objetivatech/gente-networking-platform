/**
 * VitrineComunidade - Galeria interna exclusiva de Assinantes e Convidados ativos.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { CommunityProfileDialog } from '@/components/CommunityProfileDialog';
import { useConnectionDoors, useConnectionTaxonomies } from '@/hooks/useConnectionDoors';
import { ConnectionDoorsTags } from '@/components/profile/ConnectionDoorsTags';
import { doorLabels } from '@/lib/connection-doors';
import { ScheduleMeetingDialog } from '@/components/ScheduleMeetingDialog';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, HeartHandshake, Search, Sparkles, Users } from 'lucide-react';
import SEO from '@/components/SEO';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { richTextToPlain } from '@/lib/rich-text';
import { useAdmin } from '@/hooks/useAdmin';
import { useCommunityShowcase } from '@/hooks/useCommunityShowcase';
import { canAccessCommunityShowcase } from '@/lib/access-control';
import { useProfile } from '@/hooks/useProfile';
import { useProfilesCompleteness } from '@/hooks/useProfilesCompleteness';
import { ProfileCompletenessBadge } from '@/components/profile/ProfileCompletenessBadge';
import { getCompatibilityScore, sortByCompletenessAndCompatibility } from '@/lib/profile-completeness';

const initials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default function VitrineComunidade() {
  const { role, isLoading: roleLoading } = useAdmin();
  const { can, isLoading: rightsLoading } = useEntitlements();
  const allowed = canAccessCommunityShowcase(role, can('can_access_community_showcase')) && can('can_access_community_showcase');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const { data: profiles, isLoading } = useCommunityShowcase(!roleLoading && allowed);
  const [search, setSearch] = useState('');

  const { profile: viewer } = useProfile();
  const completeness = useProfilesCompleteness((profiles || []).map((p) => p.id));
  const doors = useConnectionDoors((profiles || []).map((p) => p.id));
  const { data: taxonomies = [] } = useConnectionTaxonomies();

  // Ordenação padrão (invisível): 1º completude, 2º compatibilidade com quem visita.
  const ranked = useMemo(() => sortByCompletenessAndCompatibility(
    (profiles || []).map((p) => ({ ...p, ...doors.get(p.id), percent: completeness.get(p.id) ?? 0, compatibility: getCompatibilityScore(viewer, { ...p, ...doors.get(p.id) }, taxonomies) })),
  ), [profiles, completeness, viewer, doors, taxonomies]);
  const compatibleCount = ranked.filter((p) => p.compatibility > 0).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ranked;
    return ranked.filter((p) =>
      [p.full_name, p.company, p.position, p.business_segment,
        richTextToPlain(p.what_i_do), richTextToPlain(p.ideal_client), ...(p.tags || []), ...doorLabels(p.doors_open, taxonomies), ...doorLabels(p.doors_seek, taxonomies)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [ranked, search, taxonomies]);

  if (!roleLoading && !rightsLoading && !allowed) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6 animate-fade-in">
      <SEO
        title="Vitrine da Comunidade"
        description="Conheça Assinantes da Comunidade e Convidados ativos do Gente Networking."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Vitrine da Comunidade</h1>
              <p className="text-muted-foreground">Assinantes e Convidados ativos disponíveis para conexão.</p>
            </div>
          </div>
        </div>
        {role === 'assinante' && can('matchmaking_enabled') && (
          <Button asChild className="shrink-0">
            <Link to="/matchmaking">
              <Sparkles className="mr-2 h-4 w-4" /> Ir para o MatchMaking
            </Link>
          </Button>
        )}
      </div>

      {!isLoading && ranked.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-8 w-8 shrink-0 text-primary" />
              <p className="text-sm sm:text-base">
                <strong className="text-lg text-primary">{ranked.length}</strong> {ranked.length === 1 ? 'perfil disponível' : 'perfis disponíveis'} na vitrine ·{' '}
                <strong className="text-lg text-accent">{compatibleCount}</strong> com compatibilidade possível com você
              </p>
            </div>
            <p className="text-xs text-muted-foreground sm:max-w-xs">Os perfis mais completos e mais compatíveis aparecem primeiro.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, empresa, segmento ou interesse..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading || roleLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-56 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum perfil ativo encontrado na vitrine.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((profile) => (
            <Card key={profile.id} className="flex min-w-0 flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                    <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="line-clamp-2 text-base text-wrap-anywhere">{profile.full_name}</CardTitle>
                    {profile.position && <CardDescription className="line-clamp-2 text-wrap-anywhere">{profile.position}</CardDescription>}
                  </div>
                  <Badge variant={profile.role === 'assinante' ? 'default' : 'secondary'} className="shrink-0">
                    {profile.role === 'assinante' ? 'Assinante' : 'Convidado'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 text-sm">
                {profile.company && (
                  <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-2 text-wrap-anywhere">{profile.company}</span>
                  </div>
                )}
                <ProfileCompletenessBadge percent={completeness.get(profile.id)} />
                <ConnectionDoorsTags doors={profile} />
                {profile.business_segment && <Badge variant="outline" className="w-fit">{profile.business_segment}</Badge>}
                {richTextToPlain(profile.what_i_do) && (
                  <div className="min-w-0">
                    <p className="font-medium">O que faz</p>
                    <p className="line-clamp-3 text-muted-foreground text-wrap-anywhere whitespace-pre-line">{richTextToPlain(profile.what_i_do)}</p>
                  </div>
                )}
                {richTextToPlain(profile.ideal_client) && (
                  <div className="min-w-0">
                    <p className="font-medium">Cliente ideal</p>
                    <p className="line-clamp-3 text-muted-foreground text-wrap-anywhere whitespace-pre-line">{richTextToPlain(profile.ideal_client)}</p>
                  </div>
                )}
                {profile.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
                <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                  <HeartHandshake className="h-3.5 w-3.5" /> Perfil ativo na comunidade
                </div>
                <Button variant="outline" onClick={() => setSelectedProfileId(profile.id)}>Ver perfil</Button>
                {can('can_create_gente_em_acao') && <ScheduleMeetingDialog recipientId={profile.id} memberName={profile.full_name} className="w-full whitespace-normal h-auto min-h-10" />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <CommunityProfileDialog profileId={selectedProfileId} onClose={() => setSelectedProfileId(null)} />
    </div>
  );
}
