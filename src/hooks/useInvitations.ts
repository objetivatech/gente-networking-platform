import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type InviteTarget = 'comunidade' | 'hub';
export type InvitePurpose = 'premium_group' | 'hub_event' | 'whatsapp_community' | 'hub_legacy';

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
  invite_purpose: InvitePurpose;
  event_id: string | null;
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
      return (data || []).map((i: any) => ({
        ...i,
        invite_target: (i.invite_target as InviteTarget) || 'comunidade',
        invite_purpose: (i.invite_purpose as InvitePurpose) || (i.invite_target === 'hub' ? 'hub_legacy' : 'premium_group'),
      })) as Invitation[];
    },
    enabled: !!user?.id,
  });

  const createInvitation = useMutation({
    mutationFn: async (input: {
      name?: string;
      email?: string;
      teamId?: string;
      purpose?: Exclude<InvitePurpose, 'hub_legacy'>;
      hubContext?: string;
      phone?: string;
      eventId?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const purpose = input.purpose || 'premium_group';
      const target: InviteTarget = purpose === 'premium_group' ? 'comunidade' : 'hub';
      if (purpose === 'premium_group' && !input.teamId) throw new Error('Selecione o grupo do convidado.');
      if (purpose === 'hub_event' && !input.eventId) throw new Error('Selecione o evento Gente HUB.');
      if (purpose !== 'premium_group' && !input.email) throw new Error('Email é obrigatório para este convite.');
      if (purpose !== 'premium_group' && !input.name) throw new Error('Nome é obrigatório para este convite.');

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
          invite_purpose: purpose,
          event_id: purpose === 'hub_event' ? input.eventId : null,
          metadata,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (input.email) {
        try {
          const inviteUrl = purpose === 'whatsapp_community'
            ? `https://lps.gentenetworking.com.br/comunidade?ref=${encodeURIComponent(user.id)}&convite=${encodeURIComponent(code)}`
            : `${window.location.origin}/convite/${code}`;
          const { data: inviterProfile } = await supabase
            .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
          const inviterName = inviterProfile?.full_name || 'Um membro';

          await supabase.functions.invoke('send-email', {
            body: {
              to: input.email,
              subject: purpose === 'hub_event'
                ? 'Convite para um evento Gente HUB 🚀'
                : purpose === 'whatsapp_community'
                ? 'Convite para a Comunidade Gente'
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
