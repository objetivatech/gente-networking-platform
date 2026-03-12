import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAdminDelete(table: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-data', table] });
      toast({ title: 'Sucesso!', description: 'Registro excluído' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao excluir registro', variant: 'destructive' });
    },
  });
}
