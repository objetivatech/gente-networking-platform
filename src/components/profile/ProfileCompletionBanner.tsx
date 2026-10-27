/**
 * ProfileCompletionBanner - Tarja fixa em todas as páginas enquanto o perfil
 * do usuário logado não estiver 100% preenchido. Reaparece se algum campo for limpo.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { Link } from 'react-router-dom';
import { UserRoundPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProfile } from '@/hooks/useProfile';
import { getProfileCompleteness, getProfileCompletenessPercent } from '@/lib/profile-completeness';

export function ProfileCompletionBanner() {
  const { profile, isLoading } = useProfile();
  if (isLoading || !profile) return null;
  const { isComplete, missing } = getProfileCompleteness(profile);
  if (isComplete) return null;
  const percent = getProfileCompletenessPercent(profile);
  return (
    <div role="status" className="mb-4 flex flex-col gap-3 rounded-lg border border-accent/40 bg-accent/10 p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium">Seu perfil está {percent}% completo</p>
        <Progress value={percent} className="h-2" />
        <p className="text-xs text-muted-foreground text-wrap-anywhere">
          Perfis completos aparecem primeiro na Vitrine e geram mais conexões. Falta: {missing.map((m) => m.label).join(', ')}.
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to="/perfil"><UserRoundPen className="mr-2 h-4 w-4" />Completar meu perfil</Link>
      </Button>
    </div>
  );
}
