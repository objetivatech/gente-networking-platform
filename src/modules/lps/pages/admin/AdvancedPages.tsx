/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/modules/lps/components/admin/AdminLayout';
import { useLandingPages, useCreateLandingPage, useDeleteLandingPage } from '@/modules/lps/hooks/useLandingPage';
import { useAdvancedPageContent, useUpsertAdvancedPageContent } from '@/modules/lps/hooks/useAdvancedPageContent';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, ExternalLink, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { COMMUNITY_DEFAULTS, type AdvancedContent } from '@/modules/lps/components/landing/CommunityLandingPage';
import type { Json } from '@/integrations/supabase/types';

const SECTIONS: { key: keyof AdvancedContent; label: string }[] = [
  { key: 'hero', label: 'Hero' },
  { key: 'authority', label: 'Autoridade' },
  { key: 'problem', label: 'Problema' },
  { key: 'benefits', label: 'Solução' },
  { key: 'ecosystem', label: 'Ecossistema' },
  { key: 'audience', label: 'Para Quem' },
  { key: 'testimonials', label: 'Depoimentos' },
  { key: 'reasons', label: 'Razões' },
  { key: 'form', label: 'CTA + Form' },
  { key: 'faq', label: 'FAQ' },
];

// Fields per section: which are simple strings, which are JSON arrays of objects.
const SIMPLE_FIELDS: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
  hero: [
    { key: 'title', label: 'Título (use **palavra** para destaque laranja)', multiline: true },
    { key: 'subtitle', label: 'Subtítulo (use **palavra** para destaque laranja)', multiline: true },
    { key: 'buttonText', label: 'Texto do botão' },
    { key: 'imageUrl', label: 'URL da imagem (deixe vazio para usar a padrão)' },
  ],
  authority: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
  ],
  problem: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
    { key: 'callout', label: 'Frase de destaque' },
    { key: 'calloutSubtitle', label: 'Apoio do destaque' },
    { key: 'imageUrl', label: 'URL da imagem' },
  ],
  benefits: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
    { key: 'highlight', label: 'Destaque' },
    { key: 'footer', label: 'Rodapé do bloco' },
    { key: 'imageUrl', label: 'URL da imagem' },
  ],
  ecosystem: [
    { key: 'title', label: 'Título (use **palavra** para destaque)', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
    { key: 'ctaTitle', label: 'Barra CTA — título' },
    { key: 'ctaSubtitle', label: 'Barra CTA — subtítulo (use **palavra** para destaque)' },
    { key: 'ctaButton', label: 'Barra CTA — botão' },
  ],
  audience: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
  ],
  testimonials: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
  ],
  reasons: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
  ],
  form: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
    { key: 'buttonText', label: 'Texto do botão' },
  ],
  faq: [
    { key: 'title', label: 'Título', multiline: true },
    { key: 'subtitle', label: 'Subtítulo', multiline: true },
  ],
};

const ARRAY_FIELDS: Record<string, { key: string; label: string; hint: string }[]> = {
  hero: [{ key: 'highlights', label: 'Destaques (lista de strings)', hint: '["Texto 1", "Texto 2"]' }],
  authority: [{ key: 'stats', label: 'Estatísticas (icon: calendar | map | users | network)', hint: '[{"value":"+7 anos","label":"de atuação","icon":"calendar"}]' }],
  problem: [{ key: 'points', label: 'Pontos de dor', hint: '["Sem visibilidade...", "..."]' }],
  benefits: [{ key: 'cards', label: 'Cards de benefícios', hint: '[{"title":"...","description":"...","icon":"users"}]' }],
  ecosystem: [
    { key: 'steps', label: 'Etapas do ecossistema (icon: users | star | crown ; badgeColor: hex)', hint: '[{"title":"GeNtE Comunidade","subtitle":"Conecte-se","description":"...","badge":"Participação gratuita","badgeColor":"#1e3a8a","icon":"users"}]' },
    { key: 'benefits', label: 'Mini-benefícios (rodapé do bloco)', hint: '[{"text":"...","icon":"network"}]' },
  ],
  audience: [{ key: 'audiences', label: 'Profissões / públicos', hint: '[{"title":"...","description":"..."}]' }],
  testimonials: [
    { key: 'testimonials', label: 'Depoimentos', hint: '[{"name":"...","role":"...","city":"...","text":"..."}]' },
    { key: 'stats', label: 'Estatísticas', hint: '[{"value":"...","label":"..."}]' },
  ],
  reasons: [{ key: 'reasons', label: 'Razões', hint: '[{"title":"...","description":"...","icon":"users"}]' }],
  form: [{ key: 'benefits', label: 'Benefícios ao lado do form', hint: '[{"title":"...","description":"...","icon":"badge"}]' }],
  faq: [
    { key: 'faqs', label: 'Perguntas e respostas', hint: '[{"question":"...","answer":"..."}]' },
    { key: 'contacts', label: 'Contatos', hint: '[{"label":"E-mail","value":"..."}]' },
  ],
};

