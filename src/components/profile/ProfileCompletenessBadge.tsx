/**
 * ProfileCompletenessBadge - Selo amigável de completude exibido nos cards.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { CheckCircle2, CircleDashed, Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getCompletenessLevel } from '@/lib/profile-completeness';

export function ProfileCompletenessBadge({ percent }: { percent: number | undefined }) {
  if (percent === undefined) return null;
  const level = getCompletenessLevel(percent);
  if (level === 'complete') {
    return <Badge className="w-fit gap-1 border-transparent bg-primary/10 text-primary hover:bg-primary/10"><CheckCircle2 className="h-3 w-3" />Perfil completo</Badge>;
  }
  if (level === 'almost') {
    return <Badge className="w-fit gap-1 border-transparent bg-accent/15 text-accent-foreground hover:bg-accent/15"><Hourglass className="h-3 w-3" />Faltam poucos campos · {percent}%</Badge>;
  }
  return <Badge variant="outline" className="w-fit gap-1 text-muted-foreground"><CircleDashed className="h-3 w-3" />Perfil incompleto · {percent}%</Badge>;
}
