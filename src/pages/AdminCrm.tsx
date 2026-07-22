/**
 * AdminCrm - Kanban do CRM de leads unificado (v3.24.0 + v3.25.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Página admin-only. Kanban com filtros, coluna HUB Ativo, drawer de auditoria,
 * ações de contrato e promoção. Automação: leads HUB roteados por trigger,
 * cobrança e contrato disparados por gatilhos ao virar Qualificado.
 */
import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
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
import {
  KanbanSquare,
  Search,
  RefreshCcw,
  Crown,
  Sparkles,
  ScrollText,
  FileText,
  FilePen,
  FileX,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadDrawer } from '@/components/crm/LeadDrawer';

const STATUS_COLORS: Record<CrmLeadStatus, string> = {
  novo: 'bg-slate-500',
  em_qualificacao: 'bg-blue-500',
  qualificado: 'bg-amber-500',
  hub_ativo: 'bg-orange-500',
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

function ContractIcon({ status }: { status: CrmLead['contract_status'] }) {
  if (status === 'signed') return <FilePen className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === 'sent') return <FileText className="h-3.5 w-3.5 text-amber-600" />;
  if (status === 'rejected' || status === 'expired')
    return <FileX className="h-3.5 w-3.5 text-rose-600" />;
  return null;
}

export default function AdminCrm() {
  const { isAdmin, isLoading: loadingRole } = useAdmin();
  const { teams } = useTeams();
  const { data: leads, isLoading } = useCrmLeads();
  const updateStatus = useUpdateCrmLeadStatus();
  const backfill = useMigrateExistingGuests();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [onlyHub, setOnlyHub] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

  if (!loadingRole && !isAdmin) return <Navigate to="/" replace />;

  const teamMap = useMemo(() => {
    const m = new Map<string, string>();
    (teams ?? []).forEach((t) => m.set(t.id, t.name));
    return m;
  }, [teams]);

  const filtered = useMemo(() => {
    return (leads ?? []).filter((l) => {
      if (onlyHub && !l.is_hub) return false;
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
  }, [leads, search, sourceFilter, teamFilter, onlyHub]);

  const hasAnyHub = useMemo(() => (leads ?? []).some((l) => l.is_hub), [leads]);
  const visibleStatuses = useMemo(() => {
    // Esconde HUB Ativo do kanban quando não há lead HUB e o filtro não força
    if (!hasAnyHub && !onlyHub) return CRM_STATUS_ORDER.filter((s) => s !== 'hub_ativo');
    return CRM_STATUS_ORDER;
  }, [hasAnyHub, onlyHub]);

  const byStatus = useMemo(() => {
    const map = new Map<CrmLeadStatus, CrmLead[]>();
    visibleStatuses.forEach((s) => map.set(s, []));
    filtered.forEach((l) => {
      if (map.has(l.status)) map.get(l.status)!.push(l);
    });
    return map;
  }, [filtered, visibleStatuses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 min-w-0">
            <KanbanSquare className="h-7 w-7 text-primary shrink-0" />
            <span className="text-wrap-anywhere">CRM de Leads</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Funil unificado: LPs, site externo, convites manuais e API. Leads Gente HUB entram com automações de cobrança e contrato.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/admin/crm/auditoria">
              <ScrollText className="h-4 w-4" /> Auditoria
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => backfill.mutate()}
            disabled={backfill.isPending}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${backfill.isPending ? 'animate-spin' : ''}`} />
            Sincronizar convidados
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
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
            <div className="lg:col-span-4">
              <Toggle
                pressed={onlyHub}
                onPressedChange={setOnlyHub}
                className="gap-2 data-[state=on]:bg-amber-500 data-[state=on]:text-white"
              >
                <Sparkles className="h-4 w-4" /> Somente Gente HUB
              </Toggle>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando leads...</p>
      ) : (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
            visibleStatuses.length === 6 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'
          }`}
        >
          {visibleStatuses.map((status) => {
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
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedLead(lead)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedLead(lead);
                      }}
                      className="rounded-md border bg-card p-3 space-y-2 hover:bg-muted/40 focus:bg-muted/40 outline-none transition-colors cursor-pointer"
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
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {lead.is_hub && (
                            <Badge className="bg-amber-500 text-white text-[10px] gap-1">
                              <Sparkles className="h-3 w-3" /> HUB
                            </Badge>
                          )}
                          {lead.profile_id && lead.status === 'fechado' && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                          <ContractIcon status={lead.contract_status} />
                        </div>
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
                        {lead.payment_status === 'pending' && (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                            Pgto pendente
                          </Badge>
                        )}
                      </div>

                      <div
                        className="flex items-center justify-between gap-2 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(lead.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                        <Select
                          value={lead.status}
                          onValueChange={(v) =>
                            updateStatus.mutate({ id: lead.id, status: v as CrmLeadStatus })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-36">
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
            Leads entram como <strong>Novo</strong>. Ao marcar presença → <strong>Em Qualificação</strong>.
            Ao mover para <strong>Qualificado</strong>: leads Gente HUB disparam automação de cobrança
            e recebem contrato Autentique (se configurado). <strong>HUB Ativo</strong> mostra os leads
            HUB com contrato/pagamento concluídos, prontos para promoção. Clique em qualquer card para
            abrir a auditoria e ações. Promover um lead com conta criada torna-o membro do grupo destino.
          </CardDescription>
        </CardHeader>
      </Card>

      <LeadDrawer
        lead={selectedLead}
        teamName={selectedLead?.target_team_id ? teamMap.get(selectedLead.target_team_id) : null}
        onOpenChange={(o) => !o && setSelectedLead(null)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
