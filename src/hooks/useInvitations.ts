import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Invitation {
  id: string;
  code: string;
  invited_by: string;
  email: string | null;
  name: string | null;
  status: 'pending' | 'accepted' | 'expired';
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useInvitations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['invitations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invited_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!user?.id,
  });

  const createInvitation = useMutation({
    mutationFn: async (input: { name?: string; email?: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const code = generateCode();
      
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          code,
          invited_by: user.id,
          name: input.name,
          email: input.email,
        })
        .select()
        .single();

      if (error) throw error;

      // Se tiver email, envia convite por email
      if (input.email) {
        try {
          const inviteUrl = `${window.location.origin}/convite/${code}`;
          await supabase.functions.invoke('send-email', {
            body: {
              to: input.email,
              subject: '🎉 Você foi convidado para o Gente Networking!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #22c55e;">Gente Networking</h1>
                  <h2>Você foi convidado!</h2>
                  <p>${input.name ? `Olá ${input.name},` : 'Olá,'}</p>
                  <p>Você recebeu um convite para participar do Gente Networking, uma comunidade de networking focada em conexões e negócios.</p>
                  <p>Use o código abaixo ou clique no link para criar sua conta:</p>
                  <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #22c55e; margin: 0;">${code}</p>
                  </div>
                  <a href="${inviteUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Aceitar Convite</a>
                  <p style="margin-top: 20px; color: #666;">Este convite expira em 30 dias.</p>
                  <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
                  <p style="color: #666; font-size: 12px;">Gente Networking - Conectando pessoas, gerando negócios.</p>
                </div>
              `,
            },
          });
        } catch (e) {
          console.error('Failed to send invitation email:', e);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Sucesso!', description: 'Convite criado' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Erro ao criar convite', variant: 'destructive' });
    },
  });

  const deleteInvitation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invitations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Sucesso!', description: 'Convite removido' });
    },
  });

  const stats = {
    total: invitations?.length || 0,
    pending: invitations?.filter(i => i.status === 'pending').length || 0,
    accepted: invitations?.filter(i => i.status === 'accepted').length || 0,
    expired: invitations?.filter(i => i.status === 'expired').length || 0,
  };

  return {
    invitations,
    isLoading,
    stats,
    createInvitation,
    deleteInvitation,
  };
}

export async function validateInvitation(code: string): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('code', code)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) return null;
  return data as Invitation;
}
