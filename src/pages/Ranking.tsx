import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRanking } from '@/hooks/useRanking';
import { useTeams } from '@/hooks/useTeams';
import RankBadge from '@/components/RankBadge';
import { Trophy, Medal, Award, Crown, Star } from 'lucide-react';

export default function Ranking() {
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const { data: ranking, isLoading } = useRanking(selectedTeam === 'all' ? undefined : selectedTeam);
  const { teams } = useTeams();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Ranking
          </h1>
          <p className="text-muted-foreground">Membros ordenados por pontuação</p>
        </div>

        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por equipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as equipes</SelectItem>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <CardTitle>Classificação Geral</CardTitle>
          <CardDescription>
            {ranking?.length || 0} membros no ranking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                  <div className="w-6 h-6 bg-muted rounded"></div>
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : ranking?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum membro encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranking?.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors hover:bg-muted/50 ${getPositionStyle(index + 1)}`}
                >
                  <div className="w-8 flex justify-center">
                    {getPositionIcon(index + 1)}
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
                      <span className="truncate">{member.company || member.position || 'Membro'}</span>
                      {member.teamName && (
                        <>
                          <span>•</span>
                          <span className="truncate">{member.teamName}</span>
                        </>
                      )}
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
    </div>
  );
}
