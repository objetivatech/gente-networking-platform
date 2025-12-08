/**
 * @hook useMembers
 * @description Hook para buscar membros da comunidade (excluindo convidados)
 * 
 * @features
 * - Filtra convidados automaticamente
 * - Inclui informações de equipe
 * - Agrupa membros por equipe
 * 
 * @since 2024-12-08
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  business_segment: string | null;
  points: number | null;
  rank: 'iniciante' | 'bronze' | 'prata' | 'ouro' | 'diamante' | null;
  team_id: string | null;
  team_name: string | null;
  team_color: string | null;
}

export interface MembersByTeam {
  team_id: string | null;
  team_name: string;
  team_color: string;
  members: Member[];
}

export function useMembers() {
  const query = useQuery({
    queryKey: ['members-directory'],
    queryFn: async () => {
      // 1. Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company, position, bio, avatar_url, linkedin_url, instagram_url, website_url, business_segment, points, rank')
        .order('full_name');

      if (profilesError) throw profilesError;

      // 2. Get user roles to filter out guests
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of user_id -> role
      const rolesMap: Record<string, string> = {};
      roles?.forEach(r => {
        rolesMap[r.user_id] = r.role;
      });

      // 3. Get team memberships
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select('user_id, team_id');

      if (teamMembersError) throw teamMembersError;

      // Create a map of user_id -> team_id
      const teamMembershipMap: Record<string, string> = {};
      teamMembers?.forEach(tm => {
        teamMembershipMap[tm.user_id] = tm.team_id;
      });

      // 4. Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color')
        .order('name');

      if (teamsError) throw teamsError;

      // Create a map of team_id -> team info
      const teamsMap: Record<string, { name: string; color: string }> = {};
      teams?.forEach(t => {
        teamsMap[t.id] = { name: t.name, color: t.color || '#22c55e' };
      });

      // 5. Filter out guests and add team info
      const membersWithTeam: Member[] = (profiles || [])
        .filter(profile => {
          const role = rolesMap[profile.id];
          // Exclude guests - include members without roles (default is membro) or with non-guest roles
          return role !== 'convidado';
        })
        .map(profile => {
          const teamId = teamMembershipMap[profile.id] || null;
          const teamInfo = teamId ? teamsMap[teamId] : null;
          
          return {
            ...profile,
            team_id: teamId,
            team_name: teamInfo?.name || null,
            team_color: teamInfo?.color || null,
          };
        });

      return membersWithTeam;
    },
  });

  // Group members by team
  const membersByTeam: MembersByTeam[] = [];
  
  if (query.data) {
    const teamsFound: Record<string, MembersByTeam> = {};
    const membersWithoutTeam: Member[] = [];

    query.data.forEach(member => {
      if (member.team_id && member.team_name) {
        if (!teamsFound[member.team_id]) {
          teamsFound[member.team_id] = {
            team_id: member.team_id,
            team_name: member.team_name,
            team_color: member.team_color || '#22c55e',
            members: [],
          };
        }
        teamsFound[member.team_id].members.push(member);
      } else {
        membersWithoutTeam.push(member);
      }
    });

    // Add teams in alphabetical order
    Object.values(teamsFound)
      .sort((a, b) => a.team_name.localeCompare(b.team_name))
      .forEach(team => membersByTeam.push(team));

    // Add members without team at the end
    if (membersWithoutTeam.length > 0) {
      membersByTeam.push({
        team_id: null,
        team_name: 'Sem Equipe',
        team_color: '#6b7280',
        members: membersWithoutTeam,
      });
    }
  }

  return {
    members: query.data,
    membersByTeam,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
