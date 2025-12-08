import { usePointsHistory } from '@/hooks/usePointsHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RankBadge from '@/components/RankBadge';

interface PointsHistoryCardProps {
  userId: string;
}

export function PointsHistoryCard({ userId }: PointsHistoryCardProps) {
  const { history, isLoading } = usePointsHistory(userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Pontos
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
            <History className="w-5 h-5" />
            Histórico de Pontos
          </CardTitle>
          <CardDescription>
            Acompanhe a evolução da sua pontuação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma alteração de pontos registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Histórico de Pontos
        </CardTitle>
        <CardDescription>
          Últimas {history.length} alterações de pontuação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                {getChangeIcon(entry.points_change)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getChangeColor(entry.points_change)}`}>
                      {entry.points_change > 0 ? '+' : ''}{entry.points_change} pts
                    </span>
                    {entry.rank_before !== entry.rank_after && entry.rank_after && (
                      <Badge variant="outline" className="text-xs">
                        Novo rank!
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.points_before} → {entry.points_after} pontos
                  </p>
                </div>
              </div>
              <div className="text-right">
                {entry.rank_after && (
                  <RankBadge rank={entry.rank_after as any} size="sm" />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(entry.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
