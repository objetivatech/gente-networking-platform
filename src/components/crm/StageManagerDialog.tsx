/**
 * StageManagerDialog - Gerenciamento das colunas do funil do CRM (v3.35.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Permite renomear, recolorir, reordenar, criar e arquivar colunas, além de
 * ligar/desligar a notificação por e-mail quando um lead entra na coluna.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Bell, Lock, Plus, Trash2 } from 'lucide-react';
import {
  useCrmPipelineStages,
  useSaveStage,
  useReorderStages,
  useDeleteStage,
  type CrmPipelineStage,
} from '@/hooks/useCrmPipelineStages';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StageManagerDialog({ open, onOpenChange }: Props) {
  const { data: stages } = useCrmPipelineStages();
  const save = useSaveStage();
  const reorder = useReorderStages();
  const remove = useDeleteStage();
  const [newLabel, setNewLabel] = useState('');

  const list = stages ?? [];

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const copy = [...list];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    reorder.mutate(copy.map((s, i) => ({ id: s.id, position: i + 1 })));
  };

  const patch = (stage: CrmPipelineStage, changes: Partial<CrmPipelineStage>) =>
    save.mutate({ ...stage, ...changes });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Colunas do CRM</DialogTitle>
          <DialogDescription>
            Renomeie, reordene e crie colunas. Colunas de sistema não podem ser excluídas porque as
            automações do funil dependem delas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {list.map((stage, index) => (
            <div key={stage.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="color"
                  aria-label={`Cor da coluna ${stage.label}`}
                  value={stage.color}
                  onChange={(e) => patch(stage, { color: e.target.value })}
                  className="h-8 w-8 rounded border cursor-pointer shrink-0"
                />
                <Input
                  defaultValue={stage.label}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== stage.label) {
                      patch(stage, { label: e.target.value.trim() });
                    }
                  }}
                  className="h-9 min-w-0"
                />
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  {stage.is_system ? (
                    <span className="flex items-center px-2 text-muted-foreground" title="Coluna de sistema">
                      <Lock className="h-4 w-4" />
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove.mutate(stage)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {stage.key}
                  </Badge>
                  {stage.is_system && (
                    <Badge variant="secondary" className="text-[10px]">
                      sistema
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`notify-${stage.id}`} className="text-xs">
                    Notificar ao entrar
                  </Label>
                  <Switch
                    id={`notify-${stage.id}`}
                    checked={stage.notify_on_enter}
                    onCheckedChange={(v) => patch(stage, { notify_on_enter: v })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Nome da nova coluna"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Button
            className="gap-2 shrink-0"
            disabled={!newLabel.trim() || save.isPending}
            onClick={() => {
              save.mutate(
                { label: newLabel.trim(), position: list.length + 1 },
                { onSuccess: () => setNewLabel('') },
              );
            }}
          >
            <Plus className="h-4 w-4" /> Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
