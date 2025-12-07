import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RankedMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  company: string | null;
  position: string | null;
  points: number;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante';
  teamId?: string;
  teamName?: string;
}

export function useRanking(teamId?: string) {
  return useQuery({
    queryKey: ['ranking', teamId],
    queryFn: async () => {
      // First get all members with their points
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, company, position, points, rank')
        .order('points', { ascending: false });

      if (profilesError) throw profilesError;

      // Get team memberships
      const { data: teamMembers, error: teamsError } = await supabase
        .from('team_members')
        .select('user_id, team_id, teams(name)');

      if (teamsError) throw teamsError;

      // Create a map of user to team
      const userTeamMap: Record<string, { teamId: string; teamName: string }> = {};
      (teamMembers || []).forEach((tm: any) => {
        userTeamMap[tm.user_id] = {
          teamId: tm.team_id,
          teamName: tm.teams?.name || '',
        };
      });

      // Map profiles with team info
      let rankedMembers: RankedMember[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        company: p.company,
        position: p.position,
        points: p.points || 0,
        rank: (p.rank || 'iniciante') as RankedMember['rank'],
        teamId: userTeamMap[p.id]?.teamId,
        teamName: userTeamMap[p.id]?.teamName,
      }));

      // Filter by team if specified
      if (teamId) {
        rankedMembers = rankedMembers.filter(m => m.teamId === teamId);
      }

      return rankedMembers;
    },
  });
}
