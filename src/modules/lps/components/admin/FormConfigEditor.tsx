/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { normalizeLpForm, LP_FIELD_LABELS, type LpFieldKey, type LpFormConfig } from '../../lib/form-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
export function FormConfigEditor({ value, onChange, community = false, hub = false }: { value: unknown; onChange: (config: LpFormConfig) => void; community?: boolean; hub?: boolean }) {
  const config = normalizeLpForm(value, true);
  if (!Object.keys(config.fields).length && !config.questions.length) {
    for (const key of Object.keys(LP_FIELD_LABELS) as LpFieldKey[]) {
      const visible = community ? ['phone', 'segment'].includes(key) : !hub || !key.startsWith('group_');
      config.fields[key] = { visible, required: visible && !(community && key === 'phone'), label: LP_FIELD_LABELS[key] };
    }
  }
  return <section className="space-y-4">
    <h3 className="font-semibold">Campos do formulário</h3>
    <div className="text-sm text-muted-foreground">Nome completo e e-mail são obrigatórios.</div>
    {(Object.keys(LP_FIELD_LABELS) as LpFieldKey[]).map(key => {
      const field = config.fields[key] ?? { visible: false, required: false, label: LP_FIELD_LABELS[key] };
      const change = (updates: Partial<typeof field>) => onChange({ ...config, fields: { ...config.fields, [key]: { ...field, ...updates } } });
      return <div key={key} className="grid gap-2 border-b border-border pb-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <Input aria-label={`Rótulo: ${LP_FIELD_LABELS[key]}`} value={field.label} maxLength={160} onChange={e => change({ label: e.target.value })} />
        <Label className="flex items-center gap-2"><Switch checked={field.visible} onCheckedChange={visible => change({ visible })} />Exibir</Label>
        <Label className="flex items-center gap-2"><Switch checked={field.required} disabled={!field.visible} onCheckedChange={required => change({ required })} />Obrigatório</Label>
      </div>;
    })}
    <h3 className="font-semibold">Perguntas adicionais</h3>
    {config.questions.map((question, index) => {
      const change = (updates: Partial<typeof question>) => onChange({ ...config, questions: config.questions.map((item, i) => i === index ? { ...item, ...updates } : item) });
      return <div key={question.id} className="space-y-3 border-b border-border pb-4">
        <div className="flex gap-2"><Input aria-label="Pergunta" value={question.label} maxLength={160} onChange={e => change({ label: e.target.value })} /><Button variant="ghost" size="icon" title="Remover pergunta" onClick={() => onChange({ ...config, questions: config.questions.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button></div>
        <select aria-label="Tipo de resposta" className="w-full rounded-md border border-input bg-background p-2" value={question.type} onChange={e => change({ type: e.target.value as typeof question.type })}><option value="text">Texto curto</option><option value="textarea">Texto longo</option><option value="select">Menu suspenso (dropdown)</option><option value="radio">Opção única (botões)</option><option value="email">E-mail (validado)</option><option value="phone">Telefone/WhatsApp (validado)</option></select>
        {(question.type === 'select' || question.type === 'radio') && <Textarea key={`${question.id}-${question.type}`} aria-label="Opções, uma por linha" placeholder="Uma opção por linha" defaultValue={question.options.join('\n')} onBlur={e => change({ options: e.target.value.split('\n') })} />}
        <Label className="flex gap-2 items-center"><Switch checked={question.required} onCheckedChange={required => change({ required })} />Resposta obrigatória</Label>
      </div>;
    })}
    <Button variant="outline" disabled={config.questions.length >= 20} onClick={() => onChange({ ...config, questions: [...config.questions, { id: crypto.randomUUID(), label: 'Nova pergunta', type: 'text', required: false, options: [] }] })}><Plus className="mr-2 h-4 w-4" />Adicionar pergunta</Button>
    <Button variant="ghost" onClick={() => onChange({ fields: {}, questions: [] })}>Restaurar formulário original</Button>
  </section>;
}