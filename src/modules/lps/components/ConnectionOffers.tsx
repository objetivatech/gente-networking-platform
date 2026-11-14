/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { usePublicConnectionPlans } from '../hooks/usePublicConnectionPlans';
import type { AdvancedContent } from './landing/CommunityLandingPage';
import { platformHref } from '../lib/rules';
import { renderContent } from '../lib/markdown';
import { formatCents } from '@/hooks/useBilling';
import { MODULE_FEATURES } from '@/lib/plan-access';
import { hasAvailableSeats } from '@/lib/plan-commercial';
import { PlanBadge } from '@/components/profile/PlanBadge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, RefreshCw, ShieldCheck } from 'lucide-react';

export function ConnectionOffers({ content }: { content: AdvancedContent['offer'] }) {
  const plans = usePublicConnectionPlans();
  return <section id="planos" className="scroll-mt-6 border-y bg-muted/40">
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <h2 className="text-3xl font-bold sm:text-4xl" dangerouslySetInnerHTML={{ __html: renderContent(content?.title) }} />
      <div className="mt-4 max-w-2xl text-muted-foreground" dangerouslySetInnerHTML={{ __html: renderContent(content?.subtitle) }} />
      {plans.isPending ? <p role="status" className="mt-8">Consultando planos…</p> : plans.error ? <div className="mt-8"><p role="alert">Não foi possível consultar as ofertas.</p><Button variant="outline" className="mt-4" onClick={() => plans.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></div> : !plans.data?.length ? <p className="mt-8 border-l-2 border-secondary pl-5 text-muted-foreground">As ofertas de assinatura ainda não foram liberadas. Volte em breve.</p> : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {plans.data.map(plan => <article key={plan.id} className="flex min-w-0 flex-col rounded-lg border bg-card p-6">
          <PlanBadge badge={plan.badge_label ? { label: plan.badge_label, tone: plan.badge_tone } : null} />
          <h3 className="mt-3 text-xl font-bold text-wrap-anywhere">{plan.name}</h3>
          <p className="mt-4 text-3xl font-bold text-primary">{formatCents(plan.amount_cents)}<span className="text-sm font-normal text-muted-foreground"> /mês</span></p>
          {plan.description && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground text-wrap-anywhere">{plan.description}</p>}
          {plan.remaining_seats != null && <p className="mt-4 font-semibold text-accent-foreground">{plan.remaining_seats > 0 ? `${plan.remaining_seats} vagas disponíveis` : 'Vagas esgotadas'}</p>}
          {plan.trial_enabled && <p className="mt-3 text-sm">{plan.trial_days} dias de teste gratuito na primeira contratação elegível.</p>}
          <ul className="mt-6 flex-1 space-y-3 text-sm">{Object.entries(MODULE_FEATURES).filter(([key]) => plan.features[key] === true).map(([key, label]) => <li key={key} className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 text-accent-foreground" />{label}</li>)}{typeof plan.features.matchmaking_monthly_quota === 'number' && <li>{plan.features.matchmaking_monthly_quota} sorteios extras de MatchMaking/mês</li>}</ul>
          {hasAvailableSeats(plan.remaining_seats) ? <Button variant="secondary" className="mt-6 h-auto min-h-12 whitespace-normal py-3 text-secondary-foreground" asChild><a href={platformHref(`/assinar?plano=${encodeURIComponent(plan.id)}`)}>{content?.buttonText}<ArrowRight className="ml-2 h-4 w-4 shrink-0" /></a></Button> : <Button disabled className="mt-6">Vagas esgotadas</Button>}
        </article>)}
      </div>}
      <div className="mt-8 flex max-w-3xl items-start gap-3 text-sm text-muted-foreground"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><div dangerouslySetInnerHTML={{ __html: renderContent(content?.reassurance) }} /></div>
    </div>
  </section>;
}