import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useActivityFeed(limit: number = 10) {
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(a => a.user_id) || [])];
      
      let usersMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        usersMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { full_name: string; avatar_url: string | null }>);
      }

      return (data || []).map(activity => ({
        ...activity,
        metadata: activity.metadata as Record<string, unknown> | null,
        user: usersMap[activity.user_id] || { full_name: 'Usuário', avatar_url: null },
      })) as Activity[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('activity-feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    activities,
    isLoading,
  };
}
