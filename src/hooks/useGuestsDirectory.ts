/**
 * useGuestsDirectory - Diretório consolidado de convidados da comunidade
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * v3.48.0 — Usa a RPC `get_guest_journey_directory`, reunindo pré-ativação,
 * convidados ativos, participantes e promovidos com privacidade por papel.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GuestJourneyStatus =
  | 'cadastro_recebido'
  | 'aguardando_ativacao'
  | 'convidado_ativo'
  | 'ja_participou'
  | 'promovido_membro';
export type GuestOnboardingCategory =
  | 'gente_hub'
  | 'impulso'
  | 'comunidade'
  | 'participe'
  | 'site'
  | 'outra_origem';

export interface GuestDirectoryEntry {
  id: string;
  lead_id: string | null;
  profile_id: string | null;
  invitation_id: string | null;
  full_name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  business_segment: string | null;
  current_role: 'admin' | 'facilitador' | 'membro' | 'convidado' | null;
  status: GuestJourneyStatus;
  onboarding_category: GuestOnboardingCategory;
  source: string | null;
  source_detail: string | null;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  invited_by_id: string | null;
  invited_by_name: string | null;
  entered_at: string | null;
  invitation_status: string | null;
  invitation_expires_at: string | null;
  email_status: string;
  email_sent_at: string | null;
  attendance_count: number;
  can_manage: boolean;
}

export function useGuestsDirectory() {
  return useQuery({
    queryKey: ['guests-directory'],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<GuestDirectoryEntry[]> => {
      const { data, error } = await supabase.rpc('get_guest_journey_directory' as any);
      if (error) {
        // 'forbidden' → usuário sem permissão; devolvemos vazio para a UI tratar.
        if ((error as any).message?.includes('forbidden')) return [];
        throw error;
      }
      const rows = (data || []) as any[];
      return rows.map((r): GuestDirectoryEntry => ({
        id: r.id,
        lead_id: r.lead_id ?? null,
        profile_id: r.profile_id ?? null,
        invitation_id: r.invitation_id ?? null,
        full_name: r.full_name,
        slug: r.slug ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        company: r.company ?? null,
        avatar_url: r.avatar_url ?? null,
        business_segment: r.business_segment ?? null,
        current_role: r.role_current ?? null,
        status: r.journey_status as GuestJourneyStatus,
        onboarding_category: (r.onboarding_category ?? 'outra_origem') as GuestOnboardingCategory,
        source: r.source ?? null,
        source_detail: r.source_detail ?? null,
        team_id: r.team_id ?? null,
        team_name: r.team_name ?? null,
        team_color: r.team_color ?? null,
        invited_by_id: r.invited_by_id ?? null,
        invited_by_name: r.invited_by_name ?? null,
        entered_at: r.entered_at ?? null,
        invitation_status: r.invitation_status ?? null,
        invitation_expires_at: r.invitation_expires_at ?? null,
        email_status: r.email_status ?? 'pending',
        email_sent_at: r.email_sent_at ?? null,
        attendance_count: r.attendance_count ?? 0,
        can_manage: r.can_manage === true,
      }));
    },
  });
}
