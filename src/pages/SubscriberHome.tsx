/**
 * SubscriberHome - Início do Assinante da Comunidade (Bloco 2 · Fase 2).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { useEntitlements } from '@/hooks/useEntitlements';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { GuestAgenda } from '@/components/guests/GuestAgenda';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Handshake, DollarSign, Send, MessageSquare, GraduationCap, User, Users, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SEO from '@/components/SEO';

const shortcuts = [
  { icon: Users, label: 'Vitrine da Comunidade', path: '/vitrine' },
  { icon: Sparkles, label: 'MatchMaking', path: '/matchmaking' },
  { icon: Handshake, label: 'Gente em Ação', path: '/gente-em-acao' },
  { icon: Send, label: 'Indicações', path: '/indicacoes' },
  { icon: DollarSign, label: 'Negócios', path: '/negocios' },
  { icon: MessageSquare, label: 'Depoimentos', path: '/depoimentos' },
  { icon: GraduationCap, label: 'Conteúdos', path: '/conteudos' },
  { icon: User, label: 'Meu Perfil', path: '/perfil' },
  { icon: Calendar, label: 'Encontros', path: '/encontros' },
];

export default function SubscriberHome({ firstName }: { firstName: string }) {
  const { canPath, can, data: rights, isLoading } = useEntitlements();
  const { drawState } = useMatchmaking();
  return (
    <div className="space-y-6 animate-fade-in">
      <SEO title="Gente Conexões" description="Início do Gente Conexões" />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-wrap-anywhere">Olá, {firstName}!</h1>
        <p className="text-muted-foreground">Bem-vindo ao Gente Conexões.</p>
      </div>
      <div className="border-b pb-5 space-y-2">
        <h2 className="text-lg font-semibold">{rights?.subscription?.plan_name ?? 'Gente Conexões'}</h2>
        {!isLoading && !rights?.subscription && <p className="text-muted-foreground">Sua assinatura não está ativa. Entre em contato com a organização para regularizar o acesso.</p>}
        {can('matchmaking_enabled') && <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">MatchMaking · {drawState ? `${drawState.remaining ?? '—'} sorteios disponíveis de ${drawState.quota ?? '—'} neste mês` : 'Carregando franquia…'}</p>
          <Button asChild><Link to="/matchmaking"><Sparkles className="h-4 w-4 mr-2" />Abrir MatchMaking</Link></Button>
        </div>}
      </div>
      <GuestAgenda subscriber />
      <Card>
        <CardHeader>
          <CardTitle>Seus atalhos</CardTitle>
          <CardDescription>Conecte-se com participantes do Gente Conexões e Convidados da Comunidade.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {shortcuts.filter(item => canPath(item.path)).map(({ icon: Icon, label, path }) => (
            <Link key={path} to={path} className="flex min-w-0 items-center gap-2 rounded-lg border p-3 text-sm font-medium hover:bg-accent transition-colors">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-wrap-anywhere">{label}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
