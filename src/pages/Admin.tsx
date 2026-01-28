import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTeams } from '@/hooks/useTeams';
import { useMembers } from '@/hooks/useMembers';
import { useMeetings } from '@/hooks/useMeetings';
import { useAdminTeams, useAdmin, useAdminRoles, useGuestAttendance } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { usePointsHistory } from '@/hooks/usePointsHistory';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Settings, Users, Crown, UserPlus, UserMinus, Trash2, UserCog, ArrowUp, Calendar, Check, RefreshCw } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format, isFuture, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';

const TEAM_COLORS = ['#1e3a5f', '#f7941d', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#3b82f6'];

// Componente para filtrar usuários por role
function UserListWithFilter({ getInitials }: { getInitials: (name: string) => string }) {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Buscar todos os profiles ativos (incluindo convidados)
  const { data: allProfiles } = useQuery({
    queryKey: ['all-profiles-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, company, avatar_url, rank, is_active')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Buscar roles dos membros
  const { data: userRoles } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;
      return data;
    },
  });

  const getRoleForUser = (userId: string) => {
    return userRoles?.find(r => r.user_id === userId)?.role || 'convidado';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-300';
      case 'facilitador': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'membro': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredMembers = allProfiles?.filter(member => {
    if (roleFilter === 'all') return true;
    return getRoleForUser(member.id) === roleFilter;
  }) || [];

  const roleCounts = {
    all: allProfiles?.length || 0,
    admin: allProfiles?.filter(m => getRoleForUser(m.id) === 'admin').length || 0,
    facilitador: allProfiles?.filter(m => getRoleForUser(m.id) === 'facilitador').length || 0,
    membro: allProfiles?.filter(m => getRoleForUser(m.id) === 'membro').length || 0,
    convidado: allProfiles?.filter(m => getRoleForUser(m.id) === 'convidado').length || 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={roleFilter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setRoleFilter('all')}
        >
          Todos ({roleCounts.all})
        </Button>
        <Button 
          variant={roleFilter === 'admin' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setRoleFilter('admin')}
        >
          Admin ({roleCounts.admin})
        </Button>
        <Button 
          variant={roleFilter === 'facilitador' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setRoleFilter('facilitador')}
        >
          Facilitador ({roleCounts.facilitador})
        </Button>
        <Button 
          variant={roleFilter === 'membro' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setRoleFilter('membro')}
        >
          Membro ({roleCounts.membro})
        </Button>
        <Button 
          variant={roleFilter === 'convidado' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setRoleFilter('convidado')}
        >
          Convidado ({roleCounts.convidado})
        </Button>
      </div>

      {!filteredMembers.length ? (
        <p className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => {
            const role = getRoleForUser(member.id);
            return (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.company && (
                    <span className="text-sm text-muted-foreground hidden sm:inline">{member.company}</span>
                  )}
                  <Badge className={getRoleBadgeColor(role)}>{role}</Badge>
                  <Badge variant="secondary">{member.rank || 'iniciante'}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Componente para linha de membro na equipe
function TeamMemberRow({ member, teamId, isAdmin, toggleFacilitator, removeMember, getInitials }: any) {
  const { meetings } = useMeetings();
  const { registerGuestAttendance, isGuestAttending } = useGuestAttendance();
  const [selectedMeeting, setSelectedMeeting] = useState('');
  
  // Verificar se este membro é um convidado (role = convidado)
  const isGuest = member.profile?.role === 'convidado';
  
  // Encontros disponíveis (futuros ou hoje)
  const upcomingMeetings = meetings?.filter(m => isFuture(parseLocalDate(m.meeting_date)) || isToday(parseLocalDate(m.meeting_date))) || [];
  
  const handleRegisterAttendance = async () => {
    if (!selectedMeeting) return;
    await registerGuestAttendance.mutateAsync({ 
      guestId: member.user_id, 
      meetingId: selectedMeeting 
    });
    setSelectedMeeting('');
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={member.profile?.avatar_url || ''} />
            <AvatarFallback>{getInitials(member.profile?.full_name || 'U')}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member.profile?.full_name}</p>
            {member.profile?.company && <p className="text-sm text-muted-foreground">{member.profile.company}</p>}
          </div>
          {member.is_facilitator && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300"><Crown className="w-3 h-3 mr-1" /> Facilitador</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`fac-${member.id}`} className="text-sm text-muted-foreground">Facilitador</Label>
              <Switch
                id={`fac-${member.id}`}
                checked={member.is_facilitator}
                onCheckedChange={(checked) => toggleFacilitator.mutate({ teamId, userId: member.user_id, isFacilitator: checked })}
              />
            </div>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeMember.mutate({ teamId, userId: member.user_id })}>
            <UserMinus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Seção para registrar presença de convidado */}
      {upcomingMeetings.length > 0 && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Registrar presença em encontro" />
            </SelectTrigger>
            <SelectContent>
              {upcomingMeetings.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={isGuestAttending(member.user_id, m.id)}>
                  <div className="flex items-center gap-2">
                    {isGuestAttending(member.user_id, m.id) && <Check className="w-3 h-3 text-green-500" />}
                    {m.title} - {format(parseLocalDate(m.meeting_date), "dd/MM", { locale: ptBR })}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="secondary"
            onClick={handleRegisterAttendance}
            disabled={!selectedMeeting || registerGuestAttendance.isPending}
            className="h-8 text-xs"
          >
            {registerGuestAttendance.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" /> Confirmar</>}
          </Button>
        </div>
      )}
    </div>
  );
}



export default function Admin() {
  const { user } = useAuth();
  const { role, isAdmin, isFacilitator, isLoading: loadingRole } = useAdmin();
  const { teams, isLoading } = useTeams();
  const { members } = useMembers();
  const { createTeam, deleteTeam, addMember, removeMember, toggleFacilitator } = useAdminTeams();
  const { guests, loadingGuests, promoteToMember, promoteToFacilitator } = useAdminRoles();
  const { recalculateAllPoints } = usePointsHistory();
  const [open, setOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#1e3a5f' });
  const [selectedMember, setSelectedMember] = useState('');

  if (loadingRole) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  
  // Apenas admin e facilitador podem acessar
  if (!isAdmin && !isFacilitator) return <Navigate to="/" replace />;

  // Filtrar equipes: facilitador só vê equipes onde é facilitador
  const visibleTeams = teams?.filter(team => {
    if (isAdmin) return true;
    if (isFacilitator) {
      return team.members?.some(m => m.user_id === user?.id && m.is_facilitator);
    }
    return false;
  }) || [];

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTeam.mutateAsync(formData);
    setOpen(false);
    setFormData({ name: '', description: '', color: '#1e3a5f' });
  };

  const handleAddMember = async (teamId: string) => {
    if (!selectedMember) return;
    await addMember.mutateAsync({ teamId, userId: selectedMember });
    setSelectedMember('');
    setAddMemberOpen(null);
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const getAvailableMembers = (teamId: string) => {
    const team = teams?.find(t => t.id === teamId);
    const teamMemberIds = team?.members?.map(m => m.user_id) || [];
    return members?.filter(m => !teamMemberIds.includes(m.id)) || [];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            {isAdmin ? 'Administração' : 'Gestão da Equipe'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Gerenciar equipes, membros e usuários' : 'Gerenciar sua equipe'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList>
          <TabsTrigger value="teams">Equipes</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Usuários</TabsTrigger>}
          {isAdmin && <TabsTrigger value="system">Sistema</TabsTrigger>}
        </TabsList>

        {/* Tab de Equipes */}
        <TabsContent value="teams" className="space-y-6">
          {/* Apenas admin pode criar equipes */}
          {isAdmin && (
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Nova Equipe</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Criar Equipe</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Equipe</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nome da equipe" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição da equipe..." rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <div className="flex gap-2 flex-wrap">
                        {TEAM_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`w-8 h-8 rounded-full transition-transform ${formData.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setFormData({ ...formData, color: c })}
                          />
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createTeam.isPending}>
                      {createTeam.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Equipe'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !visibleTeams?.length ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isAdmin ? 'Nenhuma equipe cadastrada' : 'Você não é facilitador de nenhuma equipe'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {visibleTeams.map((team) => (
                <Card key={team.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color }} />
                      <div>
                        <CardTitle>{team.name}</CardTitle>
                        {team.description && <CardDescription>{team.description}</CardDescription>}
                      </div>
                      <Badge variant="secondary">{team.members?.length || 0} membros</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={addMemberOpen === team.id} onOpenChange={(o) => setAddMemberOpen(o ? team.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm"><UserPlus className="w-4 h-4 mr-1" /> Adicionar</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Membro</DialogTitle>
                            {!isAdmin && (
                              <p className="text-sm text-muted-foreground">
                                Como facilitador, você pode adicionar convidados para participar de encontros.
                              </p>
                            )}
                          </DialogHeader>
                          <div className="space-y-4">
                            <Select value={selectedMember} onValueChange={setSelectedMember}>
                              <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                              <SelectContent>
                                {getAvailableMembers(team.id).map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6"><AvatarFallback className="text-xs">{getInitials(m.full_name)}</AvatarFallback></Avatar>
                                      {m.full_name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={() => handleAddMember(team.id)} disabled={!selectedMember || addMember.isPending} className="w-full">
                              {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteTeam.mutate(team.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!team.members?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro</p>
                    ) : (
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <TeamMemberRow 
                            key={member.id} 
                            member={member} 
                            teamId={team.id}
                            isAdmin={isAdmin}
                            toggleFacilitator={toggleFacilitator}
                            removeMember={removeMember}
                            getInitials={getInitials}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab de Usuários - Apenas Admin */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5" />
                  Gestão de Usuários
                </CardTitle>
                <CardDescription>Promova convidados a membros ou facilitadores</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingGuests ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !guests?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum convidado pendente de promoção</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      {guests.length} convidado(s) aguardando promoção
                    </p>
                    {guests.map((guest: any) => (
                      <div key={guest.user_id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={guest.profiles?.avatar_url || ''} />
                            <AvatarFallback>{getInitials(guest.profiles?.full_name || 'C')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{guest.profiles?.full_name || 'Convidado'}</p>
                            <p className="text-sm text-muted-foreground">{guest.profiles?.email}</p>
                            {guest.profiles?.company && (
                              <p className="text-xs text-muted-foreground">{guest.profiles.company}</p>
                            )}
                          </div>
                          <Badge variant="outline">Convidado</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => promoteToMember.mutate(guest.user_id)}
                            disabled={promoteToMember.isPending}
                          >
                            <ArrowUp className="w-4 h-4 mr-1" />
                            Membro
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => promoteToFacilitator.mutate(guest.user_id)}
                            disabled={promoteToFacilitator.isPending}
                          >
                            <Crown className="w-4 h-4 mr-1" />
                            Facilitador
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lista de todos os membros com seus roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Todos os Usuários
                </CardTitle>
                <CardDescription>Visualize e gerencie os roles de todos os usuários</CardDescription>
              </CardHeader>
              <CardContent>
                <UserListWithFilter getInitials={getInitials} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab de Sistema - Apenas Admin */}
        {isAdmin && (
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Manutenção do Sistema
                </CardTitle>
                <CardDescription>Ferramentas de administração do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <h3 className="font-medium">Recalcular Pontos</h3>
                    <p className="text-sm text-muted-foreground">
                      Recalcula os pontos de todos os usuários baseado nas atividades registradas.
                    </p>
                  </div>
                  <Button 
                    onClick={() => recalculateAllPoints.mutate()} 
                    disabled={recalculateAllPoints.isPending}
                  >
                    {recalculateAllPoints.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recalculando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Recalcular
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
