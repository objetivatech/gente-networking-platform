import { useState } from 'react';
import { useStats, useCommunityStats, useAdminGlobalStats } from '@/hooks/useStats';
import { useAdmin } from '@/hooks/useAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { Loader2, BarChart3, TrendingUp, Users, DollarSign, MessageSquare, Handshake, Send, Calendar, MessageCircle, Lightbulb, Briefcase, Award } from 'lucide-react';
import { RankBadge } from '@/components/RankBadge';

const RANK_COLORS = { iniciante: '#9ca3af', bronze: '#d97706', prata: '#6b7280', ouro: '#eab308', diamante: '#0ea5e9' };

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

// ─── Personal Stats Cards ────────────────────────────────────
function StatsCards({ stats }: { stats: any }) {
  const cards = [
    { icon: Handshake, label: 'Gente em Ação', value: stats?.genteEmAcao.total || 0, sub: `${stats?.genteEmAcao.withMembers || 0} membros · ${stats?.genteEmAcao.withGuests || 0} convidados`, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { icon: MessageSquare, label: 'Depoimentos', value: `${stats?.testimonials.sent || 0} / ${stats?.testimonials.received || 0}`, sub: 'Enviados / Recebidos', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { icon: DollarSign, label: 'Negócios', value: formatCurrency(stats?.businessDeals.value || 0), sub: `${stats?.businessDeals.total || 0} fechados`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { icon: Send, label: 'Indicações', value: `${stats?.referrals.sent || 0} / ${stats?.referrals.received || 0}`, sub: 'Enviadas / Recebidas', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { icon: Calendar, label: 'Presenças', value: stats?.attendances || 0, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { icon: Lightbulb, label: 'Conselho 24/7', value: stats?.councilReplies || 0, sub: 'Respostas dadas', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { icon: Briefcase, label: 'Cases', value: stats?.businessCases || 0, sub: 'Registrados', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-3">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            {stat.sub && <p className="text-[10px] text-muted-foreground">{stat.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Monthly Evolution Chart ─────────────────────────────────
function MonthlyChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-primary" />
          Evolução Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
              <Legend />
              <Area type="monotone" dataKey="genteEmAcao" name="Gente em Ação" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="testimonials" name="Depoimentos" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
              <Area type="monotone" dataKey="negocios" name="Negócios" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
              <Area type="monotone" dataKey="indicacoes" name="Indicações" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Area type="monotone" dataKey="conselho" name="Conselho" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
              <Area type="monotone" dataKey="cases" name="Cases" stackId="1" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail Pie/Bar Charts ───────────────────────────────────
function DetailCharts({ stats }: { stats: any }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Gente em Ação</CardTitle><CardDescription>Reuniões por tipo</CardDescription></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: 'Membros', value: stats?.genteEmAcao.withMembers || 0 }, { name: 'Convidados', value: stats?.genteEmAcao.withGuests || 0 }]} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="hsl(var(--primary))" /><Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Negócios</CardTitle><CardDescription>Fechados vs Indicações recebidas</CardDescription></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Meus Negócios', valor: stats?.businessDeals.value || 0 }, { name: 'Indicações', valor: stats?.businessDeals.referredValue || 0 }]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Bar dataKey="valor" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Community Tab ───────────────────────────────────────────
function CommunityTab() {
  const [teamId, setTeamId] = useState<string>('all');
  const { data: communityStats, isLoading } = useCommunityStats(teamId === 'all' ? undefined : teamId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const stats = communityStats;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {stats.teams?.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { icon: Users, label: 'Membros', value: stats.totalMembers, color: 'text-primary', bg: 'bg-primary/10' },
          { icon: Handshake, label: 'Gente em Ação', value: stats.totalGenteEmAcao, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: DollarSign, label: 'Negócios', value: `${stats.totalDeals} (${formatCurrency(stats.totalDealsValue)})`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { icon: Send, label: 'Indicações', value: stats.totalReferrals, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { icon: MessageSquare, label: 'Depoimentos', value: stats.totalTestimonials, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { icon: Lightbulb, label: 'Conselho 24/7', value: stats.totalCouncilReplies, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { icon: Briefcase, label: 'Cases', value: stats.totalBusinessCases, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
          { icon: Calendar, label: 'Presenças', value: stats.totalAttendances, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Breakdown Chart */}
      {stats.monthlyBreakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Evolução Mensal da Comunidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="genteEmAcao" name="Gente em Ação" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="negocios" name="Negócios" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="indicacoesDadas" name="Indicações" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="depoimentos" name="Depoimentos" fill="#a855f7" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="conselho" name="Conselho" fill="#6366f1" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cases" name="Cases" fill="#14b8a6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rank Distribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">Distribuição de Rankings</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.rankDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.rankDistribution?.map((entry: any, i: number) => (
                    <Cell key={i} fill={RANK_COLORS[entry.name as keyof typeof RANK_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-team breakdown (only when showing all) */}
      {teamId === 'all' && stats.perTeam && stats.perTeam.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Comparativo por Grupo</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-center">Membros</TableHead>
                  <TableHead className="text-center">Gente em Ação</TableHead>
                  <TableHead className="text-center">Negócios</TableHead>
                  <TableHead className="text-center">R$ Negócios</TableHead>
                  <TableHead className="text-center">Indicações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.perTeam.map((team: any) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || 'hsl(var(--primary))' }} />
                        <span className="font-medium">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{team.memberCount}</TableCell>
                    <TableCell className="text-center">{team.genteEmAcao}</TableCell>
                    <TableCell className="text-center">{team.negocios}</TableCell>
                    <TableCell className="text-center">{formatCurrency(team.valorNegocios)}</TableCell>
                    <TableCell className="text-center">{team.indicacoes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Admin Global Report Tab ─────────────────────────────────
function AdminGlobalTab() {
  const { data, isLoading } = useAdminGlobalStats();
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data) return null;

  let users = data.userSummaries;
  if (teamFilter !== 'all') {
    const teamName = data.teams.find((t: any) => t.id === teamFilter)?.name;
    users = users.filter(u => u.teams.includes(teamName || ''));
  }
  if (search) {
    const q = search.toLowerCase();
    users = users.filter(u => u.full_name.toLowerCase().includes(q) || (u.company || '').toLowerCase().includes(q));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {data.teams.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="text"
          placeholder="Buscar membro..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex h-10 w-full sm:w-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Badge variant="secondary" className="self-center">{users.length} membros</Badge>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Membro</TableHead>
                <TableHead className="text-center">Pts</TableHead>
                <TableHead className="text-center">Rank</TableHead>
                <TableHead className="text-center" title="Gente em Ação">GA</TableHead>
                <TableHead className="text-center" title="Negócios">Neg</TableHead>
                <TableHead className="text-center" title="R$ Negócios">R$</TableHead>
                <TableHead className="text-center" title="Indicações Dadas">Ind↑</TableHead>
                <TableHead className="text-center" title="Indicações Recebidas">Ind↓</TableHead>
                <TableHead className="text-center" title="Depoimentos Dados">Dep↑</TableHead>
                <TableHead className="text-center" title="Depoimentos Recebidos">Dep↓</TableHead>
                <TableHead className="text-center" title="Conselho 24/7">Con</TableHead>
                <TableHead className="text-center" title="Cases">Cas</TableHead>
                <TableHead className="text-center" title="Presenças">Pres</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={u.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">{u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name}</p>
                        {u.teams.length > 0 && <p className="text-[10px] text-muted-foreground truncate">{u.teams.join(', ')}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold">{u.points}</TableCell>
                  <TableCell className="text-center"><RankBadge rank={u.rank || 'iniciante'} size="sm" /></TableCell>
                  <TableCell className="text-center">{u.genteEmAcao}</TableCell>
                  <TableCell className="text-center">{u.negocios}</TableCell>
                  <TableCell className="text-center text-xs">{formatCurrency(u.valorNegocios)}</TableCell>
                  <TableCell className="text-center">{u.indicacoesDadas}</TableCell>
                  <TableCell className="text-center">{u.indicacoesRecebidas}</TableCell>
                  <TableCell className="text-center">{u.depoimentosDados}</TableCell>
                  <TableCell className="text-center">{u.depoimentosRecebidos}</TableCell>
                  <TableCell className="text-center">{u.conselhoRespostas}</TableCell>
                  <TableCell className="text-center">{u.cases}</TableCell>
                  <TableCell className="text-center">{u.presencas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function Estatisticas() {
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const { isAdmin, isLoading: loadingRole } = useAdmin();
  const { data: stats, isLoading } = useStats(period);

  if (isLoading || loadingRole) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Estatísticas
          </h1>
          <p className="text-muted-foreground">Relatórios e métricas de performance</p>
        </div>
        {!isAdmin && (
          <Select value={period} onValueChange={(v) => setPeriod(v as 'month' | 'year')}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue={isAdmin ? 'global' : 'my'} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {isAdmin ? (
            <>
              <TabsTrigger value="global">Relatório Global</TabsTrigger>
              <TabsTrigger value="community">Comunidade</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="my">Minhas Estatísticas</TabsTrigger>
              <TabsTrigger value="community">Comunidade</TabsTrigger>
            </>
          )}
        </TabsList>

        {isAdmin ? (
          <TabsContent value="global" className="mt-6">
            <AdminGlobalTab />
          </TabsContent>
        ) : (
          <TabsContent value="my" className="mt-6 space-y-6">
            <StatsCards stats={stats} />
            <MonthlyChart data={stats?.monthlyData || []} />
            <DetailCharts stats={stats} />
          </TabsContent>
        )}

        <TabsContent value="community" className="mt-6">
          <CommunityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
