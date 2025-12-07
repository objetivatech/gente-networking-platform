import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import RankBadge from '@/components/RankBadge';
import {
  Handshake,
  MessageSquare,
  DollarSign,
  Send,
  Calendar,
  TrendingUp,
  Users,
} from 'lucide-react';

const statsCards = [
  { icon: Handshake, label: 'Gente em Ação', value: '0', color: 'text-blue-600' },
  { icon: MessageSquare, label: 'Depoimentos', value: '0', color: 'text-purple-600' },
  { icon: DollarSign, label: 'Negócios', value: 'R$ 0', color: 'text-green-600' },
  { icon: Send, label: 'Indicações', value: '0', color: 'text-orange-600' },
  { icon: Calendar, label: 'Presenças', value: '0', color: 'text-pink-600' },
];

export default function Index() {
  const { profile, isLoading } = useProfile();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Boas-vindas */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Membro'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao Gente Networking. Acompanhe suas atividades e conexões.
          </p>
        </div>
        {profile && <RankBadge rank={profile.rank} size="lg" />}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grid Principal */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Feed de Atividades */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Atividades Recentes
            </CardTitle>
            <CardDescription>
              Últimas atividades da comunidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg bg-muted/50">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Nenhuma atividade ainda</p>
                  <p className="text-sm">As atividades aparecerão aqui</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximos Encontros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Próximos Encontros
            </CardTitle>
            <CardDescription>
              Agenda da comunidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg bg-muted/50">
              <div className="text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nenhum encontro agendado</p>
                <p className="text-sm">Os encontros aparecerão aqui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Destaques da Comunidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Destaques da Comunidade
          </CardTitle>
          <CardDescription>
            Membros em destaque este mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg bg-muted/50">
            <div className="text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Sem destaques ainda</p>
              <p className="text-sm">Os membros em destaque aparecerão aqui</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
