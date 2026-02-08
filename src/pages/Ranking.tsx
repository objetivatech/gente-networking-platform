import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMonthlyRanking, useAvailableMonths } from '@/hooks/useMonthlyRanking';
import { useTeams } from '@/hooks/useTeams';
import RankBadge from '@/components/RankBadge';
import ScoringRulesCard from '@/components/ScoringRulesCard';
import { Trophy, Medal, Award, Crown, Star, Calendar, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Ranking() {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  
  const { data: ranking, isLoading } = useMonthlyRanking(
    selectedTeam === 'all' ? undefined : selectedTeam,
    selectedMonth
  );
  const { teams } = useTeams();
  const { data: availableMonths } = useAvailableMonths();

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{position}</span>;
    }
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-gray-400/5 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/10 to-amber-600/5 border-amber-600/30';
      default:
        return '';
    }
  };

  const formatMonthLabel = (yearMonth: string) => {
    try {
      const date = parse(yearMonth, 'yyyy-MM', new Date());
      return format(date, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return yearMonth;
    }
  };

  const isCurrentMonth = selectedMonth === currentMonth;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Ranking
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {isCurrentMonth ? 'Ranking do mês atual' : `Ranking de ${formatMonthLabel(selectedMonth)}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar mês" />
            </SelectTrigger>
            <SelectContent>
              {(availableMonths || [currentMonth]).map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthLabel(month)}
                  {month === currentMonth && ' (atual)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os grupos</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 Destaque */}
      {!isLoading && ranking && ranking.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2nd Place */}
          <Card className="md:mt-8 border-gray-400/30 bg-gradient-to-b from-gray-400/10 to-transparent">
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <Avatar className="h-20 w-20 mx-auto border-4 border-gray-400">
                  <AvatarImage src={ranking[1]?.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {ranking[1]?.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Medal className="absolute -bottom-2 -right-2 h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-bold mt-4">{ranking[1]?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{ranking[1]?.company}</p>
              <p className="text-xs text-muted-foreground">{ranking[1]?.team_name}</p>
              <div className="mt-2 flex flex-col items-center gap-2">
                <RankBadge rank={ranking[1]?.rank} size="sm" />
                <Badge variant="secondary" className="text-lg">
                  <Star className="h-4 w-4 mr-1" />
                  {ranking[1]?.points} pts
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 1st Place */}
          <Card className="border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent shadow-lg">
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <Avatar className="h-24 w-24 mx-auto border-4 border-yellow-500">
                  <AvatarImage src={ranking[0]?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {ranking[0]?.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 h-10 w-10 text-yellow-500" />
              </div>
              <h3 className="font-bold text-lg mt-4">{ranking[0]?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{ranking[0]?.company}</p>
              <p className="text-xs text-muted-foreground">{ranking[0]?.team_name}</p>
              <div className="mt-2 flex flex-col items-center gap-2">
                <RankBadge rank={ranking[0]?.rank} size="md" />
                <Badge className="text-lg bg-yellow-500 hover:bg-yellow-600">
                  <Star className="h-4 w-4 mr-1" />
                  {ranking[0]?.points} pts
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 3rd Place */}
          <Card className="md:mt-12 border-amber-600/30 bg-gradient-to-b from-amber-600/10 to-transparent">
            <CardContent className="pt-6 text-center">
              <div className="relative inline-block">
                <Avatar className="h-16 w-16 mx-auto border-4 border-amber-600">
                  <AvatarImage src={ranking[2]?.avatar_url || undefined} />
                  <AvatarFallback>
                    {ranking[2]?.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Award className="absolute -bottom-2 -right-2 h-7 w-7 text-amber-600" />
              </div>
              <h3 className="font-bold mt-4">{ranking[2]?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{ranking[2]?.company}</p>
              <p className="text-xs text-muted-foreground">{ranking[2]?.team_name}</p>
              <div className="mt-2 flex flex-col items-center gap-2">
                <RankBadge rank={ranking[2]?.rank} size="sm" />
                <Badge variant="secondary" className="text-lg">
                  <Star className="h-4 w-4 mr-1" />
                  {ranking[2]?.points} pts
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista completa */}
      <Card>
        <CardHeader>
          <CardTitle>Classificação {isCurrentMonth ? 'Mensal' : `de ${formatMonthLabel(selectedMonth)}`}</CardTitle>
          <CardDescription>
            {ranking?.length || 0} membros no ranking
            {!isCurrentMonth && ' (histórico)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ranking?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum membro encontrado</p>
              <p className="text-sm">
                {isCurrentMonth 
                  ? 'Participe das atividades para aparecer no ranking!' 
                  : 'Nenhuma atividade registrada neste período.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranking?.map((member) => (
                <div
                  key={`${member.user_id}-${member.team_id}`}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-muted/50 ${getPositionStyle(member.position_rank)}`}
                >
                  <div className="w-8 flex justify-center">
                    {getPositionIcon(member.position_rank)}
                  </div>
                  
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.full_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="truncate">{member.company || member.member_position || 'Membro'}</span>
                      <span>•</span>
                      <span className="truncate">{member.team_name}</span>
                    </div>
                  </div>

                  <RankBadge rank={member.rank} size="sm" showLabel={false} />

                  <Badge variant="outline" className="font-bold">
                    {member.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regras de Pontuação */}
      <ScoringRulesCard />
    </div>
  );
}
