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
  renewal_of_id: string | null;
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

  const sendInvitationEmail = async (invitation: Invitation, hubContext?: string) => {
    if (!invitation.email || !user?.id) return;
    const inviteUrl = invitation.invite_purpose === 'whatsapp_community'
      ? `https://lps.gentenetworking.com.br/comunidade?ref=${encodeURIComponent(user.id)}&convite=${encodeURIComponent(invitation.code)}`
      : `https://comunidade.gentenetworking.com.br/convite/${invitation.code}`;
    const { data: inviterProfile } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: invitation.email,
        subject: invitation.invite_purpose === 'hub_event'
          ? 'Convite para um evento Gente HUB 🚀'
          : invitation.invite_purpose === 'whatsapp_community'
            ? 'Convite para a Comunidade Gente'
            : 'Você foi convidado para o Gente Networking! 🎉',
        template: invitation.invite_target === 'hub' ? 'hub_invitation' : 'invitation',
        template_data: {
          inviter_name: inviterProfile?.full_name || 'Um membro',
          guest_name: invitation.name,
          invite_link: inviteUrl,
          hub_context: hubContext || '',
        },
      },
    });
    if (error) throw error;
  };

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

      const { data, error } = await supabase.rpc('create_guest_invitation', {
        _name: input.name || null,
        _email: input.email || null,
        _phone: input.phone || null,
        _team_id: target === 'comunidade' ? input.teamId || null : null,
        _event_id: purpose === 'hub_event' ? input.eventId || null : null,
        _purpose: purpose,
        _hub_context: input.hubContext || null,
      });
      if (error) throw error;
      const result = data as Record<string, unknown> | null;
      if (!result?.success) throw new Error(String(result?.message || 'Não foi possível criar o convite'));
      if (result.action === 'created' && result.invitation_id) {
        const { data: invitation } = await supabase
          .from('invitations').select('*').eq('id', String(result.invitation_id)).single();
        if (invitation) await sendInvitationEmail(invitation as Invitation, input.hubContext);
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      const action = result?.action;
      toast({
        title: action === 'participation_created' ? 'Nova participação registrada' : action === 'reused' ? 'Convite já existente' : 'Convite criado',
        description: action === 'participation_created'
          ? 'A pessoa já era Convidada e recebeu uma nova participação, sem duplicar o acesso.'
          : action === 'reused'
            ? 'O convite pendente foi reutilizado. Você pode reenviá-lo pela lista.'
            : 'O convite foi criado e conectado ao CRM.',
      });
    },
    onError: (e: any) => {
      toast({ title: 'Erro', description: e?.message || 'Erro ao criar convite', variant: 'destructive' });
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitation: Invitation) => sendInvitationEmail(invitation),
    onSuccess: () => toast({ title: 'Convite reenviado', description: 'O mesmo código e a validade atual foram preservados.' }),
    onError: (e: Error) => toast({ title: 'Erro ao reenviar', description: e.message, variant: 'destructive' }),
  });

  const renewInvitation = useMutation({
    mutationFn: async (invitation: Invitation) => {
      const { data, error } = await supabase.rpc('renew_guest_invitation', { _invitation_id: invitation.id });
      if (error) throw error;
      const result = data as Record<string, unknown>;
      if (!result.success || !result.invitation_id) throw new Error('Não foi possível renovar o convite');
      const { data: renewed, error: renewedError } = await supabase
        .from('invitations').select('*').eq('id', String(result.invitation_id)).single();
      if (renewedError) throw renewedError;
      await sendInvitationEmail(renewed as Invitation);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast({ title: 'Convite renovado', description: 'Um novo código foi criado e enviado, mantendo o histórico anterior.' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao renovar', description: e.message, variant: 'destructive' }),
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
    resendInvitation,
    renewInvitation,
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
