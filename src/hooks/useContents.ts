import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Content {
  id: string;
  title: string;
  description: string | null;
  content_type: 'video' | 'documento' | 'artigo' | 'link';
  url: string | null;
  thumbnail_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    full_name: string;
  };
}

export function useContents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: contents, isLoading } = useQuery({
    queryKey: ['contents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator names
      const creatorIds = [...new Set(data?.filter(c => c.created_by).map(c => c.created_by) || [])];
      
      let creatorsMap: Record<string, string> = {};
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', creatorIds);
        
        creatorsMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map(content => ({
        ...content,
        content_type: content.content_type as Content['content_type'],
        creator: content.created_by ? { full_name: creatorsMap[content.created_by] || 'Desconhecido' } : undefined,
      })) as Content[];
    },
  });

  const createContent = useMutation({
    mutationFn: async (content: {
      title: string;
      description?: string;
      content_type: Content['content_type'];
      url?: string;
      thumbnail_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('contents')
        .insert({
          ...content,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast({
        title: 'Sucesso!',
        description: 'Conteúdo adicionado com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar conteúdo',
        variant: 'destructive',
      });
    },
  });

  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      toast({
        title: 'Sucesso!',
        description: 'Conteúdo removido com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao remover conteúdo',
        variant: 'destructive',
      });
    },
  });

  return {
    contents,
    isLoading,
    createContent: createContent.mutate,
    deleteContent: deleteContent.mutate,
    isCreating: createContent.isPending,
  };
}
