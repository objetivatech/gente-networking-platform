/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { formatCents } from '@/hooks/useBilling';
import { formatDateBR } from '@/lib/date-utils';
import { recoveryWhatsApp } from '@/lib/checkout-recovery';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, MessageCircle, RefreshCw } from 'lucide-react';

type PendingCheckout = { id: string; profile_id: string; created_at: string; full_name: string; phone: string | null; plan_name: string; amount_cents: number };
export function PendingConnectionCheckouts() {
  const { isAdmin } = useAdmin();
  const [page, setPage] = useState(0);
  const [contact, setContact] = useState<PendingCheckout | null>(null);
  const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['pending-connection-checkouts', page], enabled: isAdmin, staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.rpc('get_pending_connection_checkouts', { _offset: page * 25, _limit: 25 });
    if (error) throw error;
    return data as unknown as { total: number; items: PendingCheckout[] };
  } });
  if (!isAdmin) return null;
  const url = contact ? recoveryWhatsApp(contact.phone, message) : null;
  return <section aria-label="Contratações abandonadas ou pendentes" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Contratações abandonadas / pendentes · Gente Conexões</h2><p className="mt-2 text-sm text-muted-foreground">{query.data ? `${query.data.total} sem primeiro pagamento há mais de 24 horas` : 'Consultando contratações'}</p></div><Button variant="outline" size="icon" aria-label="Atualizar contratações" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className="h-4 w-4" /></Button></div>
    {query.isPending ? <p role="status">Carregando…</p> : query.error ? <p role="alert" className="text-destructive">Não foi possível consultar as contratações. Tente atualizar.</p> : !query.data?.items.length ? <p className="text-muted-foreground">Nenhuma contratação pendente nesta página.</p> : <div className="divide-y border-y">{query.data.items.map(item => <article key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0"><h3 className="font-semibold text-wrap-anywhere">{item.full_name}</h3><p className="mt-1 text-sm text-muted-foreground text-wrap-anywhere">{item.plan_name} · {formatCents(item.amount_cents)} · {formatDateBR(item.created_at)}</p></div><Button variant="outline" disabled={!recoveryWhatsApp(item.phone, 'Contato')} onClick={() => { setContact(item); setMessage(`Olá, ${item.full_name.split(' ')[0]}! Você iniciou sua contratação do Gente Conexões (${item.plan_name}). Posso ajudar com alguma dúvida? Para retomar, entre com sua conta em https://comunidade.gentenetworking.com.br/assinar e confira a contratação existente.`); }}><MessageCircle className="mr-2 h-4 w-4" />{recoveryWhatsApp(item.phone, 'Contato') ? 'Retomar contato' : 'Sem WhatsApp válido'}</Button></article>)}</div>}
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" disabled={page === 0} onClick={() => setPage(value => value - 1)}><ArrowLeft className="mr-2 h-4 w-4" />Anterior</Button><span className="text-sm text-muted-foreground">Página {page + 1}</span><Button variant="ghost" disabled={!query.data || (page + 1) * 25 >= query.data.total} onClick={() => setPage(value => value + 1)}>Próxima<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
    <Dialog open={!!contact} onOpenChange={open => { if (!open) setContact(null); }}><DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg"><DialogHeader><DialogTitle>Retomar contato</DialogTitle><DialogDescription>Revise a mensagem antes de abrir o WhatsApp. Nada é enviado automaticamente.</DialogDescription></DialogHeader><Label htmlFor="checkout-recovery-message">Mensagem</Label><Textarea id="checkout-recovery-message" rows={6} value={message} onChange={event => setMessage(event.target.value)} /><DialogFooter>{url && message.trim() ? <Button asChild><a href={url} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Abrir WhatsApp</a></Button> : <Button disabled>Abrir WhatsApp</Button>}</DialogFooter></DialogContent></Dialog>
  </section>;
}