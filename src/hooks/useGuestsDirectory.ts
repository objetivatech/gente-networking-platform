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
 * v3.9.0 — Usa a RPC `get_guests_directory` (SECURITY DEFINER) que valida role
 * no banco e devolve apenas dados necessários. Isso evita depender de RLS aberto
 * em `invitations` e corrige o bug em que membros comuns não viam o diretório.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GuestJourneyStatus = 'awaiting_first' | 'attended' | 'promoted';

export interface GuestDirectoryEntry {
  id: string;
  full_name: string;
  slug: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  business_segment: string | null;
  current_role: 'admin' | 'facilitador' | 'membro' | 'convidado' | null;
  status: GuestJourneyStatus;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
  invited_by_id: string | null;
  invited_by_name: string | null;
  invited_at: string | null;
  attendance_count: number;
}

export function useGuestsDirectory() {
  return useQuery({
    queryKey: ['guests-directory'],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<GuestDirectoryEntry[]> => {
      const { data, error } = await supabase.rpc('get_guests_directory' as any);
      if (error) {
        // 'forbidden' → usuário sem permissão; devolvemos vazio para a UI tratar.
        if ((error as any).message?.includes('forbidden')) return [];
        throw error;
      }
      const rows = (data || []) as any[];
      return rows.map((r): GuestDirectoryEntry => ({
        id: r.id,
        full_name: r.full_name,
        slug: r.slug ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        company: r.company ?? null,
        avatar_url: r.avatar_url ?? null,
        business_segment: r.business_segment ?? null,
        current_role: r.role_current ?? null,
        status: r.status as GuestJourneyStatus,
        team_id: r.team_id ?? null,
        team_name: r.team_name ?? null,
        team_color: r.team_color ?? null,
        invited_by_id: r.invited_by_id ?? null,
        invited_by_name: r.invited_by_name ?? null,
        invited_at: r.invited_at ?? null,
        attendance_count: r.attendance_count ?? 0,
      }));
    },
  });
}
