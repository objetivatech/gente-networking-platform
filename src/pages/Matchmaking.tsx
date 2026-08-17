import SEO from '@/components/SEO';
/**
 * @page Matchmaking
 * @route /matchmaking
 * @description MatchMaking — sugestões de conexão entre perfis para membros.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { Navigate, Link } from 'react-router-dom';
import { useMatchmaking, MatchSuggestion } from '@/hooks/useMatchmaking';
import { useAdmin } from '@/hooks/useAdmin';
import { canUseMatchmaking } from '@/lib/access-control';
import { ScheduleMeetingDialog } from '@/components/ScheduleMeetingDialog';
import { MatchmakingCheckDialog } from '@/components/MatchmakingCheckDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  HeartHandshake, Sparkles, CheckCircle2, AlertTriangle, Building2, Briefcase, Star, Lightbulb,
  Repeat2, PhoneCall, Handshake,
} from 'lucide-react';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default function Matchmaking() {
  const { role, isLoading: roleLoading } = useAdmin();
  const { myProfile, suggestions, weeklySuggestion, isLoading, connections, createCheck, registerAttempt } = useMatchmaking();

  if (!roleLoading && !canUseMatchmaking(role)) {
    return <Navigate to="/" replace />;
  }

  // Sugestões visíveis: exclui apenas quem está em fila de espera (60 dias)
  const pending = suggestions;

  return (
    <div className="space-y-6">
      <SEO
        title="MatchMaking — Conexões inteligentes"
        description="Descubra conexões estratégicas entre os membros e convidados da comunidade Gente Networking com base no perfil de cada pessoa."
      />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <HeartHandshake className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">MatchMaking</h1>
          <p className="text-muted-foreground">Conexões sugeridas a partir dos perfis da comunidade.</p>
        </div>
      </div>

      {myProfile && !myProfile.isComplete && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Complete seu perfil para um MatchMaking melhor</AlertTitle>
          <AlertDescription>
            Preencha {myProfile.missingFields.join(', ')} para receber e gerar conexões mais precisas.{' '}
            <Link to="/perfil" className="font-medium underline">Completar perfil</Link>
          </AlertDescription>
        </Alert>
      )}

      {weeklySuggestion && (
        <Card className="border-primary/40 bg-gradient-to-r from-primary/10 to-transparent">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-full bg-primary/15 shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Sugestão da semana</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={weeklySuggestion.avatar_url || undefined} />
                    <AvatarFallback>{initials(weeklySuggestion.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{weeklySuggestion.full_name}</p>
                    {weeklySuggestion.company && (
                      <p className="text-sm text-muted-foreground truncate">{weeklySuggestion.company}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <ScheduleMeetingDialog
                recipientId={weeklySuggestion.id}
                memberName={weeklySuggestion.full_name}
                variant="default"
                onScheduled={() =>
                  registerAttempt.mutate({ targetId: weeklySuggestion.id, attemptType: 'schedule_request' })
                }
              />
              <MatchmakingCheckDialog
                targetId={weeklySuggestion.id}
                targetName={weeklySuggestion.full_name}
                createCheck={createCheck}
              />
            </div>
          </CardContent>
        </Card>
      )}


      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-2">
            <Sparkles className="h-4 w-4" /> Sugestões ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="connected" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Já conectados ({connections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : pending.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma sugestão de conexão no momento. Complete seu perfil e volte em breve.
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map((s) => (
                <Card key={s.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback>{initials(s.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base line-clamp-2 text-wrap-anywhere">{s.full_name}</CardTitle>
                        {s.position && <p className="text-sm text-muted-foreground line-clamp-2 text-wrap-anywhere">{s.position}</p>}
                      </div>
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Star className="h-3 w-3" /> {s.score}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 flex-1">
                    <div className="space-y-1 text-sm">
                      {s.company && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-2 text-wrap-anywhere">{s.company}</span>
                        </div>
                      )}
                      {s.business_segment && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-2 text-wrap-anywhere">{s.business_segment}</span>
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-snug text-wrap-anywhere">{s.opportunityTitle}</p>
                          <p className="text-xs leading-relaxed text-muted-foreground text-wrap-anywhere">{s.opportunityDescription}</p>
                        </div>
                      </div>
                      {s.opportunityIdeas.length > 0 && (
                        <ul className="space-y-1 pl-6 text-xs text-muted-foreground">
                          {s.opportunityIdeas.slice(0, 2).map((idea) => (
                            <li key={idea} className="list-disc text-wrap-anywhere">{idea}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.reasons.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs font-normal leading-snug">
                          <span className="text-wrap-anywhere">{r}</span>
                        </Badge>
                      ))}
                    </div>
                    {s.role === 'convidado' && (
                      <Badge variant="secondary" className="w-fit text-xs">Convidado</Badge>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {s.attemptsCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <PhoneCall className="h-3.5 w-3.5" /> Tentativas: {s.attemptsCount}
                        </span>
                      )}
                      {s.connectionsCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Handshake className="h-3.5 w-3.5" /> Conexões: {s.connectionsCount}
                        </span>
                      )}
                    </div>
                    {s.isReconnection && (
                      <Badge variant="secondary" className="w-fit gap-1 text-xs">
                        <Repeat2 className="h-3 w-3" /> Reconexão sugerida
                      </Badge>
                    )}
                    <div className="mt-auto space-y-2">
                      <ScheduleMeetingDialog
                        recipientId={s.id}
                        memberName={s.full_name}
                        variant="default"
                        className="w-full"
                        onScheduled={() =>
                          registerAttempt.mutate({ targetId: s.id, attemptType: 'schedule_request' })
                        }
                      />
                      <MatchmakingCheckDialog
                        targetId={s.id}
                        targetName={s.full_name}
                        createCheck={createCheck}
                        className="w-full"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        disabled={registerAttempt.isPending}
                        onClick={() => registerAttempt.mutate({ targetId: s.id, attemptType: 'manual' })}
                      >
                        Registrar tentativa de contato
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connected" className="mt-4">
          {connections.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              Você ainda não registrou nenhuma conexão.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {connections.map((c) => (
                <Card key={c.id}>
                  <CardContent className="py-4 flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={c.target?.avatar_url || undefined} />
                      <AvatarFallback>{initials(c.target?.full_name || '?')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.target?.full_name || 'Contato'}</p>
                      {c.target?.company && <p className="text-sm text-muted-foreground">{c.target.company}</p>}
                      {c.description && <p className="text-sm mt-1">{c.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Conexão em {formatDate(c.created_at)} · {c.totalWithTarget} encontro(s) registrado(s) ·{' '}
                        {c.isInCooldown
                          ? `disponível para nova sugestão em ${formatDate(c.availableAt)}`
                          : 'disponível agora nas sugestões'}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

    </div>
  );
}
