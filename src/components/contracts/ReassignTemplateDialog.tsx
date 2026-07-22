/**
 * ReassignTemplateDialog - Reatribui um modelo (versão) a leads existentes.
 * Admin-only. Nunca sobrescreve contratos já enviados/assinados (regra do RPC).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useCrmLeads } from '@/hooks/useCrmLeads';
import {
  useReassignContractTemplate,
  type ContractTemplate,
} from '@/hooks/useContractTemplates';

interface Props {
  template: ContractTemplate;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ReassignTemplateDialog({ template, open, onOpenChange }: Props) {
  const { data: leads } = useCrmLeads();
  const reassign = useReassignContractTemplate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligible = useMemo(
    () =>
      (leads ?? []).filter(
        (l) =>
          !l.contract_status ||
          l.contract_status === 'not_sent' ||
          l.contract_status === 'rejected' ||
          l.contract_status === 'expired',
      ),
    [leads],
  );

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible.map((l) => l.id)));
  };

  const submit = async () => {
    await reassign.mutateAsync({
      templateId: template.id,
      version: template.version,
      leadIds: Array.from(selected),
    });
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reatribuir "{template.name}" (v{template.version})</DialogTitle>
          <DialogDescription>
            Aplica esse modelo aos leads selecionados. Leads com contrato já enviado ou assinado são preservados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Apenas leads com contrato pendente, rejeitado ou expirado ficam elegíveis. O histórico do lead recebe um evento de reatribuição.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {eligible.length} lead(s) elegíveis · {selected.size} selecionado(s)
          </p>
          <Button size="sm" variant="ghost" onClick={toggleAll}>
            {selected.size === eligible.length && eligible.length > 0 ? 'Limpar' : 'Selecionar todos'}
          </Button>
        </div>

        <ScrollArea className="h-64 border rounded-md">
          <ul className="divide-y">
            {eligible.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">Nenhum lead elegível no momento.</li>
            )}
            {eligible.map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer min-w-0"
                onClick={() => toggle(l.id)}
              >
                <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-wrap-anywhere">{l.name}</p>
                  <p className="text-xs text-muted-foreground text-wrap-anywhere">{l.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {l.is_hub && <Badge className="bg-amber-500 text-white text-[10px]">HUB</Badge>}
                  <Badge variant="outline" className="text-[10px]">
                    {l.contract_status ?? 'not_sent'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={reassign.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={!selected.size || reassign.isPending}
          >
            {reassign.isPending ? 'Aplicando...' : `Aplicar em ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
