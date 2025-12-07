import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { useStats } from '@/hooks/useStats';
import { useMeetings } from '@/hooks/useMeetings';
import { useAdmin } from '@/hooks/useAdmin';
import RankBadge from '@/components/RankBadge';
import ActivityFeed from '@/components/ActivityFeed';
import ScoringRulesCard from '@/components/ScoringRulesCard';
import GuestWelcome from '@/pages/GuestWelcome';
import {
  Handshake,
  MessageSquare,
  DollarSign,
  Send,
  Calendar,
  Users,
  MapPin,
  Clock,
} from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Index() {
  const { profile, isLoading: profileLoading } = useProfile();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { meetings, isLoading: meetingsLoading } = useMeetings();
  const { isGuest, isLoading: roleLoading } = useAdmin();

  const upcomingMeetings = meetings?.filter(m => isFuture(parseISO(m.meeting_date))).slice(0, 3);

  // Convidados veem página especial
  if (!roleLoading && isGuest) {
    return <GuestWelcome />;
  }

  const statsCards = [
    { icon: Handshake, label: 'Gente em Ação', value: stats?.genteEmAcao?.total || 0, color: 'text-blue-600' },
    { icon: MessageSquare, label: 'Depoimentos', value: stats?.testimonials?.sent || 0, color: 'text-purple-600' },
    { icon: DollarSign, label: 'Negócios', value: `R$ ${((stats?.businessDeals?.value || 0) / 1000).toFixed(1)}k`, color: 'text-green-600' },
    { icon: Send, label: 'Indicações', value: stats?.referrals?.sent || 0, color: 'text-orange-600' },
    { icon: Calendar, label: 'Presenças', value: stats?.attendances || 0, color: 'text-pink-600' },
  ];

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
        <div className="flex items-center gap-3">
          {profile && (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-sm text-muted-foreground">Seus pontos</p>
                <p className="text-lg font-bold text-primary">{profile.points || 0} pts</p>
              </div>
              <RankBadge rank={profile.rank} size="lg" />
            </>
          )}
        </div>
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
        <div className="lg:col-span-2">
          <ActivityFeed limit={15} />
        </div>

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
            {meetingsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse p-3 rounded-lg bg-muted">
                    <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : upcomingMeetings?.length ? (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <h4 className="font-medium text-sm">{meeting.title}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(meeting.meeting_date), "dd 'de' MMM", { locale: ptBR })}
                      {meeting.meeting_time && (
                        <>
                          <Clock className="h-3 w-3 ml-2" />
                          {meeting.meeting_time.slice(0, 5)}
                        </>
                      )}
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {meeting.location}
                      </div>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link to="/encontros">Ver todos</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg bg-muted/50">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Nenhum encontro agendado</p>
                  <p className="text-sm">Os encontros aparecerão aqui</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sistema de Pontuação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Sistema de Pontuação
          </CardTitle>
          <CardDescription>
            Acumule pontos e suba de rank participando da comunidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <RankBadge rank="iniciante" size="lg" />
              <p className="text-xs text-muted-foreground mt-2">0 - 49 pts</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <RankBadge rank="bronze" size="lg" />
              <p className="text-xs text-muted-foreground mt-2">50 - 199 pts</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <RankBadge rank="prata" size="lg" />
              <p className="text-xs text-muted-foreground mt-2">200 - 499 pts</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <RankBadge rank="ouro" size="lg" />
              <p className="text-xs text-muted-foreground mt-2">500 - 999 pts</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <RankBadge rank="diamante" size="lg" />
              <p className="text-xs text-muted-foreground mt-2">1000+ pts</p>
            </div>
          </div>
          <ScoringRulesCard compact />
        </CardContent>
      </Card>
    </div>
  );
}
