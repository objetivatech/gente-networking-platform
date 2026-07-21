/**
 * AdminCrm - Kanban do CRM de leads unificado (v3.24.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Página admin-only. Permite visualizar leads vindos de LPs, convites manuais
 * e API em um Kanban de 5 colunas com filtros e movimentação por select.
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmin } from '@/hooks/useAdmin';
import { useTeams } from '@/hooks/useTeams';
import {
  useCrmLeads,
  useUpdateCrmLeadStatus,
  useMigrateExistingGuests,
  CRM_STATUS_LABEL,
  CRM_STATUS_ORDER,
  CRM_SOURCE_LABEL,
  type CrmLeadStatus,
  type CrmLeadSource,
  type CrmLead,
} from '@/hooks/useCrmLeads';
import { KanbanSquare, Search, RefreshCcw, Crown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS: Record<CrmLeadStatus, string> = {
  novo: 'bg-slate-500',
  em_qualificacao: 'bg-blue-500',
  qualificado: 'bg-amber-500',
  fechado: 'bg-emerald-600',
  perdido: 'bg-rose-500',
};

const SOURCE_COLORS: Record<CrmLeadSource, string> = {
  lp_gentehub: 'bg-primary/90 text-primary-foreground',
  lp_participe: 'bg-sky-600 text-white',
  lp_networking: 'bg-indigo-600 text-white',
  site_elementor: 'bg-zinc-600 text-white',
  convite_manual: 'bg-muted text-foreground',
  api: 'bg-muted text-foreground',
};

export default function AdminCrm() {
  const { isAdmin, isLoading: loadingRole } = useAdmin();
  const { teams } = useTeams();
  const { data: leads, isLoading } = useCrmLeads();
  const updateStatus = useUpdateCrmLeadStatus();
  const backfill = useMigrateExistingGuests();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  if (!loadingRole && !isAdmin) return <Navigate to="/" replace />;

  const teamMap = useMemo(() => {
    const m = new Map<string, string>();
    (teams ?? []).forEach((t) => m.set(t.id, t.name));
    return m;
  }, [teams]);

  const filtered = useMemo(() => {
    return (leads ?? []).filter((l) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !l.name.toLowerCase().includes(s) &&
          !l.email.toLowerCase().includes(s) &&
          !(l.company ?? '').toLowerCase().includes(s)
        )
          return false;
      }
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (teamFilter !== 'all' && l.target_team_id !== teamFilter) return false;
      return true;
    });
  }, [leads, search, sourceFilter, teamFilter]);

  const byStatus = useMemo(() => {
    const map = new Map<CrmLeadStatus, CrmLead[]>();
    CRM_STATUS_ORDER.forEach((s) => map.set(s, []));
    filtered.forEach((l) => map.get(l.status)?.push(l));
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 min-w-0">
            <KanbanSquare className="h-7 w-7 text-primary shrink-0" />
            <span className="text-wrap-anywhere">CRM de Leads</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Funil unificado de leads: LPs, site externo, convites manuais e API.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => backfill.mutate()}
          disabled={backfill.isPending}
          className="gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${backfill.isPending ? 'animate-spin' : ''}`} />
          Sincronizar convidados existentes
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {(Object.keys(CRM_SOURCE_LABEL) as CrmLeadSource[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {CRM_SOURCE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {(teams ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando leads...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {CRM_STATUS_ORDER.map((status) => {
            const items = byStatus.get(status) ?? [];
            return (
              <Card key={status} className="min-w-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
                      <span className="truncate">{CRM_STATUS_LABEL[status]}</span>
                    </span>
                    <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Vazio</p>
                  )}
                  {items.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-md border bg-card p-3 space-y-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-wrap-anywhere leading-tight">
                            {lead.name}
                          </p>
                          <p className="text-xs text-muted-foreground text-wrap-anywhere">
                            {lead.email}
                          </p>
                          {lead.company && (
                            <p className="text-xs text-muted-foreground text-wrap-anywhere">
                              {lead.company}
                            </p>
                          )}
                        </div>
                        {lead.profile_id && lead.status === 'fechado' && (
                          <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <Badge className={`text-[10px] ${SOURCE_COLORS[lead.source]}`}>
                          {CRM_SOURCE_LABEL[lead.source]}
                        </Badge>
                        {lead.target_team_id && (
                          <Badge variant="outline" className="text-[10px]">
                            {teamMap.get(lead.target_team_id) ?? 'Grupo'}
                          </Badge>
                        )}
                        {lead.meeting_attendance_count > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {lead.meeting_attendance_count}× presença
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                        <Select
                          value={lead.status}
                          onValueChange={(v) =>
                            updateStatus.mutate({ id: lead.id, status: v as CrmLeadStatus })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CRM_STATUS_ORDER.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                Mover: {CRM_STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
          <CardDescription className="text-xs">
            Leads entram como <strong>Novo</strong> (via LP ou API). Quando marcam presença em um
            encontro, viram <strong>Em Qualificação</strong> automaticamente. Movimentar para{' '}
            <strong>Fechado</strong> um lead com conta criada promove automaticamente para membro.
            Contratos e pagamentos serão integrados nas próximas releases (Autentique + provedor a
            definir).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
