import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useInvitations, Invitation } from '@/hooks/useInvitations';
import { useAdmin } from '@/hooks/useAdmin';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import AdminDataView from '@/components/AdminDataView';
import { useAdminDelete } from '@/hooks/useAdminData';
import { Plus, Copy, Mail, UserPlus, Clock, CheckCircle, XCircle, Share2, Trash2, Users } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const inviteSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  teamId: z.string().min(1, 'Selecione um grupo'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

function getEffectiveStatus(invitation: Invitation): string {
  if (invitation.status === 'accepted') return 'accepted';
  if (invitation.status === 'expired') return 'expired';
  if (invitation.status === 'pending' && isPast(new Date(invitation.expires_at))) return 'expired';
  return invitation.status;
}

export default function Convites() {
  const { invitations, isLoading, stats, createInvitation, deleteInvitation } = useInvitations();
  const { isAdmin } = useAdmin();
  const { teams } = useTeams();
  const { user } = useAuth();
  const adminDeleteMutation = useAdminDelete('invitations');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Grupos disponíveis: admin vê todos; demais veem só os seus
  const availableTeams = useMemo(() => {
    if (!teams) return [];
    if (isAdmin) return teams;
    return teams.filter(t => t.members?.some(m => m.user_id === user?.id));
  }, [teams, isAdmin, user?.id]);

  const teamNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams?.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [teams]);

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: '', email: '', teamId: '' },
  });

  // Pre-seleciona primeiro grupo disponível ao abrir
  useEffect(() => {
    if (open && availableTeams.length > 0 && !form.getValues('teamId')) {
      form.setValue('teamId', availableTeams[0].id);
    }
  }, [open, availableTeams, form]);

  const onSubmit = (data: z.infer<typeof inviteSchema>) => {
    createInvitation.mutate(
      { name: data.name || undefined, email: data.email || undefined, teamId: data.teamId },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
        },
      }
    );
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/convite/${code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: 'O link do convite foi copiado para a área de transferência.' });
  };

  const shareInvite = (invitation: Invitation) => {
    const url = `${window.location.origin}/convite/${invitation.code}`;
    const text = `Venha fazer parte do Gente Networking! Use o código ${invitation.code} ou acesse: ${url}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Convite Gente Networking', text, url });
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: 'Copiado!', description: 'Texto do convite copiado.' });
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    const status = getEffectiveStatus(invitation);
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case 'accepted':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Aceito</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Expirado</Badge>;
      default:
        return null;
    }
  };

  // Compute stats with effective status
  const effectiveStats = {
    total: invitations?.length || 0,
    pending: invitations?.filter(i => getEffectiveStatus(i) === 'pending').length || 0,
    accepted: invitations?.filter(i => getEffectiveStatus(i) === 'accepted').length || 0,
    expired: invitations?.filter(i => getEffectiveStatus(i) === 'expired').length || 0,
  };

  if (isAdmin) {
    return (
      <AdminDataView
        title="Convites"
        description="Visão geral de todos os convites gerados"
        icon={<UserPlus className="w-6 h-6 text-primary" />}
        table="invitations"
        onDelete={(id) => adminDeleteMutation.mutate(id)}
        isDeleting={adminDeleteMutation.isPending}
        renderItem={(item, profiles) => {
          const inviter = profiles[item.invited_by];
          const effStatus = getEffectiveStatus(item as Invitation);
          return (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono font-bold text-primary">{item.code}</code>
                {effStatus === 'pending' && <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>}
                {effStatus === 'accepted' && <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Aceito</Badge>}
                {effStatus === 'expired' && <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Expirado</Badge>}
              </div>
              <p className="text-sm mt-1">
                <span className="text-muted-foreground">Criado por:</span>{' '}{inviter?.full_name || 'Usuário'}
                {item.name && <span className="ml-2">• Para: {item.name}</span>}
                {item.email && <span className="ml-2">• {item.email}</span>}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          );
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-primary" />
            Convites
          </h1>
          <p className="text-muted-foreground">Convide novos membros para a comunidade</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Convite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Criar Convite</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-rd-no-capture="true">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do convidado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (opcional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo do convidado *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o grupo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableTeams.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">Você não pertence a nenhum grupo</div>
                          ) : (
                            availableTeams.map(team => (
                              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <p className="text-sm text-muted-foreground">
                  O convidado verá apenas os encontros do grupo selecionado.
                  {' '}Se informar o email, o convite será enviado automaticamente.
                </p>

                <Button type="submit" className="w-full" disabled={createInvitation.isPending}>
                  {createInvitation.isPending ? 'Criando...' : 'Criar Convite'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{effectiveStats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-600">{effectiveStats.pending}</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{effectiveStats.accepted}</p>
            <p className="text-sm text-muted-foreground">Aceitos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-muted-foreground">{effectiveStats.expired}</p>
            <p className="text-sm text-muted-foreground">Expirados</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Convites */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Convites</CardTitle>
          <CardDescription>Gerencie seus convites enviados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse p-4 rounded-lg bg-muted">
                  <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : invitations?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum convite criado ainda</p>
              <p className="text-sm">Crie seu primeiro convite e expanda a comunidade!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations?.map((invitation) => {
                const effectiveStatus = getEffectiveStatus(invitation);
                return (
                  <div
                    key={invitation.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <code className="text-lg font-mono font-bold text-primary">{invitation.code}</code>
                        {getStatusBadge(invitation)}
                        {invitation.team_id && teamNamesMap[invitation.team_id] && (
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            {teamNamesMap[invitation.team_id]}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invitation.name && <span className="mr-2">{invitation.name}</span>}
                        {invitation.email && (
                          <span className="flex items-center gap-1 inline">
                            <Mail className="h-3 w-3" />
                            {invitation.email}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Criado {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true, locale: ptBR })}
                        {effectiveStatus === 'pending' && (
                          <span className="ml-2">
                            • Expira em {formatDistanceToNow(new Date(invitation.expires_at), { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {effectiveStatus === 'pending' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => copyLink(invitation.code)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => shareInvite(invitation)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {effectiveStatus !== 'accepted' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir convite?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. O convite será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInvitation.mutate(invitation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
