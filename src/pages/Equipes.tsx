import { useTeams } from '@/hooks/useTeams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import RankBadge from '@/components/RankBadge';
import { Loader2, Users, Crown, UserCheck } from 'lucide-react';

export default function Equipes() {
  const { teams, isLoading } = useTeams();

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Equipes
        </h1>
        <p className="text-muted-foreground">Grupos e membros da comunidade</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{teams?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Equipes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {teams?.reduce((sum, t) => sum + (t.members?.length || 0), 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total de Membros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                {teams?.reduce((sum, t) => sum + (t.members?.filter(m => m.is_facilitator).length || 0), 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Facilitadores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Equipes */}
      {!teams?.length ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhuma equipe cadastrada</p>
              <p className="text-sm">As equipes aparecerão aqui quando forem criadas</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const facilitators = team.members?.filter((m) => m.is_facilitator) || [];
            const members = team.members?.filter((m) => !m.is_facilitator) || [];

            return (
              <Card key={team.id} className="overflow-hidden">
                <div
                  className="h-2"
                  style={{ backgroundColor: team.color || 'hsl(var(--primary))' }}
                />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" style={{ color: team.color }} />
                      {team.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {team.members?.length || 0} membros
                    </Badge>
                  </div>
                  {team.description && (
                    <CardDescription>{team.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Facilitadores */}
                  {facilitators.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Crown className="w-4 h-4 text-amber-500" /> Facilitadores
                      </h4>
                      <div className="space-y-2">
                        {facilitators.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                          >
                            <Avatar className="h-8 w-8 border-2 border-amber-300">
                              <AvatarImage src={member.profile.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.profile.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {member.profile.full_name}
                              </p>
                              {member.profile.company && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.profile.company}
                                </p>
                              )}
                            </div>
                            <RankBadge rank={member.profile.rank} size="sm" showLabel={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Membros */}
                  {members.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <UserCheck className="w-4 h-4" /> Membros
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {members.map((member) => {
                          const isGuest = member.role === 'convidado';
                          return (
                            <div
                              key={member.id}
                              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                                isGuest 
                                  ? 'bg-secondary/10 border border-secondary/20' 
                                  : 'bg-muted/50 hover:bg-muted'
                              }`}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.profile.avatar_url || ''} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(member.profile.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">
                                    {member.profile.full_name}
                                  </p>
                                  {isGuest && (
                                    <Badge variant="outline" className="text-xs text-secondary border-secondary">
                                      Convidado
                                    </Badge>
                                  )}
                                </div>
                                {member.profile.company && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {member.profile.company}
                                  </p>
                                )}
                              </div>
                              <RankBadge rank={member.profile.rank} size="sm" showLabel={false} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!team.members?.length && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nenhum membro nesta equipe
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
