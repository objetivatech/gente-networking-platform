/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState, useEffect } from 'react';
import { useLandingPage, useUpdateLandingPage, LandingPage } from '@/modules/lps/hooks/useLandingPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { previewForPage } from '../../lib/rules';

interface PageSettingsProps {
  slug: string;
}

export function PageSettings({ slug }: PageSettingsProps) {
  const { data: page, isLoading } = useLandingPage(slug);
  const updatePage = useUpdateLandingPage();
  const [formData, setFormData] = useState<Partial<LandingPage>>({});

  useEffect(() => {
    if (page) {
      setFormData(page);
    }
  }, [page]);

  const handleSave = async () => {
    if (!page) return;
    try {
      await updatePage.mutateAsync({ id: page.id, ...formData });
      toast.success('Configurações salvas!');
    } catch (error) {
      console.error('Erro completo ao salvar:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      if (errorMessage.includes('row-level security') || errorMessage.includes('permission') || errorMessage.includes('policy')) {
        toast.error('Erro de permissão. Faça logout e login novamente.');
      } else {
        toast.error(`Erro ao salvar: ${errorMessage}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Página não encontrada
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{page.name}</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={previewForPage(slug)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Visualizar
            </a>
          </Button>
          <Button onClick={handleSave} disabled={updatePage.isPending}>
            {updatePage.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Nome da Página</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome interno para identificação. Será usado como TITLE se o Meta Título estiver vazio.
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Slug (URL)</label>
              <Input
                value={formData.slug || ''}
                disabled
                className="mt-1 bg-card border-border text-muted-foreground"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Página Ativa</label>
              <Switch
                checked={formData.is_active ?? true}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lp-capture-source" className="text-sm text-muted-foreground">Origem no CRM</label>
              <select id="lp-capture-source" className="w-full rounded-md border bg-background p-2" value={formData.capture_source || 'lp_networking'} onChange={e => setFormData(prev => ({ ...prev, capture_source: e.target.value as LandingPage['capture_source'] }))}>
                <option value="lp_gentehub">Gente HUB</option><option value="lp_participe">Participe / Grupos / Comunidade</option><option value="lp_networking">Gente Networking</option><option value="site_elementor">Site</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* SEO Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">SEO Avançado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">
                Meta Título {formData.meta_title && <span className="text-secondary">(controla o TITLE)</span>}
              </label>
              <Input
                value={formData.meta_title || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Deixe vazio para usar o Nome da Página"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Aparece na aba do navegador e em resultados de busca. Máx. 60 caracteres.
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Meta Descrição</label>
              <Textarea
                value={formData.meta_description || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, meta_description: e.target.value }))
                }
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Descrição para SEO (máx. 160 caracteres)"
                maxLength={160}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">URL Canônica</label>
              <Input
                value={formData.canonical_url || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, canonical_url: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="https://seusite.com/pagina"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Imagem OG (compartilhamento)</label>
              <Input
                value={formData.og_image_url || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, og_image_url: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="https://seusite.com/imagem-og.jpg"
              />
              <p className="text-xs text-muted-foreground mt-1">Recomendado: 1200x630 pixels</p>
            </div>
          </CardContent>
        </Card>

        {/* Thank You Page Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Página de Obrigado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Título</label>
              <Input
                value={formData.thank_you_title || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, thank_you_title: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Inscrição Confirmada!"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Mensagem</label>
              <Textarea
                value={formData.thank_you_message || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, thank_you_message: e.target.value }))
                }
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Obrigado por se inscrever! Você será redirecionado para nosso grupo..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Delay do Redirecionamento (segundos)</label>
              <Input
                type="number"
                min={0}
                max={60}
                value={formData.thank_you_redirect_delay ?? 5}
                onChange={(e) =>
                    setFormData((prev) => ({ ...prev, thank_you_redirect_delay: Number(e.target.value) }))
                }
                className="mt-1 bg-card border-border text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">0 = sem redirecionamento automático</p>
            </div>
          </CardContent>
        </Card>

        {/* Event Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Configurações do Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Data do Evento</label>
              <Input
                type="datetime-local"
                value={formData.event_date?.slice(0, 16) || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, event_date: e.target.value }))
                }
                className="mt-1 bg-card border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Link do WhatsApp</label>
              <Input
                value={formData.whatsapp_group_link || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, whatsapp_group_link: e.target.value }))
                }
                className="mt-1 bg-card border-border text-foreground"
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Redirecionar quando expirar</label>
              <Switch
                checked={formData.redirect_when_expired ?? false}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, redirect_when_expired: checked }))
                }
              />
            </div>
            {formData.redirect_when_expired && (
              <div>
                <label className="text-sm text-muted-foreground">Redirecionar para</label>
                <Input
                  value={formData.redirect_to_slug || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, redirect_to_slug: e.target.value }))
                  }
                  className="mt-1 bg-card border-border text-foreground"
                  placeholder="participe"
                />
              </div>
            )}
          </CardContent>
        </Card>




        {/* Visual */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Visual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Logo</label>
              <Input
                value={formData.logo_url || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="https://seusite.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Logo exibida centralizada acima do título do Hero
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tamanho da Logo</label>
              <select
                value={formData.logo_size || 'md'}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_size: e.target.value }))}
                className="mt-1 w-full bg-card border-border text-foreground rounded-md px-3 py-2"
              >
                <option value="sm">Pequeno (48px)</option>
                <option value="md">Médio (64px)</option>
                <option value="lg">Grande (96px)</option>
                <option value="xl">Extra Grande (128px)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Cores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Cor Primária</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={formData.primary_color || 'hsl(var(--secondary))'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, primary_color: e.target.value }))
                  }
                  className="w-12 h-10 p-1 bg-card border-border"
                />
                <Input
                  value={formData.primary_color || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, primary_color: e.target.value }))
                  }
                  className="flex-1 bg-card border-border text-foreground"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Cor Secundária</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={formData.secondary_color || 'hsl(var(--primary))'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))
                  }
                  className="w-12 h-10 p-1 bg-card border-border"
                />
                <Input
                  value={formData.secondary_color || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))
                  }
                  className="flex-1 bg-card border-border text-foreground"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
