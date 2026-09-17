/**
 * Compatibilidade da gestão administrativa com a base unificada de convidados.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GuestRecord {
  invitation: {
    id: string;
    code: string;
    created_at: string;
    accepted_at: string | null;
    status: string;
    email: string | null;
    name: string | null;
  };
  inviter: {
    id: string;
    full_name: string;
    company: string | null;
    avatar_url: string | null;
  };
  guest: {
    id: string;
    full_name: string;
    company: string | null;
    avatar_url: string | null;
    email: string | null;
    slug: string | null;
  } | null;
  guestRole: 'admin' | 'facilitador' | 'membro' | 'convidado' | null;
  becameMember: boolean;
}

export function useAdminGuests() {
  const { data: guestRecords, isLoading } = useQuery({
    queryKey: ['admin-guest-records'],
    queryFn: async (): Promise<GuestRecord[]> => {
      const { data, error } = await supabase.rpc('get_guest_journey_directory' as any);
      if (error) throw error;
      return ((data || []) as any[]).map(row => {
        const guestRole = row.role_current ?? null;
        return {
          invitation: {
            id: row.invitation_id ?? row.id,
            code: '',
            created_at: row.entered_at,
            accepted_at: row.profile_id ? row.entered_at : null,
            status: row.invitation_status ?? (row.profile_id ? 'accepted' : 'pending'),
            email: row.email,
            name: row.full_name,
          },
          inviter: {
            id: row.invited_by_id ?? '',
            full_name: row.invited_by_name ?? 'Origem automática',
            company: null,
            avatar_url: null,
          },
          guest: row.profile_id ? {
            id: row.profile_id,
            full_name: row.full_name,
            company: row.company,
            avatar_url: row.avatar_url,
            email: row.email,
            slug: row.slug,
          } : null,
          guestRole,
          becameMember: row.journey_status === 'promovido_membro',
        };
      });
    },
  });

  // Buscar lista de membros para filtro
  const { data: members } = useQuery({
    queryKey: ['members-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  return { guestRecords, members, isLoading };
}
