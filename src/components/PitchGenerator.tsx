/**
 * PitchGenerator - Card do Gerador de Pitch via IA no Perfil.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Permite ao membro gerar automaticamente um texto de apresentação
 * profissional (pitch) a partir das informações do seu perfil, via a
 * edge function `generate-pitch` (Lovable AI Gateway).
 */

import { useEffect, useState } from 'react';
import { useConnectionTaxonomies } from '@/hooks/useConnectionDoors';
import { doorLabels } from '@/lib/connection-doors';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Copy, RefreshCw, Save } from 'lucide-react';

interface PitchGeneratorProps {
  profile: any;
  onSave: (pitch: string) => Promise<unknown>;
}

export function PitchGenerator({ profile, onSave }: PitchGeneratorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState(profile?.ai_pitch ?? '');
  const [saving, setSaving] = useState(false);
  const { data: taxonomies = [] } = useConnectionTaxonomies();
  useEffect(() => { setPitch(profile?.ai_pitch ?? ''); }, [profile?.id, profile?.ai_pitch]);
  const dirty = pitch !== (profile?.ai_pitch ?? '');

  const hasEnoughInfo = !!(
    profile &&
    (profile.what_i_do || profile.ideal_client || profile.bio || profile.business_segment)
  );

  const handleGenerate = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pitch', {
        body: {
          profile: {
            full_name: profile.full_name,
            company: profile.company,
            position: profile.position,
            business_segment: profile.business_segment,
            bio: profile.bio,
            what_i_do: profile.what_i_do,
            ideal_client: profile.ideal_client,
            how_to_refer_me: profile.how_to_refer_me,
            tags: profile.tags || [],
            doors_open: doorLabels(profile.doors_open, taxonomies),
            doors_seek: doorLabels(profile.doors_seek, taxonomies),
            doors_notes: profile.doors_notes,
          },
        },
      });

      if (error) {
        // Tenta extrair mensagem amigável retornada pela função
        let message = 'Não foi possível gerar o pitch.';
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) message = body.error;
          }
        } catch {
          // ignora
        }
        throw new Error(message);
      }

      if (data?.error) throw new Error(data.error);
      if (!data?.pitch) throw new Error('Resposta vazia da IA.');

      await onSave(data.pitch);
      setPitch(data.pitch);
      toast({ title: 'Novo pitch salvo no perfil' });
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Não foi possível gerar o pitch.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pitch);
      toast({ title: 'Copiado!', description: 'Pitch copiado para a área de transferência.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(pitch); } catch { /* profile mutation presents the error */ }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Gerador de Pitch via IA
        </CardTitle>
        <CardDescription>
          Gere automaticamente um texto de apresentação profissional baseado nas informações do seu
          perfil. Ideal para usar em encontros e apresentações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasEnoughInfo && (
          <p className="text-sm text-muted-foreground">
            Complete seu perfil (bio, "O que faço", "Cliente ideal" e segmento) para gerar um pitch
            mais preciso.
          </p>
        )}

        {pitch && (
          <Textarea
            value={pitch}
            aria-label="Meu pitch"
            disabled={loading || saving}
            onChange={(e) => setPitch(e.target.value)}
            rows={5}
            className="resize-none"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={loading || saving} size="sm">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...
              </>
            ) : pitch ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" /> Gerar Novo Pitch
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" /> Gerar Pitch
              </>
            )}
          </Button>
          {pitch && (
            <Button onClick={handleCopy} variant="outline" size="sm" disabled={loading || saving}>
              <Copy className="h-4 w-4 mr-2" /> Copiar
            </Button>
          )}
          {dirty && <Button onClick={handleSave} variant="outline" size="sm" disabled={loading || saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Salvando…' : 'Salvar alterações'}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export default PitchGenerator;
