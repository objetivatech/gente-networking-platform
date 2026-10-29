/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useConnectionTaxonomies } from '@/hooks/useConnectionDoors';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import type { ConnectionDoors } from '@/lib/connection-doors';

export function ConnectionDoorsEditor({ value, onChange }: { value: ConnectionDoors; onChange: (value: ConnectionDoors) => void }) {
  const { data: options = [], isLoading, error } = useConnectionTaxonomies();
  const [search, setSearch] = useState('');
  return <section className="border-t pt-4 space-y-4">
    <h3 className="font-semibold">Portas de conexão</h3>
    <Input aria-label="Buscar decisores e setores" placeholder="Buscar decisores ou setores..." value={search} onChange={(e) => setSearch(e.target.value)} />
    {isLoading && <p role="status" className="text-sm text-muted-foreground">Carregando opções…</p>}
    {error && <p className="text-sm text-destructive">Não foi possível carregar as opções.</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      {(['doors_open', 'doors_seek'] as const).map((key) => <fieldset key={key} className="min-w-0 space-y-3">
        <legend className="font-medium">{key === 'doors_open' ? 'Portas que abro' : 'Portas que procuro'}</legend>
        {(['decisor', 'setor'] as const).map((type) => <div key={type} className="space-y-2">
          <h4 className="text-sm text-muted-foreground">{type === 'decisor' ? 'Decisores' : 'Setores'}</h4>
          <div className="max-h-56 overflow-y-auto border rounded-md p-3 space-y-3">
            {options.filter((o) => o.type === type && (o.is_active || (value[key] ?? []).includes(o.id)) && o.label.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map((option) => {
              const selected = (value[key] ?? []).includes(option.id);
              return <Label key={option.id} htmlFor={`${key}-${option.id}`} className="flex items-start gap-2 text-sm font-normal cursor-pointer leading-snug">
                <Checkbox id={`${key}-${option.id}`} checked={selected} onCheckedChange={(checked) => onChange({ ...value, [key]: checked === true ? [...(value[key] ?? []), option.id] : (value[key] ?? []).filter((id) => id !== option.id) })} />
                <span className="min-w-0 text-wrap-anywhere">{option.label}{!option.is_active && <span className="text-muted-foreground"> (inativa)</span>}</span>
              </Label>;
            })}
          </div>
        </div>)}
      </fieldset>)}
    </div>
    <div className="space-y-2"><Label htmlFor="doors-notes">Observações sobre portas e acessos</Label><Textarea id="doors-notes" maxLength={500} value={value.doors_notes ?? ''} onChange={(e) => onChange({ ...value, doors_notes: e.target.value })} placeholder="Ex.: Relacionamento com sindicatos da região e hospitais privados." /><p className="text-xs text-muted-foreground text-right">{(value.doors_notes ?? '').length}/500</p></div>
  </section>;
}