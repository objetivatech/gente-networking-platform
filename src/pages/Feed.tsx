import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTeams } from '@/hooks/useTeams';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users,
  MessageSquare,
  DollarSign,
  UserPlus,
  Calendar,
  Activity,
  Handshake,
  UserCheck,
  Filter,
  Loader2,
  Lightbulb,
  UserCog,
} from 'lucide-react';

const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  gente_em_acao: { icon: Handshake, color: 'text-blue-500', label: 'Gente em Ação' },
  testimonial: { icon: MessageSquare, color: 'text-purple-500', label: 'Depoimento' },
  business_deal: { icon: DollarSign, color: 'text-green-500', label: 'Negócio' },
  referral: { icon: UserPlus, color: 'text-orange-500', label: 'Indicação' },
  attendance: { icon: Calendar, color: 'text-primary', label: 'Presença' },
  invitation: { icon: Users, color: 'text-pink-500', label: 'Convite' },
  guest_attendance: { icon: UserCheck, color: 'text-emerald-500', label: 'Convidado presente' },
  council_post: { icon: Lightbulb, color: 'text-indigo-500', label: 'Desafio no Conselho' },
  council_reply: { icon: MessageSquare, color: 'text-indigo-400', label: 'Resposta no Conselho' },
  business_case: { icon: DollarSign, color: 'text-teal-500', label: 'Case de Negócio' },
  profile_update: { icon: UserCog, color: 'text-slate-500', label: 'Atualização de Perfil' },
};

const periodOptions = [
  { value: 'all', label: 'Todo o período' },
  { value: '0', label: 'Este mês' },
  { value: '1', label: 'Mês passado' },
  { value: '2', label: 'Últimos 3 meses' },
  { value: '5', label: 'Últimos 6 meses' },
];

interface ActivityDetail {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  team_id: string | null;
  user?: { full_name: string; avatar_url: string | null };
}

export default function Feed() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('0');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedActivity, setSelectedActivity] = useState<ActivityDetail | null>(null);

  const { teams } = useTeams();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['feed-activities', periodFilter, teamFilter],
    queryFn: async () => {
      let query = supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      const now = new Date();
      if (periodFilter === '0' || periodFilter === '1') {
        const targetMonth = periodFilter === '1' ? subMonths(now, 1) : now;
        query = query
          .gte('created_at', startOfMonth(targetMonth).toISOString())
          .lte('created_at', endOfMonth(targetMonth).toISOString());
      } else if (periodFilter === '2' || periodFilter === '5') {
        const monthsBack = periodFilter === '2' ? 2 : 5;
        query = query.gte('created_at', startOfMonth(subMonths(now, monthsBack)).toISOString());
      }

      if (teamFilter !== 'all') {
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamFilter);

        if (teamMembersError) throw teamMembersError;

        const memberIds = [...new Set((teamMembers || []).map((tm) => tm.user_id))];
        if (memberIds.length === 0) return [];

        const memberIdsFilter = memberIds.map((id) => `"${id}"`).join(',');
        query = query.or(`team_id.eq.${teamFilter},and(team_id.is.null,user_id.in.(${memberIdsFilter}))`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(data?.map(a => a.user_id) || [])];
      let usersMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        usersMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { full_name: string; avatar_url: string | null }>);
      }

      return (data || []).map(activity => ({
        ...activity,
        metadata: activity.metadata as Record<string, unknown> | null,
        user: usersMap[activity.user_id] || { full_name: 'Usuário', avatar_url: null },
      })) as ActivityDetail[];
    },
  });

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter(a => {
      if (typeFilter !== 'all' && a.activity_type !== typeFilter) return false;
      return true;
    });
  }, [activities, typeFilter]);

  const activityTypes = useMemo(() => {
    if (!activities) return [];
    const types = new Set(activities.map(a => a.activity_type));
    return Array.from(types);
  }, [activities]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Feed de Atividades
        </h1>
        <p className="text-muted-foreground">Histórico completo de todas as ações da comunidade</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {activityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {activityTypeConfig[type]?.label || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {teams?.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(typeFilter !== 'all' || periodFilter !== '0' || teamFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setTypeFilter('all'); setPeriodFilter('0'); setTeamFilter('all'); }}
              >
                Limpar filtros
              </Button>
            )}

            <Badge variant="secondary" className="ml-auto">
              {filteredActivities.length} atividades
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feed List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma atividade encontrada</p>
            <p className="text-sm">Tente ajustar os filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map(activity => {
            const config = activityTypeConfig[activity.activity_type] || {
              icon: Activity, color: 'text-muted-foreground', label: activity.activity_type,
            };
            const Icon = config.icon;

            return (
              <Card
                key={activity.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedActivity(activity)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={activity.user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {activity.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedActivity && (() => {
                const config = activityTypeConfig[selectedActivity.activity_type];
                const Icon = config?.icon || Activity;
                return <Icon className={`h-5 w-5 ${config?.color || ''}`} />;
              })()}
              Detalhes da Atividade
            </DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedActivity.user?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedActivity.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedActivity.user?.full_name}</p>
                  <Badge variant="outline">
                    {activityTypeConfig[selectedActivity.activity_type]?.label || selectedActivity.activity_type}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                <p className="font-medium">{selectedActivity.title}</p>
                {selectedActivity.description && (
                  <p className="text-sm text-muted-foreground">{selectedActivity.description}</p>
                )}
                {selectedActivity.metadata && Object.keys(selectedActivity.metadata).length > 0 && (
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Dados adicionais:</p>
                    {Object.entries(selectedActivity.metadata).map(([key, value]) => (
                      <p key={key} className="text-xs text-muted-foreground">
                        <span className="font-medium capitalize">{key}:</span> {String(value)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(selectedActivity.created_at), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
