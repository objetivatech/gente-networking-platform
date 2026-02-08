import { useMonthlyPointsHistory } from '@/hooks/useMonthlyPoints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyPointsEvolutionChartProps {
  userId: string;
  teamId?: string;
}

export function MonthlyPointsEvolutionChart({ userId, teamId }: MonthlyPointsEvolutionChartProps) {
  const { data: history, isLoading } = useMonthlyPointsHistory(userId, teamId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução Mensal
          </CardTitle>
          <CardDescription>
            Acompanhe sua progressão mês a mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum histórico de pontos disponível ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by month and get highest points per month (in case of multiple teams)
  const monthlyData = history.reduce((acc: Record<string, { points: number; teams: string[] }>, entry: any) => {
    const month = entry.year_month;
    const teamName = entry.teams?.name || 'Grupo';
    
    if (!acc[month]) {
      acc[month] = { points: 0, teams: [] };
    }
    acc[month].points += entry.points;
    if (!acc[month].teams.includes(teamName)) {
      acc[month].teams.push(teamName);
    }
    return acc;
  }, {});

  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Last 12 months
    .map(([month, data]) => {
      let label = month;
      try {
        const date = parse(month, 'yyyy-MM', new Date());
        label = format(date, 'MMM/yy', { locale: ptBR });
      } catch {}
      
      return {
        month: label,
        fullMonth: month,
        pontos: data.points,
        teams: data.teams.join(', '),
      };
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      let formattedMonth = data.fullMonth;
      try {
        const date = parse(data.fullMonth, 'yyyy-MM', new Date());
        formattedMonth = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      } catch {}
      
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{formattedMonth}</p>
          <p className="text-sm text-primary font-semibold">
            {data.pontos} pontos
          </p>
          <p className="text-xs text-muted-foreground">
            {data.teams}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Evolução Mensal
        </CardTitle>
        <CardDescription>
          Sua progressão nos últimos {chartData.length} meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPontosMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="pontos"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorPontosMonthly)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
