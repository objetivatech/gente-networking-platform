/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdmin } from '@/hooks/useAdmin';
import { useConnectionTaxonomies } from '@/hooks/useConnectionDoors';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Plus, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ConnectionTaxonomy } from '@/lib/connection-doors';

export default function AdminConnectionTaxonomies() {
  const { isAdmin, isLoading: roleLoading } = useAdmin();
  const { data: options = [], isLoading, error } = useConnectionTaxonomies();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<'decisor' | 'setor'>('decisor');
  const [draft, setDraft] = useState<{ id?: string; type: 'decisor' | 'setor'; label: string; sort_order: number; is_active: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const mutation = useMutation({
    mutationFn: async (value: NonNullable<typeof draft>) => {
      const { id, ...fields } = value;
      const payload = { ...fields, label: fields.label.trim() };
      const result = id ? await supabase.from('matchmaking_taxonomies').update(payload).eq('id', id).select().single()
        : await supabase.from('matchmaking_taxonomies').insert(payload).select().single();
      if (result.error) throw result.error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['connection-taxonomies'] }); queryClient.invalidateQueries({ queryKey: ['matchmaking'] }); setDraft(null); toast({ title: 'Opção atualizada' }); },
    onError: (e: Error) => toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }),
  });
  if (!roleLoading && !isAdmin) return <Navigate to="/" replace />;
  const edit = (o: ConnectionTaxonomy) => setDraft({ id: o.id, type: o.type, label: o.label, sort_order: o.sort_order, is_active: o.is_active });
  return <div className="space-y-6 max-w-5xl mx-auto">
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center"><h1 className="text-2xl font-bold">Portas de conexão</h1><Button onClick={() => setDraft({ type, label: '', sort_order: Math.max(0, ...options.filter((o) => o.type === type).map((o) => o.sort_order)) + 1, is_active: true })}><Plus className="h-4 w-4 mr-2" />Nova opção</Button></div>
    <Input aria-label="Buscar opções" placeholder="Buscar opções..." value={search} onChange={(e) => setSearch(e.target.value)} />
    {error && <p className="text-destructive">Não foi possível carregar as opções.</p>}
    {isLoading || roleLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Tabs value={type} onValueChange={(v) => setType(v === 'setor' ? 'setor' : 'decisor')}>
      <TabsList><TabsTrigger value="decisor">Decisores ({options.filter((o) => o.type === 'decisor').length})</TabsTrigger><TabsTrigger value="setor">Setores ({options.filter((o) => o.type === 'setor').length})</TabsTrigger></TabsList>
      {(['decisor', 'setor'] as const).map((category) => <TabsContent key={category} value={category}>
        <div className="divide-y border-y">{options.filter((o) => o.type === category && o.label.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map((o) => <div key={o.id} className="flex items-center gap-3 py-3">
          <span className="text-sm text-muted-foreground w-8 shrink-0">{o.sort_order}</span><span className="flex-1 min-w-0 text-wrap-anywhere">{o.label}</span>
          <Switch aria-label={`Ativar ${o.label}`} checked={o.is_active} disabled={mutation.isPending} onCheckedChange={(is_active) => mutation.mutate({ ...o, is_active })} />
          <Button variant="ghost" size="icon" aria-label={`Editar ${o.label}`} title="Editar opção" onClick={() => edit(o)}><Pencil className="h-4 w-4" /></Button>
        </div>)}</div>
      </TabsContent>)}
    </Tabs>}
    <Dialog open={!!draft} onOpenChange={(open) => { if (!open && !mutation.isPending) setDraft(null); }}><DialogContent><DialogHeader><DialogTitle>{draft?.id ? 'Editar opção' : 'Nova opção'}</DialogTitle></DialogHeader>
      {draft && <form data-rd-no-capture="true" className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(draft); }}>
        <div className="space-y-2"><Label htmlFor="taxonomy-label">Nome</Label><Input id="taxonomy-label" required maxLength={160} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="taxonomy-order">Ordem</Label><Input id="taxonomy-order" type="number" min={0} step={1} required value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></div>
        <DialogFooter><Button type="submit" disabled={mutation.isPending || !draft.label.trim()}><Save className="h-4 w-4 mr-2" />{mutation.isPending ? 'Salvando…' : 'Salvar'}</Button></DialogFooter>
      </form>}
    </DialogContent></Dialog>
  </div>;
}