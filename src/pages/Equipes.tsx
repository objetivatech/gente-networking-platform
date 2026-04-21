/**
 * Equipes (Grupos) - Visão geral de cada grupo com seções separadas
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Cada grupo é renderizado em 3 seções rigorosamente separadas:
 * 1. Facilitadores (is_facilitator = true)
 * 2. Membros (role = 'membro' / 'admin' que não são facilitadores)
 * 3. Convidados (role = 'convidado')
 *
 * Convidados NUNCA aparecem misturados com membros — eles têm card próprio,
 * fundo distinto e badge obrigatório.
 */

import { useTeams } from '@/hooks/useTeams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import RankBadge from '@/components/RankBadge';
import { Loader2, Users, Crown, UserCheck, Ticket } from 'lucide-react';

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

  // Totais para o card de estatísticas
  const totalMembers = teams?.reduce(
    (sum, t) => sum + (t.members?.filter(m => m.member_type === 'member').length || 0), 0
  ) || 0;
  const totalFacilitators = teams?.reduce(
    (sum, t) => sum + (t.members?.filter(m => m.member_type === 'facilitator').length || 0), 0
  ) || 0;
  const totalGuests = teams?.reduce(
    (sum, t) => sum + (t.members?.filter(m => m.member_type === 'guest').length || 0), 0
  ) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Grupos
        </h1>
        <p className="text-muted-foreground">Grupos e participantes da comunidade</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{teams?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Grupos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{totalMembers}</p>
            <p className="text-sm text-muted-foreground">Membros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{totalFacilitators}</p>
            <p className="text-sm text-muted-foreground">Facilitadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{totalGuests}</p>
            <p className="text-sm text-muted-foreground">Convidados</p>
          </CardContent>
        </Card>
      </div>

      {!teams?.length ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum grupo cadastrado</p>
              <p className="text-sm">Os grupos aparecerão aqui quando forem criados</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const facilitators = team.members?.filter(m => m.member_type === 'facilitator') || [];
            const members = team.members?.filter(m => m.member_type === 'member') || [];
            const guests = team.members?.filter(m => m.member_type === 'guest') || [];

            return (
              <Card key={team.id} className="overflow-hidden">
                <div
                  className="h-2"
                  style={{ backgroundColor: team.color || 'hsl(var(--primary))' }}
                />
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" style={{ color: team.color }} />
                      {team.name}
                    </CardTitle>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="secondary">{members.length} membros</Badge>
                      {guests.length > 0 && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          {guests.length} convidados
                        </Badge>
                      )}
                    </div>
                  </div>
                  {team.description && <CardDescription>{team.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 1. Facilitadores */}
                  {facilitators.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Crown className="w-4 h-4 text-amber-500" /> Facilitadores ({facilitators.length})
                      </h4>
                      <div className="space-y-2">
                        {facilitators.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
                          >
                            <Avatar className="h-8 w-8 border-2 border-amber-300">
                              <AvatarImage src={member.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.profile?.full_name || '?')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {member.profile?.full_name}
                              </p>
                              {member.profile?.company && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.profile.company}
                                </p>
                              )}
                            </div>
                            {member.profile?.rank && (
                              <RankBadge rank={member.profile.rank} size="sm" showLabel={false} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Membros (apenas role = 'membro' / 'admin' não-facilitadores) */}
                  {members.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <UserCheck className="w-4 h-4 text-blue-500" /> Membros ({members.length})
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(member.profile?.full_name || '?')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {member.profile?.full_name}
                              </p>
                              {member.profile?.company && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.profile.company}
                                </p>
                              )}
                            </div>
                            {member.profile?.rank && (
                              <RankBadge rank={member.profile.rank} size="sm" showLabel={false} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Convidados (role = 'convidado') — SEÇÃO SEPARADA */}
                  {guests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Ticket className="w-4 h-4 text-orange-500" /> Convidados ({guests.length})
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {guests.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900"
                          >
                            <Avatar className="h-8 w-8 border border-orange-300">
                              <AvatarImage src={member.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                {getInitials(member.profile?.full_name || '?')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">
                                  {member.profile?.full_name}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-orange-400 text-orange-700 px-1.5 py-0"
                                >
                                  Convidado
                                </Badge>
                              </div>
                              {member.profile?.company && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.profile.company}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!team.members?.length && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nenhum participante neste grupo
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
