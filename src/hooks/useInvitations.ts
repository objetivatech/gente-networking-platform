import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type InviteTarget = 'comunidade' | 'hub';

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
  team_id: string | null;
  invite_target: InviteTarget;
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
      return (data || []).map((i: any) => ({ ...i, invite_target: (i.invite_target as InviteTarget) || 'comunidade' })) as Invitation[];
    },
    enabled: !!user?.id,
  });

  const createInvitation = useMutation({
    mutationFn: async (input: {
      name?: string;
      email?: string;
      teamId?: string;
      target?: InviteTarget;
      hubContext?: string;
      phone?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const target: InviteTarget = input.target || 'comunidade';
      if (target === 'comunidade' && !input.teamId) throw new Error('Selecione o grupo do convidado.');
      if (target === 'hub' && !input.email) throw new Error('Email é obrigatório para convite Gente HUB.');
      if (target === 'hub' && !input.name) throw new Error('Nome é obrigatório para convite Gente HUB.');

      const code = generateCode();
      const metadata: Record<string, unknown> = {};
      if (target === 'hub') {
        if (input.hubContext) metadata.hub_context = input.hubContext;
        if (input.phone) metadata.phone = input.phone;
      }

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          code,
          invited_by: user.id,
          name: input.name || null,
          email: input.email || null,
          team_id: target === 'comunidade' ? input.teamId! : null,
          invite_target: target,
          metadata,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (input.email) {
        try {
          const inviteUrl = `${window.location.origin}/convite/${code}`;
          const { data: inviterProfile } = await supabase
            .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
          const inviterName = inviterProfile?.full_name || 'Um membro';

          await supabase.functions.invoke('send-email', {
            body: {
              to: input.email,
              subject: target === 'hub'
                ? 'Convite para o Gente HUB 🚀'
                : 'Você foi convidado para o Gente Networking! 🎉',
              template: target === 'hub' ? 'hub_invitation' : 'invitation',
              template_data: {
                inviter_name: inviterName,
                guest_name: input.name,
                invite_link: inviteUrl,
                hub_context: input.hubContext || '',
              },
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
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Erro ao criar convite', variant: 'destructive' });
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
    pending: invitations?.filter((i) => i.status === 'pending').length || 0,
    accepted: invitations?.filter((i) => i.status === 'accepted').length || 0,
    expired: invitations?.filter((i) => i.status === 'expired').length || 0,
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
  try {
    const { data, error } = await supabase.rpc('get_invitation_by_code', { _code: code });
    if (error || !data || !Array.isArray(data) || data.length === 0) return null;
    const inv = data[0] as unknown as Invitation;
    if (inv.status !== 'pending') return null;
    if (inv.expires_at && new Date(inv.expires_at) <= new Date()) return null;
    return inv;
  } catch (error) {
    console.error('Error validating invitation:', error);
    return null;
  }
}
