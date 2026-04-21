import { useQuery } from '@tanstack/react-query';
import { supabaseReadOnly } from '@/integrations/supabase/client';

export type MemberType = 'facilitator' | 'member' | 'guest';

export interface TeamMember {
  id: string;
  user_id: string;
  is_facilitator: boolean;
  joined_at: string;
  profile: { 
    full_name: string; 
    company: string | null; 
    avatar_url: string | null; 
    rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';
  };
  role: 'admin' | 'facilitador' | 'membro' | 'convidado' | null;
  /**
   * Tipo derivado para classificação visual à prova de erro.
   * - facilitator: is_facilitator = true (independente da role)
   * - guest: role = 'convidado'
   * - member: demais casos (membro/admin sem facilitação)
   */
  member_type: MemberType;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  members?: TeamMember[];
}

export function useTeams() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data: teamsData, error } = await supabaseReadOnly.from('teams').select('*').order('name');
      if (error) throw error;

      const { data: membersData } = await supabaseReadOnly.from('team_members').select('*');
      const userIds = membersData?.map(m => m.user_id) || [];
      
      let profiles: Record<string, any> = {};
      let roles: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabaseReadOnly.from('profiles').select('id, full_name, company, avatar_url, rank').in('id', userIds);
        profilesData?.forEach(p => { profiles[p.id] = p; });
        
        const { data: rolesData } = await supabaseReadOnly.from('user_roles').select('user_id, role').in('user_id', userIds);
        rolesData?.forEach(r => { roles[r.user_id] = r.role; });
      }

      const computeMemberType = (isFacilitator: boolean, role: string | null): MemberType => {
        if (isFacilitator) return 'facilitator';
        if (role === 'convidado') return 'guest';
        return 'member';
      };

      return teamsData.map(team => ({
        ...team,
        members: membersData?.filter(m => m.team_id === team.id).map(m => {
          const role = (roles[m.user_id] as TeamMember['role']) || null;
          return { 
            ...m, 
            profile: profiles[m.user_id],
            role,
            member_type: computeMemberType(!!m.is_facilitator, role),
          };
        }) || []
      })) as Team[];
    },
  });

  return { teams, isLoading };
}
