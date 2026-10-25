/**
 * @page GestaoPessoas
 * @route /admin/pessoas
 * @description Gestão unificada de pessoas - membros, convidados, inativos e grupos
 * 
 * @features
 * - Visualização de membros ativos com filtros
 * - Gestão de convidados e promoções
 * - Histórico de membros inativos
 * - Atribuição de grupos
 * 
 * @access Administradores e Facilitadores
 * @since 2025-02-08
 */

import { fetchAllRows } from '@/lib/paginated-query';
import { useMeetings } from '@/hooks/useMeetings';
import { countPeople, primaryRole, PEOPLE_ROLES } from '@/lib/people-counts';
import type { AppRole } from '@/lib/access-control';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useGuestsDirectory } from '@/hooks/useGuestsDirectory';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useTeams } from '@/hooks/useTeams';
import { usePromoteGuest } from '@/hooks/usePromoteGuest';
import { useTransferGuest } from '@/hooks/useTransferGuest';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserX,
  UserCheck,
  Search,
  Mail,
  Building,
  AlertTriangle,
  Crown,
  UserPlus,
  Filter,
  ArrowUpRight,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  XCircle,
  CircleDollarSign
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';
import { buildDeactivateArgs } from '@/lib/identity-utils';
import {
  SUBSCRIPTION_STATUS_LABEL,
  formatCents,
  useBillingPlans,
  useProfileSubscriptions,
  useSaveSubscription,
  useAssignPersonPlan,
  useSendCharge,
} from '@/hooks/useBilling';

/**
 * Painel de plano/assinatura da pessoa (v3.54.0 — Fase 4 do Assinante).
 * Somente Admin: a RLS de billing já restringe a escrita a administradores.
 * A assinatura é vinculada ao perfil (profile_id), sem mexer no funil do CRM.
 */