function AdvancedEditor({ pageId, pageSlug }: { pageId: string; pageSlug: string }) {
  const { data, isLoading } = useAdvancedPageContent(pageId);
  const upsert = useUpsertAdvancedPageContent();
  const [content, setContent] = useState<AdvancedContent>({});
  const [arrayDrafts, setArrayDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.content && Object.keys(data.content as object).length > 0) {
      // Merge saved content over defaults so empty fields show the briefing text
      const saved = data.content as AdvancedContent;
      const merged: AdvancedContent = {};
      (Object.keys(COMMUNITY_DEFAULTS) as (keyof AdvancedContent)[]).forEach((k) => {
        (merged as any)[k] = { ...((COMMUNITY_DEFAULTS as any)[k] || {}), ...((saved as any)[k] || {}) };
      });
      setContent(merged);
    } else if (!isLoading) {
      setContent(JSON.parse(JSON.stringify(COMMUNITY_DEFAULTS)));
    }
  }, [data, isLoading]);

  // Initialize array drafts whenever content changes
  useEffect(() => {
    const drafts: Record<string, string> = {};
    SECTIONS.forEach(({ key }) => {
      (ARRAY_FIELDS[key as string] || []).forEach((f) => {
        const sec = (content[key] || {}) as Record<string, unknown>;
        const v = sec[f.key];
        drafts[`${String(key)}.${f.key}`] = v ? JSON.stringify(v, null, 2) : '';
      });
    });
    setArrayDrafts(drafts);
  }, [content]);

  const updateSimple = (section: string, field: string, value: string) => {
    setContent((prev) => ({
      ...prev,
      [section]: { ...((prev as any)[section] || {}), [field]: value },
    }));
  };

  const updateArrayDraft = (path: string, value: string) => {
    setArrayDrafts((p) => ({ ...p, [path]: value }));
  };

  const handleSave = async () => {
    // Parse all array drafts
    const next: AdvancedContent = JSON.parse(JSON.stringify(content));
    for (const [path, raw] of Object.entries(arrayDrafts)) {
      const [section, field] = path.split('.');
      if (!raw.trim()) {
        delete (next as any)[section]?.[field];
        continue;
      }
      try {
        const parsed = JSON.parse(raw);
        (next as any)[section] = { ...((next as any)[section] || {}), [field]: parsed };
      } catch {
        toast.error(`JSON inválido em ${section}.${field}`);
        return;
      }
    }
    try {
      await upsert.mutateAsync({ landing_page_id: pageId, content: next as Json });
      toast.success('Conteúdo salvo!');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || ''));
    }
  };

  if (isLoading) return <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Edite as seções abaixo. Campos em branco usam o conteúdo padrão do briefing.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={`/${pageSlug}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Ver página</a>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="flex flex-wrap h-auto">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.key as string} value={s.key as string}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map(({ key, label }) => {
          const sec = (content[key] || {}) as Record<string, string>;
          const simple = SIMPLE_FIELDS[key as string] || [];
          const arrays = ARRAY_FIELDS[key as string] || [];

          return (
            <TabsContent key={key as string} value={key as string} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">{label}</h3>

              {simple.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label>{f.label}</Label>
                  {f.multiline ? (
                    <Textarea
                      value={sec[f.key] || ''}
                      onChange={(e) => updateSimple(key as string, f.key, e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <Input
                      value={sec[f.key] || ''}
                      onChange={(e) => updateSimple(key as string, f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}

              {arrays.map((f) => {
                const path = `${String(key)}.${f.key}`;
                return (
                  <div key={f.key} className="space-y-1">
                    <Label>{f.label}</Label>
                    <Textarea
                      value={arrayDrafts[path] || ''}
                      onChange={(e) => updateArrayDraft(path, e.target.value)}
                      rows={8}
                      placeholder={f.hint}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Formato JSON. Exemplo: <code>{f.hint}</code></p>
                  </div>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default function AdminAdvancedPages() {
  const { data: pages, isLoading, refetch } = useLandingPages();
  const createPage = useCreateLandingPage();
  const deletePage = useDeleteLandingPage();

  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ name: '', slug: '' });

  const advancedPages = useMemo(
    () => (pages || []).filter((p: any) => p.template === 'community'),
    [pages]
  );

  const selectedPage = advancedPages.find((p) => p.id === selected);

  const handleCreate = async () => {
    if (!draft.name || !draft.slug) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(draft.slug)) {
      toast.error('Slug: apenas letras minúsculas, números e hífens');
      return;
    }
    try {
      const created = await createPage.mutateAsync({
        name: draft.name,
        slug: draft.slug,
        is_active: false,
        primary_color: '#F87512',
        secondary_color: '#00548F',
      });
      // Mark template + create content row
      if (created?.id) {
        await supabase.from('landing_pages').update({ template: 'community' }).eq('id', created.id);
        await supabase.from('advanced_page_content').insert({ landing_page_id: created.id, content: COMMUNITY_DEFAULTS as any });
      }
      toast.success('LP avançada criada!');
      setShowCreate(false);
      setDraft({ name: '', slug: '' });
      refetch();
    } catch (e: any) {
      toast.error(e?.message?.includes('duplicate') ? 'Slug já em uso' : 'Erro ao criar página');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">LPs Avançadas</h1>
            <p className="text-muted-foreground mt-1">Páginas que usam o template editorial de alta fidelidade (GeNtE Comunidade e novas).</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova LP Avançada
          </Button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-foreground" /></div>
        ) : advancedPages.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma LP avançada ainda. Crie a primeira!</CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-2">
              {advancedPages.map((p) => (
                <Card
                  key={p.id}
                  className={`cursor-pointer transition ${selected === p.id ? 'border-border' : ''}`}
                  onClick={() => setSelected(p.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">/{p.slug}</p>
                      </div>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Ativa' : 'Inativa'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="p-6">
                {selectedPage ? (
                  <AdvancedEditor pageId={selectedPage.id} pageSlug={selectedPage.slug} />
                ) : (
                  <p className="text-center text-muted-foreground py-10">Selecione uma LP à esquerda para editar.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova LP Avançada</DialogTitle>
            <DialogDescription>Cria uma página que usa o template editorial de alta fidelidade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: GeNtE Comunidade" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} placeholder="ex: comunidade" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createPage.isPending}>
              {createPage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
