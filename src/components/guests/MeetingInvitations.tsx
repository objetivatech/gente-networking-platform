/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
export function MeetingInvitations({ meetingId }: { meetingId: string }) {
  const { data = [], isError } = useQuery({
    queryKey: ['meeting-invitations', meetingId],
    queryFn: async (): Promise<{ id: string; name: string; company: string | null; status: string }[]> => {
      const { data, error } = await supabase.functions.invoke('guest-meetings', { body: { action: 'invitations', meeting_id: meetingId } });
      if (error || data?.error) throw new Error('Não foi possível consultar os convites');
      return data ?? [];
    },
  });
  if (isError) return <p className="mt-4 text-sm text-muted-foreground">Não foi possível consultar os convites pendentes.</p>;
  if (!data.length) return null;
  return <section className="mt-4 border-t pt-4 space-y-2"><h4 className="font-medium text-sm">Convidados aguardando confirmação ({data.length})</h4>{data.map(person => <div key={person.id} className="flex flex-wrap gap-2 items-center text-sm"><span className="text-wrap-anywhere">{person.name}{person.company ? ` · ${person.company}` : ''}</span><Badge variant="outline">{person.status === 'aguardando_ativacao' ? 'Aguardando ativação' : 'Convite enviado'}</Badge></div>)}</section>;
}