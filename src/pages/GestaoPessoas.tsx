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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useTeams } from '@/hooks/useTeams';
import { usePromoteGuest } from '@/hooks/usePromoteGuest';
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
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  role: 'admin' | 'facilitador' | 'membro' | 'convidado' | null;
  slug: string | null;
  team_id: string | null;
  team_name: string | null;
  // Dados de convite (para convidados)
  invitation_id?: string;
  invitation_status?: string;
  invited_by_name?: string;
  invited_at?: string;
}

export default function GestaoPessoas() {
  const { isAdmin, isFacilitator, isLoading: isLoadingRole } = useAdmin();
  const { teams } = useTeams();
  const { promoteGuest, isPromoting } = usePromoteGuest();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  
  // Modal states
  const [selectedPerson, setSelectedPerson] = useState<PersonData | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [selectedRole, setSelectedRole] = useState<'membro' | 'facilitador'>('membro');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('none');

  // Buscar todas as pessoas
  const { data: allPeople, isLoading } = useQuery({
    queryKey: ['all-people-admin'],
    queryFn: async () => {
      // 1. Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company, avatar_url, is_active, deactivated_at, deactivation_reason, created_at, slug')
        .order('full_name');

      if (profilesError) throw profilesError;

      // 2. Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap: Record<string, string> = {};
      roles?.forEach(r => {
        rolesMap[r.user_id] = r.role;
      });

      // 3. Buscar team_members
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('user_id, team_id');

      if (teamError) throw teamError;

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

      // Montar dados
      return (profiles || []).map(profile => {
        const invitation = invitationMap[profile.id];
        return {
          ...profile,
          role: (rolesMap[profile.id] as any) || null,
          team_id: teamMap[profile.id] || null,
          team_name: teamMap[profile.id] ? teamNamesMap[teamMap[profile.id]] : null,
          invitation_id: invitation?.id,
          invitation_status: invitation?.status,
          invited_by_name: invitation ? inviterNamesMap[invitation.invited_by] : undefined,
          invited_at: invitation?.created_at,
        };
      }) as PersonData[];
    },
  });

  // Mutation para desativar usando a função do banco
  const deactivateMutation = useMutation({
    mutationFn: async ({ memberId, reason }: { memberId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('deactivate_member', {
        _member_id: memberId,
        _reason: reason || null,
      });

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
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.rpc('reactivate_member', {
        _member_id: memberId,
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
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-600">Admin</Badge>;
      case 'facilitador':
        return <Badge className="bg-blue-600">Facilitador</Badge>;
      case 'membro':
        return <Badge className="bg-green-600">Membro</Badge>;
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
  const activeMembers = filteredPeople.filter(p => p.is_active && p.role && p.role !== 'convidado');
  const activeGuests = filteredPeople.filter(p => p.is_active && (!p.role || p.role === 'convidado'));
  const inactiveMembers = filteredPeople.filter(p => !p.is_active);

  // Stats
  const stats = {
    membrosAtivos: allPeople?.filter(p => p.is_active && p.role && p.role !== 'convidado').length || 0,
    convidados: allPeople?.filter(p => p.is_active && (!p.role || p.role === 'convidado')).length || 0,
    inativos: allPeople?.filter(p => !p.is_active).length || 0,
  };

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
          {showActions === 'inactive' && person.deactivated_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Desativado em {format(new Date(person.deactivated_at), "dd/MM/yyyy", { locale: ptBR })}
              {person.deactivation_reason && ` - ${person.deactivation_reason}`}
            </p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 flex-shrink-0">
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
                setSelectedTeamId('none');
                setShowPromoteDialog(true);
              }}
            >
              <Crown className="h-4 w-4 mr-1" />
              Promover
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
              setShowActivateDialog(true);
            }}
          >
            <UserCheck className="h-4 w-4 mr-1" />
            Reativar
          </Button>
        )}

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
          <h1 className="text-3xl font-bold text-foreground">Gestão de Pessoas</h1>
          <p className="text-muted-foreground">Gerencie membros, convidados e histórico</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.membrosAtivos}</p>
                <p className="text-sm text-muted-foreground">Membros Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <UserPlus className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.convidados}</p>
                <p className="text-sm text-muted-foreground">Convidados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inativos}</p>
                <p className="text-sm text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Membros ({activeMembers.length})
          </TabsTrigger>
          <TabsTrigger value="guests" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidados ({activeGuests.length})
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

        {/* Tab Convidados */}
        <TabsContent value="guests">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : activeGuests.length === 0 ? (
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
              Deseja reativar <strong>{selectedPerson?.full_name}</strong>? 
              A pessoa voltará a aparecer nas listagens da comunidade.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedPerson && activateMutation.mutate(selectedPerson.id)}
              disabled={activateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
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
              Promova <strong>{selectedPerson?.full_name}</strong> para Membro ou Facilitador.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Novo perfil</Label>
              <Select value={selectedRole} onValueChange={(v: 'membro' | 'facilitador') => setSelectedRole(v)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membro">Membro</SelectItem>
                  <SelectItem value="facilitador">Facilitador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Grupo (opcional)</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum grupo</SelectItem>
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
    </div>
  );
}
