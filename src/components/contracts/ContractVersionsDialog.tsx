/**
 * ContractVersionsDialog - Lista de versões de um modelo com opção de restaurar.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw } from 'lucide-react';
import {
  useContractTemplateVersions,
  useRestoreContractVersion,
  type ContractTemplate,
} from '@/hooks/useContractTemplates';

interface Props {
  template: ContractTemplate;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ContractVersionsDialog({ template, open, onOpenChange }: Props) {
  const { data: versions, isLoading } = useContractTemplateVersions(open ? template.id : null);
  const restore = useRestoreContractVersion();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Versões de "{template.name}"</DialogTitle>
          <DialogDescription>
            Cada edição gera uma nova versão. Restaurar uma versão cria uma nova entrada com o mesmo conteúdo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 border rounded-md">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : !versions?.length ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma versão registrada ainda.</p>
          ) : (
            <ul className="divide-y">
              {versions.map((v) => (
                <li key={v.id} className="p-3 flex items-center gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{v.version}</Badge>
                      {v.version === template.version && (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Atual</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(v.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1 text-wrap-anywhere">{v.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.variables_schema?.length ?? 0} campo(s) dinâmico(s)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={v.version === template.version || restore.isPending}
                    onClick={() => restore.mutate({ templateId: template.id, version: v })}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