function PersonPlanPanel({ personId }: { personId: string }) {
  const { data: plans } = useBillingPlans();
  const { data: subscriptions, isLoading } = useProfileSubscriptions(personId);
  const save = useSaveSubscription();
  const assign = useAssignPersonPlan();
  const sendCharge = useSendCharge();
  const [confirmSubscriber, setConfirmSubscriber] = useState(false);
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const activePlans = (plans ?? []).filter((p) => p.active);
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));
  const hasActive = (subscriptions ?? []).some((s) => s.status === 'active' || s.status === 'draft' || s.status === 'past_due');

  const subscriberPlan = activePlans.find(p => p.id === planId)?.audience === 'assinante';

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-4">
      {(subscriptions ?? []).length > 0 ? (
        <div className="space-y-2">
          {(subscriptions ?? []).map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-wrap-anywhere">
                  {planById.get(s.plan_id)?.name ?? 'Plano'} · {formatCents(s.amount_cents)}
                </p>
                <p className="text-xs text-muted-foreground">
                  início {s.start_date}
                  {s.next_charge_date ? ` · próxima cobrança ${s.next_charge_date}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{SUBSCRIPTION_STATUS_LABEL[s.status]}</Badge>
                {s.status === 'active' && <Button size="sm" variant="outline" disabled={sendCharge.isPending} onClick={() => sendCharge.mutate({ subscription_id: s.id })}>Cobrar</Button>}
                {planById.get(s.plan_id)?.audience === 'assinante' && s.status === 'active' && <Button size="sm" variant="outline" disabled={assign.isPending} onClick={() => {
                  if (window.confirm('Confirmar a alteração desta pessoa para Assinante da Comunidade?')) assign.mutate({ profileId: personId, planId: s.plan_id, startDate: s.start_date, asSubscriber: true });
                }}>Definir como Assinante</Button>}
                {(s.status === 'active' || s.status === 'draft' || s.status === 'past_due') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={save.isPending}
                    onClick={() => save.mutate({ id: s.id, plan_id: s.plan_id, status: 'canceled' })}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma assinatura vinculada a esta pessoa.</p>
      )}

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Atribuir novo plano</p>
        {hasActive && (
          <p className="text-xs text-muted-foreground">
            Já existe uma assinatura em aberto. Cancele-a antes de atribuir outro plano, para não
            duplicar cobranças e acessos.
          </p>
        )}
        <div className="space-y-1.5">
          <Label>Plano</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
            <SelectContent>
              {activePlans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {formatCents(p.amount_cents)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Início / primeira cobrança</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        {subscriberPlan && <Label className="flex items-start gap-2 text-sm">
          <Checkbox checked={confirmSubscriber} onCheckedChange={v => setConfirmSubscriber(v === true)} />
          Confirmo a mudança de Convidado para Assinante da Comunidade
        </Label>}
        <Button
          size="sm"
          disabled={!planId || hasActive || assign.isPending || (subscriberPlan && !confirmSubscriber) || activePlans.length === 0}
          onClick={() => assign.mutate({ profileId: personId, planId, startDate, asSubscriber: subscriberPlan })}
        >
          <CircleDollarSign className="h-4 w-4 mr-1" />
          Atribuir plano
        </Button>
        {activePlans.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum plano ativo. Crie e ative um plano em Administração → Planos.
          </p>
        )}
      </div>
    </div>
  );
}

interface PersonData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  created_at: string | null;
  role: AppRole;
  slug: string | null;
  team_id: string | null;
  team_name: string | null;
  // Dados de convite (para convidados)
  invitation_id?: string;
  invitation_status?: string;
  invited_by_name?: string;
  invited_at?: string;
  // Dados de encontro confirmado (para convidados)
  confirmed_meeting_title?: string;
  confirmed_meeting_date?: string;
}

export default function GestaoPessoas() {
  const { isAdmin, isFacilitator, isLoading: isLoadingRole } = useAdmin();
  const { teams } = useTeams();
  const { promoteGuest, isPromoting } = usePromoteGuest();
  const { transferGuest, isTransferring } = useTransferGuest();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const { data: guestDirectory, isLoading: loadingGuests } = useGuestsDirectory();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  
  // Modal states
  const [selectedPerson, setSelectedPerson] = useState<PersonData | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  // v3.43.0: reativação exige grupo e papel de retorno
  const [reactivateTeamId, setReactivateTeamId] = useState<string>('');
  const [reactivateRole, setReactivateRole] = useState<'membro' | 'facilitador' | 'convidado' | 'assinante'>('membro');
  const [reactivatePlanId, setReactivatePlanId] = useState('none');
  const { data: billingPlans } = useBillingPlans();
  const assignPlan = useAssignPersonPlan();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'members');
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const { meetings: premiumMeetings } = useMeetings(isAdmin || isFacilitator);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [premiumMeetingId, setPremiumMeetingId] = useState('');
  const invitePremium = useMutation({ mutationFn: async () => {
    if (!selectedPerson) throw new Error('Selecione a pessoa');
    const { data, error } = await supabase.rpc('invite_subscriber_premium', { _profile_id: selectedPerson.id, _meeting_id: premiumMeetingId });
    if (error) throw error;
    const { error: emailError } = await supabase.functions.invoke('community-notification', { body: { kind: 'premium', reference_id: data } });
    if (emailError) toast({ title: 'Convite salvo', description: 'Não foi possível enviar o aviso por e-mail.', variant: 'destructive' });
  }, onSuccess: () => { setShowPremiumDialog(false); toast({ title: 'Participação convidada', description: 'O papel Assinante foi preservado.' }); }, onError: (error: Error) => toast({ title: 'Erro ao convidar', description: error.message, variant: 'destructive' }) });
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [transferTeamId, setTransferTeamId] = useState<string>('');
  const [deactivationReason, setDeactivationReason] = useState('');
  const [selectedRole, setSelectedRole] = useState<'membro' | 'facilitador'>('membro');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('none');

  // Buscar todas as pessoas
  const { data: allPeople, isLoading } = useQuery({
    queryKey: ['all-people-admin'],
    enabled: !isLoadingRole && (isAdmin || isFacilitator),
    queryFn: async () => {
      // 1. Buscar profiles
      const profiles = await fetchAllRows((from, to) => supabase.from('profiles').select('id, full_name, email, phone, company, avatar_url, is_active, deactivated_at, deactivation_reason, created_at, slug').order('id').range(from, to));

      // 2. Buscar roles
      const roles = await fetchAllRows((from, to) => supabase.from('user_roles').select('user_id, role').order('id').range(from, to));

      const rolesMap: Record<string, string> = {};
      roles?.forEach(r => {
        rolesMap[r.user_id] = primaryRole([rolesMap[r.user_id], r.role]) || '';
      });

      // 3. Buscar team_members
      const teamMembers = await fetchAllRows((from, to) => supabase.from('team_members').select('user_id, team_id').order('id').range(from, to));

      const teamMap: Record<string, string> = {};
      teamMembers?.forEach(tm => {
        teamMap[tm.user_id] = tm.team_id;
      });

      // 4. Buscar teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name');

      const teamNamesMap: Record<string, string> = {};
      teamsData?.forEach(t => {
        teamNamesMap[t.id] = t.name;
      });

      // 5. Buscar convites para convidados
      const { data: invitations } = await supabase
        .from('invitations')
        .select('id, accepted_by, status, created_at, invited_by');

      const invitationMap: Record<string, any> = {};
      invitations?.forEach(inv => {
        if (inv.accepted_by) {
          invitationMap[inv.accepted_by] = inv;
        }
      });

      // 6. Buscar nomes dos que convidaram
      const inviterIds = [...new Set(invitations?.map(i => i.invited_by).filter(Boolean) || [])];
      const { data: invitersProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', inviterIds);

      const inviterNamesMap: Record<string, string> = {};
      invitersProfiles?.forEach(p => {
        inviterNamesMap[p.id] = p.full_name;
      });

      // 7. Buscar presenças de convidados em encontros futuros
      const guestUserIds = Object.keys(invitationMap);
      let guestAttendanceMap: Record<string, { title: string; meeting_date: string }> = {};
      if (guestUserIds.length > 0) {
        const { data: attendancesData } = await supabase
          .from('attendances')
          .select('user_id, meeting_id')
          .in('user_id', guestUserIds);

        if (attendancesData && attendancesData.length > 0) {
          const meetingIds = [...new Set(attendancesData.map(a => a.meeting_id))];
          const { data: meetingsData } = await supabase
            .from('meetings')
            .select('id, title, meeting_date')
            .in('id', meetingIds);

          const meetingsMap: Record<string, any> = {};
          meetingsData?.forEach(m => { meetingsMap[m.id] = m; });

          attendancesData.forEach(a => {
            const meeting = meetingsMap[a.meeting_id];
            if (meeting) {
              guestAttendanceMap[a.user_id] = { title: meeting.title, meeting_date: meeting.meeting_date };
            }
          });
        }
      }

      // Montar dados
      return (profiles || []).map(profile => {
        const invitation = invitationMap[profile.id];
        const guestAttendance = guestAttendanceMap[profile.id];
        return {
          ...profile,
          role: (rolesMap[profile.id] as any) || null,
          team_id: teamMap[profile.id] || null,
          team_name: teamMap[profile.id] ? teamNamesMap[teamMap[profile.id]] : null,
          invitation_id: invitation?.id,
          invitation_status: invitation?.status,
          invited_by_name: invitation ? inviterNamesMap[invitation.invited_by] : undefined,
          invited_at: invitation?.created_at,
          confirmed_meeting_title: guestAttendance?.title,
          confirmed_meeting_date: guestAttendance?.meeting_date,
        };
      }) as PersonData[];
    },
  });

  // Mutation para desativar usando a função do banco
  const deactivateMutation = useMutation({
    mutationFn: async ({ memberId, reason }: { memberId: string; reason: string }) => {
      const { data, error } = await supabase.rpc(
        'deactivate_member',
        buildDeactivateArgs(memberId, reason),
      );

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; teams_removed?: number } | null;
      if (result && !result.success) {
        throw new Error(result.error || 'Erro ao desativar');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-people-admin'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      
      const teamsRemoved = data?.teams_removed || 0;
      toast({
        title: 'Pessoa desativada',
        description: teamsRemoved > 0 
          ? `Removida de ${teamsRemoved} grupo(s) e movida para histórico.`
          : 'Movida para histórico com sucesso.',
      });
      setShowDeactivateDialog(false);
      setSelectedPerson(null);
      setDeactivationReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível desativar.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para reativar
  const activateMutation = useMutation({
    mutationFn: async ({ memberId, teamId, role }: { memberId: string; teamId: string | null; role: 'membro' | 'facilitador' | 'convidado' }) => {
      const { data, error } = await (supabase.rpc as any)('reactivate_member', {
        _member_id: memberId,
        _team_id: teamId,
        _role: role,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string } | null;
      if (result && !result.success) {
        throw new Error(result.error || 'Erro ao reativar');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-people-admin'] });
      toast({
        title: 'Pessoa reativada',
        description: 'A pessoa está visível novamente.',
      });
      setShowActivateDialog(false);
      setSelectedPerson(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível reativar.',
        variant: 'destructive',
      });
    },
  });

  // Permissão
  if (!isLoadingRole && !isAdmin && !isFacilitator) {
    return <Navigate to="/" replace />;
  }

  const getInitials = (name: string) => {
    return (name || '').split(' ').map(n => n?.[0] ?? '').join('').slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-600">Admin</Badge>;
      case 'facilitador':
        return <Badge className="bg-blue-600">Facilitador</Badge>;
      case 'membro':
        return <Badge className="bg-green-600">Membro</Badge>;
      case 'assinante':
        return <Badge>Assinante da Comunidade</Badge>;
      case 'convidado':
        return <Badge variant="secondary">Convidado</Badge>;
      default:
        return <Badge variant="outline">Sem perfil</Badge>;
    }
  };

  // Filtrar pessoas
  const filteredPeople = allPeople?.filter(person => {
    // Busca por nome/email/empresa
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        person.full_name.toLowerCase().includes(searchLower) ||
        person.email?.toLowerCase().includes(searchLower) ||
        person.company?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Filtro por role
    if (roleFilter !== 'all') {
      if (roleFilter === 'sem_perfil' && person.role !== null) return false;
      if (roleFilter !== 'sem_perfil' && person.role !== roleFilter) return false;
    }

    // Filtro por grupo
    if (teamFilter !== 'all') {
      if (teamFilter === 'sem_grupo' && person.team_id !== null) return false;
      if (teamFilter !== 'sem_grupo' && person.team_id !== teamFilter) return false;
    }

    return true;
  }) || [];

  // Separar por status
  const activeMembers = filteredPeople.filter(p => p.is_active && p.role === 'membro');
  const activeGuests = filteredPeople.filter(p => p.is_active && (!p.role || p.role === 'convidado'));
  // Cadastros ainda sem conta (pré-ativação), vindos da mesma base da página Convidados
  const pendingActivation = [...new Map((guestDirectory || []).map(g => [g.lead_id ?? g.id, g])).values()].filter(g => {
    if (g.profile_id || g.status === 'promovido_membro') return false;
    if (roleFilter !== 'all' && roleFilter !== 'convidado') return false;
    if (teamFilter !== 'all' && (teamFilter === 'sem_grupo' ? !!g.team_id : g.team_id !== teamFilter)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(g.full_name.toLowerCase().includes(s) || g.email?.toLowerCase().includes(s) || g.company?.toLowerCase().includes(s))) return false;
    }
    return true;
  });
  const inactiveMembers = filteredPeople.filter(p => !p.is_active);

  const stats = countPeople(filteredPeople, pendingActivation.length);
  const roleLabels = { admin: 'Administradores', facilitador: 'Facilitadores', membro: 'Membros', assinante: 'Assinantes', convidado: 'Convidados' };

  const handlePromote = () => {
    if (!selectedPerson) return;
    
    promoteGuest({
      userId: selectedPerson.id,
      targetRole: selectedRole,
      teamId: selectedTeamId !== 'none' ? selectedTeamId : undefined,
    });
    
    setShowPromoteDialog(false);
    setSelectedPerson(null);
    queryClient.invalidateQueries({ queryKey: ['all-people-admin'] });
  };

  const PersonRow = ({ person, showActions }: { person: PersonData; showActions: 'active' | 'guest' | 'inactive' }) => (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={person.avatar_url || ''} alt={person.full_name} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {getInitials(person.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{person.full_name}</p>
            {getRoleBadge(person.role)}
            {person.team_name && (
              <Badge variant="outline">{person.team_name}</Badge>
            )}
            {!person.is_active && (
              <Badge variant="destructive">Inativo</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {person.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {person.email}
              </span>
            )}
            {person.company && (
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {person.company}
              </span>
            )}
          </div>
          {showActions === 'guest' && person.invited_by_name && (
            <p className="text-xs text-muted-foreground mt-1">
              Convidado por: {person.invited_by_name}
              {person.invited_at && ` em ${format(parseISO(person.invited_at), "dd/MM/yyyy", { locale: ptBR })}`}
            </p>
          )}
          {showActions === 'guest' && person.confirmed_meeting_title && (
            <p className="text-xs mt-1">
              <Badge variant="outline" className="text-[10px] mr-1 border-green-500 text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirmado
              </Badge>
              {person.confirmed_meeting_title}
              {person.confirmed_meeting_date && ` — ${format(parseLocalDate(person.confirmed_meeting_date), "dd/MM/yyyy", { locale: ptBR })}`}
            </p>
          )}
          {showActions === 'inactive' && person.deactivated_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Desativado em {format(new Date(person.deactivated_at), "dd/MM/yyyy", { locale: ptBR })}
              {person.deactivation_reason && ` - ${person.deactivation_reason}`}
            </p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {showActions === 'active' && isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setSelectedPerson(person);
              setShowDeactivateDialog(true);
            }}
          >
            <UserX className="h-4 w-4 mr-1" />
            Desativar
          </Button>
        )}

        {showActions === 'guest' && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setSelectedPerson(person);
                setSelectedRole('membro');
                // Facilitador: pre-select their team
                if (isFacilitator && teams && teams.length > 0) {
                  // Find facilitator's team from team_members
                  const facilitatorTeam = teams.find(t => 
                    person.team_id === t.id
                  );
                  setSelectedTeamId(facilitatorTeam?.id || teams[0]?.id || 'none');
                } else {
                  setSelectedTeamId('none');
                }
                setShowPromoteDialog(true);
              }}
            >
              <Crown className="h-4 w-4 mr-1" />
              Promover
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPerson(person);
                setTransferTeamId(person.team_id || '');
                setShowTransferDialog(true);
              }}
              title="Transferir de grupo"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setSelectedPerson(person);
                  setShowDeactivateDialog(true);
                }}
              >
                <UserX className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        {showActions === 'inactive' && (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 hover:text-green-600"
            onClick={() => {
              setSelectedPerson(person);
              setReactivatePlanId('none');
              setReactivateRole(person.role === 'assinante' ? 'assinante' : 'membro');
              setReactivateTeamId('');
              setShowActivateDialog(true);
            }}
          >
            <UserCheck className="h-4 w-4 mr-1" />
            Reativar
          </Button>
        )}

        {isAdmin && (showActions === 'active' || showActions === 'guest') && (
          <Button
            variant="outline"
            size="sm"
            title="Plano e assinatura"
            onClick={() => {
              setSelectedPerson(person);
              setShowPlanDialog(true);
            }}
          >
            <CircleDollarSign className="h-4 w-4 mr-1" />
            Plano
          </Button>
        )}

        {person.role === 'assinante' && person.is_active && (isAdmin || isFacilitator) && <Button size="sm" variant="outline" onClick={() => { setSelectedPerson(person); setPremiumMeetingId(''); setShowPremiumDialog(true); }}><UserPlus className="h-4 w-4 mr-1" />Convidar para encontro</Button>}
        {person.slug && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/membro/${person.slug}`)}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestão de Pessoas</h1>
          <p className="text-muted-foreground">Gerencie membros, convidados e histórico</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        {[['total', 'Total de Pessoas'], ...PEOPLE_ROLES.map(r => [r, roleLabels[r]]), ['inactive', 'Inativos']].map(([key, label]) => (
          <Card key={key}><CardContent className="p-4 min-w-0">
            <p className="text-2xl font-bold tabular-nums">{isLoading || loadingGuests ? '—' : stats[key as keyof typeof stats]}</p>
            <p className="text-sm text-muted-foreground text-wrap-anywhere">{label}</p>
            {key === 'convidado' && <p className="mt-1 text-xs text-muted-foreground">{activeGuests.length} com conta · {pendingActivation.length} aguardando ativação</p>}
          </CardContent></Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="facilitador">Facilitador</SelectItem>
                <SelectItem value="membro">Membro</SelectItem>
                <SelectItem value="assinante">Assinante da Comunidade</SelectItem>
                <SelectItem value="convidado">Convidado</SelectItem>
                <SelectItem value="sem_perfil">Sem perfil</SelectItem>
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                <SelectItem value="sem_grupo">Sem grupo</SelectItem>
                {teams?.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="hscroll">
          <TabsTrigger value="members" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Membros ({activeMembers.length})
          </TabsTrigger>
          {(['admin', 'facilitador', 'assinante'] as const).map(r => <TabsTrigger key={r} value={r}>{roleLabels[r]} ({filteredPeople.filter(p => p.is_active && p.role === r).length})</TabsTrigger>)}
          <TabsTrigger value="guests" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidados ({activeGuests.length + pendingActivation.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-2">
            <UserX className="h-4 w-4" />
            Inativos ({inactiveMembers.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Membros */}
        <TabsContent value="members">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : activeMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum membro encontrado
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeMembers.map(person => (
                <PersonRow key={person.id} person={person} showActions="active" />
              ))}
            </div>
          )}
        </TabsContent>

        {(['admin', 'facilitador', 'assinante'] as const).map(r => <TabsContent key={r} value={r} className="space-y-3">
          {filteredPeople.filter(p => p.is_active && p.role === r).map(person => <PersonRow key={person.id} person={person} showActions="active" />)}
          {!isLoading && filteredPeople.filter(p => p.is_active && p.role === r).length === 0 && <p className="py-8 text-center text-muted-foreground">Nenhuma pessoa encontrada.</p>}
        </TabsContent>)}
        {/* Tab Convidados */}
        <TabsContent value="guests">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : activeGuests.length === 0 && pendingActivation.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum convidado pendente</p>
                <p className="text-sm mt-1">Convidados que aceitarem convites aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeGuests.map(person => (
                <PersonRow key={person.id} person={person} showActions="guest" />
              ))}
              {pendingActivation.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground pt-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Aguardando ativação da conta ({pendingActivation.length})
                  </h3>
                  {pendingActivation.map(g => {
                    const exp = g.invitation_expires_at ? new Date(g.invitation_expires_at) : null;
                    const expired = g.invitation_status === 'expired' || (!!exp && exp <= new Date());
                    return (
                      <Card key={g.id}>
                        <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-wrap-anywhere">{g.full_name}</p>
                            <p className="text-xs text-muted-foreground text-wrap-anywhere">
                              {[g.email, g.team_name, g.invited_by_name && `Convidado por ${g.invited_by_name}`].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Badge variant="outline">Sem conta ativada</Badge>
                            {exp && (
                              <Badge variant={expired ? 'destructive' : 'secondary'}>
                                {expired ? 'Vencido em ' : 'Válido até '}{format(exp, 'dd/MM/yyyy', { locale: ptBR })}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab Inativos */}
        <TabsContent value="inactive">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : inactiveMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma pessoa inativa</p>
                <p className="text-sm mt-1">Pessoas desativadas aparecerão aqui para consulta ou reativação</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inactiveMembers.map(person => (
                <PersonRow key={person.id} person={person} showActions="inactive" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Desativação */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desativar Pessoa
            </DialogTitle>
            <DialogDescription>
              Ao desativar <strong>{selectedPerson?.full_name}</strong>, a pessoa será removida de todos os grupos
              e não aparecerá mais nas listagens. Os dados serão mantidos para histórico.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo da desativação (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Saiu da comunidade, mudou de cidade..."
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPerson && deactivateMutation.mutate({
                memberId: selectedPerson.id,
                reason: deactivationReason,
              })}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Desativando...' : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reativação */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Reativar Pessoa
            </DialogTitle>
            <DialogDescription>
              Escolha o grupo e o papel de retorno de <strong>{selectedPerson?.full_name}</strong>.
              Todo o histórico é preservado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Papel de retorno</Label>
              <Select value={reactivateRole} onValueChange={(v) => { setReactivateRole(v as typeof reactivateRole); setReactivatePlanId('none'); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="facilitador">Facilitador</SelectItem>
                  <SelectItem value="convidado">Convidado (sem grupo)</SelectItem>
                  <SelectItem value="assinante">Assinante da Comunidade (sem grupo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reactivateRole !== 'convidado' && reactivateRole !== 'assinante' && (
              <div className="space-y-1.5">
                <Label>Grupo</Label>
                <Select value={reactivateTeamId} onValueChange={setReactivateTeamId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
                  <SelectContent>
                    {(teams ?? []).map((t: { id: string; name: string }) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Plano {reactivateRole === 'assinante' ? '(obrigatório)' : '(opcional)'}</Label>
            <Select value={reactivatePlanId} onValueChange={setReactivatePlanId}>
              <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {reactivateRole !== 'assinante' && <SelectItem value="none">Sem novo plano</SelectItem>}
                {(billingPlans ?? []).filter(p => p.active && (reactivateRole === 'assinante' ? p.audience === 'assinante' : p.audience !== 'assinante')).map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {formatCents(p.amount_cents)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (!selectedPerson) return;
                if (reactivatePlanId !== 'none') {
                  assignPlan.mutate({ profileId: selectedPerson.id, planId: reactivatePlanId, asSubscriber: reactivateRole === 'assinante', reactivate: true, role: reactivateRole, teamId: reactivateTeamId || null }, { onSuccess: () => { setShowActivateDialog(false); setSelectedPerson(null); } });
                } else {
                  activateMutation.mutate({ memberId: selectedPerson.id, teamId: reactivateRole === 'convidado' ? null : reactivateTeamId || null, role: reactivateRole === 'assinante' ? 'convidado' : reactivateRole });
                }
              }}
              disabled={activateMutation.isPending || assignPlan.isPending || (reactivateRole === 'assinante' && reactivatePlanId === 'none') || (['membro', 'facilitador'].includes(reactivateRole) && !reactivateTeamId)}
            >
              {activateMutation.isPending ? 'Reativando...' : 'Reativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Promoção */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Promover Convidado
            </DialogTitle>
           <DialogDescription>
              Promova <strong>{selectedPerson?.full_name}</strong> para {isAdmin ? 'Membro ou Facilitador' : 'Membro'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Novo perfil</Label>
              {isAdmin ? (
                <Select value={selectedRole} onValueChange={(v: 'membro' | 'facilitador') => setSelectedRole(v)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membro">Membro</SelectItem>
                    <SelectItem value="facilitador">Facilitador</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Membro</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Grupo {isFacilitator ? '' : '(opcional)'}</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="none">Nenhum grupo</SelectItem>}
                  {teams?.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePromote} disabled={isPromoting}>
              {isPromoting ? 'Promovendo...' : 'Promover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Transferência de Grupo */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transferir Convidado de Grupo
            </DialogTitle>
            <DialogDescription>
              Mover <strong>{selectedPerson?.full_name}</strong>
              {selectedPerson?.team_name && <> do grupo <strong>{selectedPerson.team_name}</strong></>}
              {' '}para outro grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-team">Novo grupo</Label>
              <Select value={transferTeamId} onValueChange={setTransferTeamId}>
                <SelectTrigger id="transfer-team">
                  <SelectValue placeholder="Selecione o grupo destino" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.filter(t => t.id !== selectedPerson?.team_id).map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFacilitator && !isAdmin && (
                <p className="text-xs text-muted-foreground">
                  Como facilitador, você só pode transferir convidados do seu próprio grupo.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedPerson && transferTeamId) {
                  transferGuest(
                    { guestId: selectedPerson.id, newTeamId: transferTeamId },
                    {
                      onSuccess: () => {
                        setShowTransferDialog(false);
                        setSelectedPerson(null);
                        setTransferTeamId('');
                      },
                    }
                  );
                }
              }}
              disabled={isTransferring || !transferTeamId}
            >
              {isTransferring ? 'Transferindo...' : 'Transferir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPremiumDialog} onOpenChange={setShowPremiumDialog}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Convidar para encontro Premium</DialogTitle><DialogDescription>{selectedPerson?.full_name} permanece Assinante da Comunidade.</DialogDescription></DialogHeader>
        <Label>Encontro</Label><Select value={premiumMeetingId} onValueChange={setPremiumMeetingId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(premiumMeetings ?? []).filter(m => m.event_type === 'premium_group' && m.meeting_date >= new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })).map(m => <SelectItem key={m.id} value={m.id}>{m.title} · {m.meeting_date.split('-').reverse().join('/')}</SelectItem>)}</SelectContent></Select>
        <DialogFooter><Button variant="outline" onClick={() => setShowPremiumDialog(false)}>Cancelar</Button><Button disabled={!premiumMeetingId || invitePremium.isPending} onClick={() => invitePremium.mutate()}>Enviar convite</Button></DialogFooter>
      </DialogContent></Dialog>
      {/* Dialog de Plano e Assinatura (somente Admin) */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              Plano e Assinatura
            </DialogTitle>
            <DialogDescription>
              Gerencie o plano de <strong>{selectedPerson?.full_name}</strong>. O plano define os
              acessos e limites de uso de cada módulo; o histórico da pessoa é preservado.
            </DialogDescription>
          </DialogHeader>
          {selectedPerson && <PersonPlanPanel personId={selectedPerson.id} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
