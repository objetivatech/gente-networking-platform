/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { Badge } from '@/components/ui/badge';
import type { PlanBadgeData } from '@/lib/plan-commercial';
export function PlanBadge({ badge }: { badge?: PlanBadgeData | null }) {
 if (!badge?.label) return null;
 return <Badge variant={badge.tone === 'secondary' ? 'secondary' : 'default'} className={badge.tone === 'accent' ? 'bg-accent text-accent-foreground' : undefined}>{badge.label}</Badge>;
}
