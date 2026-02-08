import { useMonthlyPoints } from '@/hooks/useMonthlyPoints';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import RankBadge from '@/components/RankBadge';
import { Trophy, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface MonthlyPointsSummaryProps {
  userId: string;
  compact?: boolean;
}

export function MonthlyPointsSummary({ userId, compact = false }: MonthlyPointsSummaryProps) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedTeam, setSelectedTeam] = useState<string | undefined>();
  
  const { data: monthlyPoints, isLoading } = useMonthlyPoints(userId, selectedTeam, currentMonth);

  const formatMonthLabel = (yearMonth: string) => {
    try {
      const date = parse(yearMonth, 'yyyy-MM', new Date());
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return yearMonth;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!monthlyPoints || monthlyPoints.length === 0) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            Pontos do Mês
          </CardTitle>
          {!compact && (
            <CardDescription>
              {formatMonthLabel(currentMonth)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Participe das atividades para acumular pontos!
          </p>
        </CardContent>
      </Card>
    );
  }

  // If user has multiple teams, show selector
  const hasMultipleTeams = monthlyPoints.length > 1;
  const displayedPoints = selectedTeam 
    ? monthlyPoints.find(p => p.team_id === selectedTeam) 
    : monthlyPoints[0];

  // Calculate total across all teams
  const totalPoints = monthlyPoints.reduce((sum, p) => sum + p.points, 0);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Pontos do mês</p>
          <p className="text-lg font-bold text-primary">
            {hasMultipleTeams ? totalPoints : displayedPoints?.points || 0} pts
          </p>
        </div>
        {displayedPoints && <RankBadge rank={displayedPoints.rank} size="lg" />}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-primary" />
              Pontos do Mês
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatMonthLabel(currentMonth)}
            </CardDescription>
          </div>
          {hasMultipleTeams && (
            <Select value={selectedTeam || 'all'} onValueChange={(v) => setSelectedTeam(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({totalPoints} pts)</SelectItem>
                {monthlyPoints.map((mp) => (
                  <SelectItem key={mp.team_id} value={mp.team_id}>
                    {mp.team_name} ({mp.points} pts)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasMultipleTeams && !selectedTeam ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
              <div>
                <p className="text-sm text-muted-foreground">Total em todos os grupos</p>
                <p className="text-3xl font-bold text-primary">{totalPoints} pts</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/50" />
            </div>
            <div className="grid gap-2">
              {monthlyPoints.map((mp) => (
                <div key={mp.team_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={mp.rank} size="sm" showLabel={false} />
                    <span className="font-medium">{mp.team_name}</span>
                  </div>
                  <Badge variant="outline">{mp.points} pts</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {displayedPoints?.team_name || 'Grupo'}
              </p>
              <p className="text-3xl font-bold text-primary">
                {displayedPoints?.points || 0} pts
              </p>
            </div>
            {displayedPoints && <RankBadge rank={displayedPoints.rank} size="lg" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
