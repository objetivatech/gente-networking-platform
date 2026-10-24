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
import { Link } from 'react-router-dom';
import { Handshake, DollarSign, Send, MessageSquare, GraduationCap, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SEO from '@/components/SEO';

const shortcuts = [
  { icon: Handshake, label: 'Gente em Ação', path: '/gente-em-acao' },
  { icon: Send, label: 'Indicações', path: '/indicacoes' },
  { icon: DollarSign, label: 'Negócios', path: '/negocios' },
  { icon: MessageSquare, label: 'Depoimentos', path: '/depoimentos' },
  { icon: GraduationCap, label: 'Conteúdos', path: '/conteudos' },
  { icon: User, label: 'Meu Perfil', path: '/perfil' },
];

export default function SubscriberHome({ firstName }: { firstName: string }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <SEO title="Início" />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-wrap-anywhere">Olá, {firstName}!</h1>
        <p className="text-muted-foreground">Bem-vindo à Comunidade Gente como Assinante.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Seus atalhos</CardTitle>
          <CardDescription>Conecte-se com outros Assinantes e Convidados da Comunidade.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {shortcuts.map(({ icon: Icon, label, path }) => (
            <Link key={path} to={path} className="flex min-w-0 items-center gap-2 rounded-lg border p-3 text-sm font-medium hover:bg-accent transition-colors">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
