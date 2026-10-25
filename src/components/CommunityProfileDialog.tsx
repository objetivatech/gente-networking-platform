/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { useEntitlements } from '@/hooks/useEntitlements';
import { normalizeBrazilianWhatsAppPhone, buildSchedulingWhatsAppUrl } from '@/lib/whatsapp-scheduling';
import RichText from './RichText';
import { MessageCircle, ExternalLink } from 'lucide-react';
interface CommunityProfile {
  id: string; full_name: string; company: string | null; position: string | null; avatar_url: string | null;
  bio: string | null; what_i_do: string | null; ideal_client: string | null; how_to_refer_me: string | null;
  phone: string | null; website_url: string | null; linkedin_url: string | null; instagram_url: string | null; availability_note: string | null;
}
const safeUrl = (raw: string | null) => { try { const u = new URL(raw ?? ''); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; } };
export function CommunityProfileDialog({ profileId, onClose }: { profileId: string | null; onClose: () => void }) {
  const { can } = useEntitlements();
  const { data: profile, isLoading, error } = useQuery({ queryKey: ['community-profile', profileId], enabled: !!profileId,
    queryFn: async () => { if (!profileId) return null; const { data, error } = await supabase.rpc('get_community_profile', { _profile_id: profileId }); if (error) throw error; return data as unknown as CommunityProfile; },
  });
  const phone = normalizeBrazilianWhatsAppPhone(profile?.phone);
  return <Dialog open={!!profileId} onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto min-w-0">
    <DialogHeader><DialogTitle>{profile?.full_name ?? 'Perfil da Comunidade'}</DialogTitle></DialogHeader>
    {isLoading ? <p role="status">Carregando…</p> : error ? <p className="text-destructive">Perfil indisponível.</p> : profile && <>
      <div className="flex gap-3 items-center min-w-0"><Avatar className="h-20 w-20"><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{profile.full_name.slice(0, 2)}</AvatarFallback></Avatar><div className="min-w-0 text-wrap-anywhere"><p className="font-medium">{profile.company}</p><p className="text-muted-foreground">{profile.position}</p></div></div>
      {[[null, profile.bio], ['O que faz', profile.what_i_do], ['Cliente ideal', profile.ideal_client], ['Como indicar', profile.how_to_refer_me]].map(([label, value], index) => value && <div key={index} className="min-w-0 text-wrap-anywhere">{label && <h3 className="font-medium mb-1">{label}</h3>}<RichText value={value} /></div>)}
      <div className="flex flex-wrap gap-2">{[['Site', profile.website_url], ['LinkedIn', profile.linkedin_url], ['Instagram', profile.instagram_url]].map(([label, url]) => safeUrl(url) && <Button key={label} variant="outline" size="sm" asChild><a href={safeUrl(url)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" />{label}</a></Button>)}</div>
      <div className="flex flex-wrap gap-2">{phone && <Button asChild variant="outline"><a href={buildSchedulingWhatsAppUrl(phone, `Olá, ${profile.full_name}! Vi seu perfil na Comunidade Gente e gostaria de conversar.`)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-2" />Chamar no WhatsApp</a></Button>}
      {can('can_create_gente_em_acao') && <ScheduleMeetingDialog recipientId={profile.id} memberName={profile.full_name} availabilityNote={profile.availability_note} />}</div>
    </>}
  </DialogContent></Dialog>;
}