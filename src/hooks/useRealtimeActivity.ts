import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ActivityEvent {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  user_id: string;
  created_at: string;
}

export function useRealtimeActivity() {
  const [realtimeEvents, setRealtimeEvents] = useState<ActivityEvent[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const activityChannelNameRef = useRef(`activity-feed-realtime-${Math.random().toString(36).slice(2, 11)}`);

  useEffect(() => {
    const channel = supabase
      .channel(activityChannelNameRef.current)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        async (payload) => {
          console.log('New activity received:', payload);
          
          const newActivity = payload.new as ActivityEvent;
          
          // Add to local state
          setRealtimeEvents((prev) => [newActivity, ...prev].slice(0, 10));
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
          queryClient.invalidateQueries({ queryKey: ['admin-recent-activity'] });
          
          // Show toast notification
          toast({
            title: 'Nova Atividade',
            description: newActivity.title,
            duration: 5000,
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  return { realtimeEvents };
}

export function useRealtimeNotifications(userId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Listen for new testimonials where this user is the recipient
    const testimonialChannel = supabase
      .channel(`testimonials-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'testimonials',
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('New testimonial received:', payload);
          
          // Fetch sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.from_user_id)
            .single();
          
          toast({
            title: '🎉 Novo Depoimento!',
            description: `${sender?.full_name || 'Alguém'} enviou um depoimento para você`,
          });
          
          queryClient.invalidateQueries({ queryKey: ['testimonials'] });
        }
      )
      .subscribe();

    // Listen for new referrals where this user is the recipient
    const referralChannel = supabase
      .channel(`referrals-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `to_user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('New referral received:', payload);
          
          // Fetch sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.from_user_id)
            .single();
          
          toast({
            title: '📞 Nova Indicação!',
            description: `${sender?.full_name || 'Alguém'} indicou um contato para você`,
          });
          
          queryClient.invalidateQueries({ queryKey: ['referrals'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(testimonialChannel);
      supabase.removeChannel(referralChannel);
    };
  }, [userId, queryClient, toast]);
}
