/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
export interface ConnectionDoors {
  doors_open?: string[] | null;
  doors_seek?: string[] | null;
  doors_notes?: string | null;
}
export interface ConnectionTaxonomy {
  id: string;
  type: 'decisor' | 'setor';
  label: string;
  is_active: boolean;
  sort_order: number;
}
export function doorLabels(ids: string[] | null | undefined, options: ConnectionTaxonomy[]): string[] {
  const selected = new Set(ids ?? []);
  return options.filter((o) => selected.has(o.id)).map((o) => o.label);
}
/** Only exact active taxonomy IDs count; no assumed relationships from free text. */
export function analyzeDoorBridge(viewer: ConnectionDoors, target: ConnectionDoors, options: ConnectionTaxonomy[]) {
  const active = new Map(options.filter((o) => o.is_active).map((o) => [o.id, o]));
  const intersect = (seek?: string[] | null, open?: string[] | null) =>
    [...new Set(seek ?? [])].filter((id) => active.has(id) && (open ?? []).includes(id));
  const forward = intersect(viewer.doors_seek, target.doors_open);
  const reverse = intersect(target.doors_seek, viewer.doors_open);
  const hits = [...new Set([...forward, ...reverse])];
  const has = (ids: string[], type: ConnectionTaxonomy['type']) => ids.some((id) => active.get(id)?.type === type);
  // A single dimension is a possible bridge, never a claim of CEO+sector access.
  const direct = (has(forward, 'decisor') && has(forward, 'setor')) || (has(reverse, 'decisor') && has(reverse, 'setor'));
  return {
    score: hits.length ? (direct ? 70 : 35) + (forward.length && reverse.length ? 10 : 0) : 0,
    direct,
    forward: doorLabels(forward, options),
    reverse: doorLabels(reverse, options),
  };
}
/** Card contract: two visible doors, with the rest available in details. */
export function compactDoorLabels(labels: string[]) {
  const unique = [...new Set(labels)];
  return { visible: unique.slice(0, 2), hidden: unique.slice(2) };
}