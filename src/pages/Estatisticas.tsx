import { useState } from 'react';
import { useStats, useCommunityStats } from '@/hooks/useStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { Loader2, BarChart3, TrendingUp, Users, DollarSign, MessageSquare, Handshake, Send, Calendar, MessageCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RANK_COLORS = { iniciante: '#9ca3af', bronze: '#d97706', prata: '#6b7280', ouro: '#eab308', diamante: '#0ea5e9' };

function StatsCards({ stats, formatCurrency }: { stats: any; formatCurrency: (v: number) => string }) {
  const cards = [
    { icon: Handshake, label: 'Gente em Ação', value: stats?.genteEmAcao.total || 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { icon: MessageSquare, label: 'Depoimentos', value: `${stats?.testimonials.sent || 0} / ${stats?.testimonials.received || 0}`, sub: 'Enviados / Recebidos', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { icon: DollarSign, label: 'Meus Negócios', value: formatCurrency(stats?.businessDeals.value || 0), sub: `${stats?.businessDeals.total || 0} fechados`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { icon: Send, label: 'Indicações', value: `${stats?.referrals.sent || 0} / ${stats?.referrals.received || 0}`, sub: 'Enviadas / Recebidas', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { icon: Calendar, label: 'Presenças', value: stats?.attendances || 0, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            {stat.sub && <p className="text-xs text-muted-foreground">{stat.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MonthlyChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Evolução Mensal
        </CardTitle>
        <CardDescription>Suas atividades nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
              <Legend />
              <Area type="monotone" dataKey="genteEmAcao" name="Gente em Ação" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="testimonials" name="Depoimentos" stackId="1" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="negocios" name="Negócios" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
              <Area type="monotone" dataKey="indicacoes" name="Indicações" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailCharts({ stats, formatCurrency }: { stats: any; formatCurrency: (v: number) => string }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gente em Ação</CardTitle>
          <CardDescription>Reuniões por tipo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Com Membros', value: stats?.genteEmAcao.withMembers || 0 },
                    { name: 'Com Convidados', value: stats?.genteEmAcao.withGuests || 0 },
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Negócios</CardTitle>
          <CardDescription>Fechados vs Indicações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Meus Negócios', valor: stats?.businessDeals.value || 0 },
                { name: 'Minhas Indicações', valor: stats?.businessDeals.referredValue || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `R$${v / 1000}k`} />
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

function CommunityTab({ communityStats, formatCurrency }: { communityStats: any; formatCurrency: (v: number) => string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{communityStats?.totalMembers}</p>
            <p className="text-sm text-muted-foreground">Membros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold">{communityStats?.totalTeams}</p>
            <p className="text-sm text-muted-foreground">Grupos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(communityStats?.totalDealsValue || 0)}</p>
            <p className="text-sm text-green-600/80">Em Negócios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Handshake className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="text-3xl font-bold">{communityStats?.totalGenteEmAcao}</p>
            <p className="text-sm text-muted-foreground">Gente em Ação</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Classificação</CardTitle>
          <CardDescription>Membros por nível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={communityStats?.rankDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {communityStats?.rankDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={RANK_COLORS[entry.name as keyof typeof RANK_COLORS]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Estatisticas() {
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const { data: stats, isLoading } = useStats(period);
  const { data: communityStats, isLoading: loadingCommunity } = useCommunityStats();

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

  if (isLoading || loadingCommunity) {
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
        <Select value={period} onValueChange={(v) => setPeriod(v as 'month' | 'year')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="my" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my">Minhas Estatísticas</TabsTrigger>
          <TabsTrigger value="community">Comunidade</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-6 space-y-6">
          <StatsCards stats={stats} formatCurrency={formatCurrency} />
          <MonthlyChart data={stats?.monthlyData || []} />
          <DetailCharts stats={stats} formatCurrency={formatCurrency} />
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <CommunityTab communityStats={communityStats} formatCurrency={formatCurrency} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
