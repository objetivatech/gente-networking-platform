import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CouncilPost {
  id: string;
  user_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  status: 'aberto' | 'em_andamento' | 'resolvido';
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
  author_company?: string;
  replies_count?: number;
  has_best_answer?: boolean;
}

export interface CouncilReply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_best_answer: boolean;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  author_company?: string;
}

export function useCouncilPosts(status?: string) {
  return useQuery({
    queryKey: ['council-posts', status],
    queryFn: async () => {
      let query = supabase
        .from('council_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      // Fetch authors and reply counts
      const userIds = [...new Set((posts || []).map(p => p.user_id))];
      const postIds = (posts || []).map(p => p.id);

      const [profilesRes, repliesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, full_name, avatar_url, company').in('id', userIds)
          : { data: [] },
        postIds.length > 0
          ? supabase.from('council_replies').select('post_id, is_best_answer')
          : { data: [] },
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const replyMap = new Map<string, { count: number; hasBest: boolean }>();
      (repliesRes.data || []).forEach(r => {
        const existing = replyMap.get(r.post_id) || { count: 0, hasBest: false };
        existing.count++;
        if (r.is_best_answer) existing.hasBest = true;
        replyMap.set(r.post_id, existing);
      });

      return (posts || []).map(post => {
        const profile = profileMap.get(post.user_id);
        const replyInfo = replyMap.get(post.id);
        return {
          ...post,
          author_name: profile?.full_name || 'Usuário',
          author_avatar: profile?.avatar_url,
          author_company: profile?.company,
          replies_count: replyInfo?.count || 0,
          has_best_answer: replyInfo?.hasBest || false,
        } as CouncilPost;
      });
    },
  });
}

export function useCouncilReplies(postId: string) {
  return useQuery({
    queryKey: ['council-replies', postId],
    queryFn: async () => {
      const { data: replies, error } = await supabase
        .from('council_replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((replies || []).map(r => r.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url, company').in('id', userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (replies || []).map(reply => {
        const profile = profileMap.get(reply.user_id);
        return {
          ...reply,
          author_name: profile?.full_name || 'Usuário',
          author_avatar: profile?.avatar_url,
          author_company: profile?.company,
        } as CouncilReply;
      });
    },
    enabled: !!postId,
  });
}

export function useCouncilMutations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: async (data: { title: string; description?: string; team_id?: string }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data: post, error } = await supabase
        .from('council_posts')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['council-posts'] });
      toast({ title: 'Tópico criado!', description: 'Sua dúvida foi publicada no Conselho.' });
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível criar o tópico.', variant: 'destructive' }),
  });

  const updatePostStatus = useMutation({
    mutationFn: async ({ postId, status }: { postId: string; status: string }) => {
      const { error } = await supabase.from('council_posts').update({ status }).eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['council-posts'] }),
  });

  const createReply = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('council_replies')
        .insert({ post_id: postId, user_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['council-replies', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['council-posts'] });
      toast({ title: 'Resposta enviada!' });
    },
    onError: () => toast({ title: 'Erro', description: 'Não foi possível enviar a resposta.', variant: 'destructive' }),
  });

  const markBestAnswer = useMutation({
    mutationFn: async ({ replyId, postId }: { replyId: string; postId: string }) => {
      // Unmark all existing best answers for this post
      await supabase.from('council_replies').update({ is_best_answer: false }).eq('post_id', postId);
      // Mark the selected one
      const { error } = await supabase.from('council_replies').update({ is_best_answer: true }).eq('id', replyId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['council-replies', vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['council-posts'] });
      toast({ title: 'Melhor resposta marcada!', description: '+5 pontos para o autor.' });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('council_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['council-posts'] });
      toast({ title: 'Tópico removido' });
    },
  });

  return { createPost, updatePostStatus, createReply, markBestAnswer, deletePost };
}
