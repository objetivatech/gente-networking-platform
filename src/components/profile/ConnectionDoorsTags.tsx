/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConnectionTaxonomies } from '@/hooks/useConnectionDoors';
import { compactDoorLabels, doorLabels, type ConnectionDoors } from '@/lib/connection-doors';

export function ConnectionDoorsTags({ doors, expanded = false }: { doors?: ConnectionDoors | null; expanded?: boolean }) {
  const { data: options = [] } = useConnectionTaxonomies();
  const open = doorLabels(doors?.doors_open, options);
  const seek = doorLabels(doors?.doors_seek, options);
  if (!open.length && !seek.length && !doors?.doors_notes) return null;
  if (expanded) return <div className="space-y-3 min-w-0">
    {[['Portas que abro', open], ['Portas que procuro', seek]].map(([title, values]) =>
      Array.isArray(values) && values.length > 0 && <div key={String(title)}>
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <div className="flex flex-wrap gap-1">{values.map((label) => <Badge key={label} variant="outline" className="text-xs text-wrap-anywhere">{label}</Badge>)}</div>
      </div>)}
    {doors?.doors_notes && <p className="text-sm text-muted-foreground whitespace-pre-line text-wrap-anywhere">{doors.doors_notes}</p>}
  </div>;
  const labels = [...open.map((s) => `Abro: ${s}`), ...seek.map((s) => `Procuro: ${s}`)];
  const { visible, hidden } = compactDoorLabels(labels);
  return <div className="flex flex-wrap gap-1 min-w-0">
    {visible.map((label) => <Tooltip key={label}><TooltipTrigger asChild><Badge variant="outline" tabIndex={0} className="max-w-full text-xs font-normal"><span className="truncate">{label}</span></Badge></TooltipTrigger><TooltipContent className="max-w-xs text-wrap-anywhere">{label}</TooltipContent></Tooltip>)}
    {hidden.length > 0 && <Tooltip><TooltipTrigger asChild><Badge variant="secondary" tabIndex={0} aria-label={`${hidden.length} outras portas`} className="text-xs">+{hidden.length}</Badge></TooltipTrigger><TooltipContent className="max-w-xs max-h-72 overflow-y-auto"><ul>{hidden.map((label) => <li key={label} className="text-wrap-anywhere">{label}</li>)}</ul></TooltipContent></Tooltip>}
  </div>;
}