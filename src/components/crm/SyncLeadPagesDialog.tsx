/**
 * SyncLeadPagesDialog - Cadastro antecipado de páginas de captação (v3.47.0).
 *
 * Permite colar a lista de URLs das LPs já publicadas para que apareçam nos
 * filtros de origem do CRM antes mesmo da primeira conversão. Páginas novas
 * continuam sendo descobertas automaticamente ao receberem o primeiro lead.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useSyncKnownPages, normalizePageKey } from '@/hooks/useCrmLeadPages';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncLeadPagesDialog({ open, onOpenChange }: Props) {
  const [value, setValue] = useState('');
  const sync = useSyncKnownPages();

  const urls = value
    .split(/[\n,;]+/)
    .map((v) => normalizePageKey(v))
    .filter((v): v is string => !!v);

  const handleSync = async () => {
    if (urls.length === 0) return;
    await sync.mutateAsync(urls);
    setValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sincronizar páginas de captação</DialogTitle>
          <DialogDescription>
            Cole as URLs das landing pages do projeto (uma por linha). Elas passam a aparecer nos
            filtros de origem mesmo sem leads. Páginas novas continuam sendo detectadas sozinhas
            no primeiro cadastro recebido.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          rows={8}
          placeholder={'https://gentenetworking.com.br/participe\nhttps://gentenetworking.com.br/gente-hub'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {urls.length} página(s) reconhecida(s).
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSync} disabled={urls.length === 0 || sync.isPending}>
            {sync.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sincronizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
