import { useState } from 'react';
import { useTeams } from '@/hooks/useTeams';
import { useMembers } from '@/hooks/useMembers';
import { useAdminTeams, useUserRole } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Settings, Users, Crown, UserPlus, UserMinus, Trash2, Palette } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Admin() {
  const { data: userRole, isLoading: loadingRole } = useUserRole();
  const { teams, isLoading } = useTeams();
  const { data: members } = useMembers();
  const { createTeam, deleteTeam, addMember, removeMember, toggleFacilitator } = useAdminTeams();
  const [open, setOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#22c55e' });
  const [selectedMember, setSelectedMember] = useState('');

  if (loadingRole) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (userRole !== 'admin' && userRole !== 'facilitador') return <Navigate to="/" replace />;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTeam.mutateAsync(formData);
    setOpen(false);
    setFormData({ name: '', description: '', color: '#22c55e' });
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
            Administração
          </h1>
          <p className="text-muted-foreground">Gerenciar equipes e membros</p>
        </div>

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
                  {COLORS.map((c) => (
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !teams?.length ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhuma equipe cadastrada</p></CardContent></Card>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
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
                      <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
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
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteTeam.mutate(team.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!team.members?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro</p>
                ) : (
                  <div className="space-y-2">
                    {team.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`fac-${member.id}`} className="text-sm text-muted-foreground">Facilitador</Label>
                            <Switch
                              id={`fac-${member.id}`}
                              checked={member.is_facilitator}
                              onCheckedChange={(checked) => toggleFacilitator.mutate({ teamId: team.id, userId: member.user_id, isFacilitator: checked })}
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeMember.mutate({ teamId: team.id, userId: member.user_id })}>
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
