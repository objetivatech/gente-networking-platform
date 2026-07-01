import SEO from '@/components/SEO';
/**
 * @page PedidosIndicacao
 * @route /pedidos-indicacao
 * @description Pedidos de Indicação (broadcast) — membros pedem indicações à
 * comunidade e outros membros respondem (Item 3, Fase 3). Exclusivo para membros.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { canUseReferralRequests } from '@/lib/access-control';
import { useReferralRequests, ReferralRequestStatus } from '@/hooks/useReferralRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Radio, Plus, Loader2, Send, Trash2, MessageSquare, Target } from 'lucide-react';

const STATUS_META: Record<ReferralRequestStatus, { label: string; className: string }> = {
  aberta: { label: 'Aberta', className: 'bg-green-500/15 text-green-600 border-green-500/30' },
  atendida: { label: 'Atendida', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  fechada: { label: 'Encerrada', className: 'bg-slate-500/15 text-slate-600 border-slate-500/30' },
};

const initials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default function PedidosIndicacao() {
  const { user } = useAuth();
  const { role, isLoading: roleLoading } = useAdmin();
  const { requests, isLoading, createRequest, respond, updateStatus, deleteRequest } = useReferralRequests();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [segment, setSegment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  if (!roleLoading && !canUseReferralRequests(role)) return <Navigate to="/" replace />;

  const submit = () => {
    if (!title.trim()) return;
    createRequest.mutate(
      { title: title.trim(), description: description.trim() || undefined, target_segment: segment.trim() || undefined },
      { onSuccess: () => { setOpen(false); setTitle(''); setDescription(''); setSegment(''); } },
    );
  };

  const sendReply = (requestId: string) => {
    if (!replyText.trim()) return;
    respond.mutate(
      { requestId, message: replyText.trim() },
      { onSuccess: () => { setReplyTo(null); setReplyText(''); } },
    );
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Pedidos de Indicação — Gente Networking"
        description="Peça indicações à comunidade de membros do Gente Networking e ajude outros membros com suas conexões."
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Radio className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pedidos de Indicação</h1>
            <p className="text-muted-foreground">Peça indicações à comunidade e ajude outros membros.</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo pedido</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo pedido de indicação</DialogTitle>
              <DialogDescription>Descreva que tipo de contato ou cliente você procura.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2" data-rd-no-capture="true">
              <div className="space-y-2">
                <Label htmlFor="rr-title">O que você precisa?</Label>
                <Input id="rr-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex.: Procuro contato em empresas de logística" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rr-seg">Segmento-alvo (opcional)</Label>
                <Input id="rr-seg" value={segment} onChange={(e) => setSegment(e.target.value)} maxLength={80} placeholder="Ex.: Logística, Varejo, Saúde" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rr-desc">Detalhes (opcional)</Label>
                <Textarea id="rr-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={800} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={createRequest.isPending || !title.trim()}>
                {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Publicar pedido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (requests || []).length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Nenhum pedido de indicação no momento. Crie o primeiro!
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(requests || []).map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.aberta;
            const isOwner = r.user_id === user?.id;
            const canModerate = isOwner || role === 'admin';
            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.author?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials(r.author?.full_name || '?')}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          {r.author?.full_name || 'Membro'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                        <CardTitle className="text-base">{r.title}</CardTitle>
                      </div>
                    </div>
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.target_segment && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Target className="h-3 w-3" /> {r.target_segment}
                    </Badge>
                  )}
                  {r.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description}</p>}

                  {(r.responses || []).length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {(r.responses || []).map((resp) => (
                        <div key={resp.id} className="flex items-start gap-2 text-sm">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={resp.author?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">{initials(resp.author?.full_name || '?')}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-medium">{resp.author?.full_name || 'Membro'}: </span>
                            <span className="text-muted-foreground whitespace-pre-wrap">{resp.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {r.status !== 'fechada' && (
                      replyTo === r.id ? (
                        <div className="w-full space-y-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={2}
                            maxLength={500}
                            placeholder="Posso indicar alguém... (descreva o contato)"
                            data-rd-no-capture="true"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => sendReply(r.id)} disabled={respond.isPending || !replyText.trim()}>
                              {respond.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                              Enviar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setReplyTo(null); setReplyText(''); }}>Cancelar</Button>
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/indicacoes"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Registrar indicação</Link>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setReplyTo(r.id); setReplyText(''); }}>
                          <MessageSquare className="h-3.5 w-3.5 mr-1" /> Posso ajudar
                        </Button>
                      )
                    )}

                    {canModerate && r.status !== 'fechada' && (
                      <>
                        {r.status === 'aberta' && (
                          <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: r.id, status: 'atendida' })}>
                            Marcar como atendida
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: r.id, status: 'fechada' })}>
                          Encerrar
                        </Button>
                      </>
                    )}
                    {canModerate && (
                      <Button size="sm" variant="ghost" onClick={() => deleteRequest.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
