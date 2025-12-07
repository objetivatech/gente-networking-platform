import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  role?: 'admin' | 'facilitador' | 'membro' | 'convidado';
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
      const { data: teamsData, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;

      const { data: membersData } = await supabase.from('team_members').select('*');
      const userIds = membersData?.map(m => m.user_id) || [];
      
      let profiles: Record<string, any> = {};
      let roles: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, company, avatar_url, rank').in('id', userIds);
        profilesData?.forEach(p => { profiles[p.id] = p; });
        
        const { data: rolesData } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
        rolesData?.forEach(r => { roles[r.user_id] = r.role; });
      }

      return teamsData.map(team => ({
        ...team,
        members: membersData?.filter(m => m.team_id === team.id).map(m => ({ 
          ...m, 
          profile: profiles[m.user_id],
          role: roles[m.user_id] || 'membro'
        })) || []
      })) as Team[];
    },
  });

  return { teams, isLoading };
}
