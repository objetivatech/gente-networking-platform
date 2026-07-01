import SEO from '@/components/SEO';
/**
 * @page Oportunidades
 * @route /oportunidades
 * @description Mural de Oportunidades — membros publicam oportunidades de negócio,
 * parcerias e demandas para a comunidade (Item 7, Fase 3). Exclusivo para membros.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { canUseOpportunityBoard } from '@/lib/access-control';
import { useOpportunities, OpportunityType } from '@/hooks/useOpportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Megaphone, Plus, Loader2, CheckCircle2, Trash2, Building2 } from 'lucide-react';

const TYPE_META: Record<OpportunityType, { label: string; className: string }> = {
  servico: { label: 'Serviço', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  parceria: { label: 'Parceria', className: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  demanda: { label: 'Demanda', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  outro: { label: 'Outro', className: 'bg-slate-500/15 text-slate-600 border-slate-500/30' },
};

const initials = (name: string) => name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default function Oportunidades() {
  const { user } = useAuth();
  const { role, isLoading: roleLoading } = useAdmin();
  const { opportunities, isLoading, createOpportunity, toggleStatus, deleteOpportunity } = useOpportunities();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<OpportunityType>('servico');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  if (!roleLoading && !canUseOpportunityBoard(role)) return <Navigate to="/" replace />;

  const submit = () => {
    if (!title.trim()) return;
    createOpportunity.mutate(
      { type, title: title.trim(), description: description.trim() || undefined },
      { onSuccess: () => { setOpen(false); setTitle(''); setDescription(''); setType('servico'); } },
    );
  };

  const list = (opportunities || []).filter((o) => showClosed || o.status === 'aberta');

  return (
    <div className="space-y-6">
      <SEO
        title="Mural de Oportunidades — Gente Networking"
        description="Publique e descubra oportunidades de negócio, parcerias e demandas entre os membros da comunidade Gente Networking."
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mural de Oportunidades</h1>
            <p className="text-muted-foreground">Oportunidades, parcerias e demandas entre membros.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowClosed((v) => !v)}>
            {showClosed ? 'Ocultar encerradas' : 'Mostrar encerradas'}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Publicar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova oportunidade</DialogTitle>
                <DialogDescription>Compartilhe uma oportunidade com a comunidade de membros.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2" data-rd-no-capture="true">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as OpportunityType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="parceria">Parceria</SelectItem>
                      <SelectItem value="demanda">Demanda</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="op-title">Título</Label>
                  <Input id="op-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex.: Procuro parceiro para projeto de marketing" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="op-desc">Descrição (opcional)</Label>
                  <Textarea id="op-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={800} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={createOpportunity.isPending || !title.trim()}>
                  {createOpportunity.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Publicar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : list.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Nenhuma oportunidade publicada ainda. Seja o primeiro a compartilhar!
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((o) => {
            const meta = TYPE_META[o.type] || TYPE_META.outro;
            const isOwner = o.user_id === user?.id;
            const canModerate = isOwner || role === 'admin';
            return (
              <Card key={o.id} className={`flex flex-col ${o.status === 'fechada' ? 'opacity-70' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    {o.status === 'fechada' && <Badge variant="secondary" className="text-xs">Encerrada</Badge>}
                  </div>
                  <CardTitle className="text-base mt-2">{o.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 flex-1">
                  {o.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{o.description}</p>}
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={o.author?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{initials(o.author?.full_name || '?')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{o.author?.full_name || 'Membro'}</p>
                      {o.author?.company && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {o.author.company}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  {canModerate && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline" size="sm" className="flex-1"
                        onClick={() => toggleStatus.mutate({ id: o.id, status: o.status === 'aberta' ? 'fechada' : 'aberta' })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        {o.status === 'aberta' ? 'Encerrar' : 'Reabrir'}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteOpportunity.mutate(o.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
