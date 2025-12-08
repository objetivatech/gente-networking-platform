import { usePointsHistory } from '@/hooks/usePointsHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface PointsEvolutionChartProps {
  userId: string;
}

export function PointsEvolutionChart({ userId }: PointsEvolutionChartProps) {
  const { history, isLoading } = usePointsHistory(userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução de Pontos
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
            Evolução de Pontos
          </CardTitle>
          <CardDescription>
            Visualize sua progressão ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum dado de evolução disponível ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Reverse to show oldest first and format data for chart
  const chartData = [...history]
    .reverse()
    .map((entry) => ({
      date: format(new Date(entry.created_at), 'dd/MM', { locale: ptBR }),
      fullDate: format(new Date(entry.created_at), "dd 'de' MMM", { locale: ptBR }),
      pontos: entry.points_after,
      variacao: entry.points_change,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.fullDate}</p>
          <p className="text-sm text-primary font-semibold">
            {data.pontos} pontos
          </p>
          <p className={`text-xs ${data.variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.variacao >= 0 ? '+' : ''}{data.variacao} pts
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
          Evolução de Pontos
        </CardTitle>
        <CardDescription>
          Sua progressão nas últimas {chartData.length} atividades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPontos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
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
                fill="url(#colorPontos)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
