import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useRealtimeActivity } from '@/hooks/useRealtimeActivity';
import { useUserRole } from '@/hooks/useAdmin';
import { Navigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeams } from '@/hooks/useTeams';
import RankBadge from '@/components/RankBadge';
import { 
  Users, 
  DollarSign, 
  MessageSquare, 
  Send, 
  Handshake, 
  Trophy,
  TrendingUp,
  Activity,
  BarChart3,
  Loader2,
  Zap,
  UserPlus,
  UserCheck,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#22c55e', '#f59e0b', '#6b7280', '#f97316', '#8b5cf6'];

export default function AdminDashboard() {
  const { data: userRole, isLoading: loadingRole } = useUserRole();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const teamIdParam = selectedTeamId === 'all' ? undefined : selectedTeamId;
  const { 
    stats, 
    loadingStats, 
    rankDistribution, 
    monthlyActivity, 
    topMembers, 
    recentActivity,
    loadingActivity,
    invitationMetrics,
    attendanceKpis,
    teamKpis,
  } = useAdminDashboard(teamIdParam);
  
  const { teams } = useTeams();
  
  // Enable realtime for activity feed
  useRealtimeActivity();

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole !== 'admin' && userRole !== 'facilitador') {
    return <Navigate to="/" replace />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getInitials = (name: string) => 
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'gente_em_acao': return <Handshake className="h-4 w-4 text-green-500" />;
      case 'testimonial': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'referral': return <Send className="h-4 w-4 text-purple-500" />;
      case 'business_deal': return <DollarSign className="h-4 w-4 text-amber-500" />;
      case 'attendance': return <Users className="h-4 w-4 text-cyan-500" />;
      case 'invitation': return <UserPlus className="h-4 w-4 text-pink-500" />;
      case 'guest_attendance': return <UserCheck className="h-4 w-4 text-emerald-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">Visão geral da comunidade</p>
        </div>
        <Badge variant="outline" className="ml-auto flex items-center gap-1">
          <Zap className="h-3 w-3 text-green-500" />
          Realtime
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground">
              em {stats?.totalTeams || 0} grupos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócios Realizados</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalBusinessValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.annualBusinessValue || 0)} no ano
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gente em Ação</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGenteEmAcao || 0}</div>
            <p className="text-xs text-muted-foreground">reuniões registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interações</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.totalTestimonials || 0) + (stats?.totalReferrals || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalTestimonials || 0} depoimentos, {stats?.totalReferrals || 0} indicações
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites</CardTitle>
            <UserPlus className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats?.acceptedInvitations || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {stats?.totalInvitations || 0} enviados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Monthly Activity Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Atividades por Mês</CardTitle>
            <CardDescription>Evolução dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="genteEmAcao" name="Gente em Ação" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="depoimentos" name="Depoimentos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="indicacoes" name="Indicações" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rank Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Rank</CardTitle>
            <CardDescription>Níveis dos membros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rankDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(rankDistribution || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance KPIs */}
      {attendanceKpis && attendanceKpis.byMeeting?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              % de Presença por Encontro
            </CardTitle>
            <CardDescription>
              Presença geral: <span className="font-bold text-foreground">{attendanceKpis.overall}%</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceKpis.byMeeting.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(m.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{m.percentage}%</span>
                    <Badge variant="outline" className="text-xs">{m.attendees}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs por Grupo */}
      {teamKpis && teamKpis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              KPIs por Grupo
            </CardTitle>
            <CardDescription>Métricas acumuladas de cada grupo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Grupo</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Membros</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Gente em Ação</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Indicações</th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground">Depoimentos</th>
                    <th className="text-right py-2 pl-2 font-medium text-muted-foreground">Negócios (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {teamKpis.map((team: any) => (
                    <tr key={team.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || 'hsl(var(--primary))' }} />
                          <span className="font-medium">{team.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">{team.memberCount}</td>
                      <td className="text-center py-2 px-2">{team.genteEmAcao}</td>
                      <td className="text-center py-2 px-2">{team.referrals}</td>
                      <td className="text-center py-2 px-2">{team.testimonials}</td>
                      <td className="text-right py-2 pl-2">{formatCurrency(team.businessValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-secondary" />
            Métricas de Convites por Membro
          </CardTitle>
          <CardDescription>Quantos convidados cada membro trouxe e quantos compareceram aos encontros</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {invitationMetrics?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum convite registrado ainda</p>
              )}
              {invitationMetrics?.map((metric) => (
                <div key={metric.userId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={metric.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {metric.profile?.full_name ? getInitials(metric.profile.full_name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{metric.profile?.full_name || 'Usuário'}</p>
                    {metric.profile?.company && (
                      <p className="text-sm text-muted-foreground truncate">{metric.profile.company}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Send className="h-3 w-3" />
                        <span className="font-medium">{metric.invited}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">enviados</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-green-600">
                        <UserCheck className="h-3 w-3" />
                        <span className="font-medium">{metric.accepted}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">aceitos</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-secondary">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">{metric.attendedMeeting}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">nos encontros</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top 10 Membros
            </CardTitle>
            <CardDescription>Ranking por pontuação</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {topMembers?.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}º
                    </span>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.full_name}</p>
                      {member.company && (
                        <p className="text-sm text-muted-foreground truncate">{member.company}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <RankBadge rank={member.rank || 'iniciante'} />
                      <p className="text-sm font-medium text-muted-foreground mt-1">
                        {member.points || 0} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atividades Recentes
              <Badge variant="outline" className="ml-2 text-xs">
                <Zap className="h-2 w-2 mr-1 text-green-500" />
                Live
              </Badge>
            </CardTitle>
            <CardDescription>Últimas ações na comunidade</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recentActivity?.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      {getActivityIcon(activity.activity_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
