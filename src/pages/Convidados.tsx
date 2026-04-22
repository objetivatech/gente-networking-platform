/**
 * Convidados - Diretório público de convidados da comunidade
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * @route /convidados
 * @access Membros, Facilitadores e Admins (convidados são bloqueados)
 */

import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useGuestsDirectory, GuestJourneyStatus } from '@/hooks/useGuestsDirectory';
import { useAdmin } from '@/hooks/useAdmin';
import { useTeams } from '@/hooks/useTeams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Ticket, Search, Building2, Users, CalendarCheck, Clock, ArrowUpCircle, Settings, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';

const STATUS_LABELS: Record<GuestJourneyStatus, { label: string; variant: 'secondary' | 'default' | 'outline'; icon: any; color: string }> = {
  awaiting_first: { label: 'Aguardando primeiro encontro', variant: 'outline', icon: Clock, color: 'text-muted-foreground' },
  attended: { label: 'Já participou', variant: 'secondary', icon: CalendarCheck, color: 'text-amber-700' },
  promoted: { label: 'Promovido a membro', variant: 'default', icon: ArrowUpCircle, color: 'text-emerald-700' },
};

export default function Convidados() {
  const { isGuest, canManage, isLoading: roleLoading } = useAdmin();
  const { data: guests, isLoading } = useGuestsDirectory();
  const { teams } = useTeams();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPromoted, setShowPromoted] = useState(false);

  const filtered = useMemo(() => {
    if (!guests) return [];
    return guests.filter(g => {
      if (!showPromoted && g.status === 'promoted') return false;
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (teamFilter !== 'all' && g.team_id !== teamFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const match =
          g.full_name.toLowerCase().includes(s) ||
          g.company?.toLowerCase().includes(s) ||
          g.email?.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [guests, showPromoted, statusFilter, teamFilter, search]);

  const counts = useMemo(() => {
    const c = { awaiting_first: 0, attended: 0, promoted: 0 };
    guests?.forEach(g => { c[g.status]++; });
    return c;
  }, [guests]);

  const grouped = useMemo(() => {
    const byStatus: Record<GuestJourneyStatus, typeof filtered> = {
      awaiting_first: [],
      attended: [],
      promoted: [],
    };
    filtered.forEach(g => byStatus[g.status].push(g));
    return byStatus;
  }, [filtered]);

  // Convidados não acessam esta página — redireciona após os hooks
  if (!roleLoading && isGuest) return <Navigate to="/" replace />;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            Convidados
          </h1>
          <p className="text-muted-foreground">
            Base de leads que passaram pela comunidade Gente Networking
          </p>
        </div>
        {canManage && (
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/pessoas">
              <Settings className="w-4 h-4 mr-2" />
              Gerenciar convidados
            </Link>
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{guests?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-muted-foreground">{counts.awaiting_first}</p>
            <p className="text-sm text-muted-foreground">Aguardando</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{counts.attended}</p>
            <p className="text-sm text-muted-foreground">Já participaram</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{counts.promoted}</p>
            <p className="text-sm text-muted-foreground">Promovidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nome, empresa, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {teams?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="awaiting_first">Aguardando primeiro encontro</SelectItem>
                <SelectItem value="attended">Já participou</SelectItem>
                <SelectItem value="promoted">Promovido a membro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showPromoted}
              onChange={(e) => setShowPromoted(e.target.checked)}
              className="rounded border-input"
            />
            Mostrar convidados já promovidos a membros
          </label>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum convidado encontrado</p>
            <p className="text-sm">Ajuste os filtros ou aguarde novos convites serem aceitos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(['awaiting_first', 'attended', 'promoted'] as GuestJourneyStatus[]).map(status => {
            const items = grouped[status];
            if (!items.length) return null;
            const meta = STATUS_LABELS[status];
            const StatusIcon = meta.icon;
            return (
              <section key={status}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <StatusIcon className={`w-5 h-5 ${meta.color}`} />
                  {meta.label}
                  <Badge variant="secondary">{items.length}</Badge>
                </h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map(g => (
                    <Card key={g.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={g.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(g.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{g.full_name}</CardTitle>
                            {g.company && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                <Building2 className="w-3 h-3 shrink-0" />
                                {g.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {g.team_name && (
                          <Badge
                            variant="outline"
                            style={{ borderColor: g.team_color || undefined, color: g.team_color || undefined }}
                          >
                            <Users className="w-3 h-3 mr-1" />
                            {g.team_name}
                          </Badge>
                        )}
                        {g.business_segment && (
                          <Badge variant="secondary" className="text-xs">{g.business_segment}</Badge>
                        )}
                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                          {g.invited_by_name && (
                            <p>Convidado por <span className="font-medium text-foreground">{g.invited_by_name}</span></p>
                          )}
                          {g.invited_at && (
                            <p>
                              {format(parseLocalDate(g.invited_at.slice(0, 10)), "dd 'de' MMM yyyy", { locale: ptBR })}
                            </p>
                          )}
                          <p>{g.attendance_count} {g.attendance_count === 1 ? 'encontro' : 'encontros'}</p>
                          {g.status === 'promoted' && g.current_role && (
                            <Badge variant="default" className="bg-emerald-600">
                              Agora é {g.current_role}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2">
                          {g.slug ? (
                            <Link
                              to={`/membro/${g.slug}`}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Ver perfil <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : <span />}
                          {canManage && (
                            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              <Link to="/admin/pessoas">
                                <Settings className="w-3 h-3 mr-1" />
                                Gerenciar
                              </Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
