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
  } | null;
  guestRole: 'admin' | 'facilitador' | 'membro' | 'convidado' | null;
  becameMember: boolean;
}

export function useAdminGuests() {
  const { data: guestRecords, isLoading } = useQuery({
    queryKey: ['admin-guest-records'],
    queryFn: async (): Promise<GuestRecord[]> => {
      // Buscar todos os convites
      const { data: invitations, error: invError } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (invError) throw invError;

      // Buscar perfis dos inviters
      const inviterIds = [...new Set(invitations?.map(i => i.invited_by) || [])];
      const acceptedByIds = invitations?.filter(i => i.accepted_by).map(i => i.accepted_by) || [];
      const allUserIds = [...new Set([...inviterIds, ...acceptedByIds])];

      let profiles: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, company, avatar_url, email')
          .in('id', allUserIds);
        profilesData?.forEach(p => { profiles[p.id] = p; });
      }

      // Buscar roles
      let roles: Record<string, string> = {};
      if (acceptedByIds.length > 0) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', acceptedByIds);
        rolesData?.forEach(r => { roles[r.user_id] = r.role; });
      }

      return (invitations || []).map(inv => {
        const guestRole = inv.accepted_by ? (roles[inv.accepted_by] as any) || 'convidado' : null;
        const becameMember = guestRole === 'membro' || guestRole === 'facilitador' || guestRole === 'admin';

        return {
          invitation: {
            id: inv.id,
            code: inv.code,
            created_at: inv.created_at,
            accepted_at: inv.accepted_at,
            status: inv.status,
            email: inv.email,
            name: inv.name,
          },
          inviter: profiles[inv.invited_by] || {
            id: inv.invited_by,
            full_name: 'Desconhecido',
            company: null,
            avatar_url: null,
          },
          guest: inv.accepted_by ? profiles[inv.accepted_by] || null : null,
          guestRole,
          becameMember,
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
