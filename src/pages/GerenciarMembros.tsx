/**
 * @page GerenciarMembros
 * @route /admin/membros
 * @description Gerenciamento de membros ativos/inativos - apenas para administradores
 * 
 * @features
 * - Lista todos os membros (ativos e inativos)
 * - Ativar/desativar membros
 * - Motivo da desativação
 * - Histórico de membros que saíram
 * 
 * @access Apenas administradores
 * @since 2024-12-19
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserX, 
  UserCheck, 
  Search, 
  Mail,
  Phone,
  Building,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberData {
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
}

export default function GerenciarMembros() {
  const { isAdmin, isLoading: isLoadingRole } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');

  // Buscar todos os membros (ativos e inativos), excluindo convidados
  const { data: members, isLoading } = useQuery({
    queryKey: ['admin-members'],
    queryFn: async () => {
      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company, avatar_url, is_active, deactivated_at, deactivation_reason, created_at')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Buscar roles para filtrar convidados
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Map de user_id -> role
      const rolesMap: Record<string, string> = {};
      roles?.forEach(r => {
        rolesMap[r.user_id] = r.role;
      });

      // Filtrar apenas membros (não convidados)
      const filteredProfiles = profiles?.filter(profile => {
        const role = rolesMap[profile.id];
        return role !== 'convidado';
      }) || [];

      return filteredProfiles as MemberData[];
    },
  });

  // Mutation para desativar membro
  const deactivateMutation = useMutation({
    mutationFn: async ({ memberId, reason }: { memberId: string; reason: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivation_reason: reason || null,
        })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      queryClient.invalidateQueries({ queryKey: ['members-directory'] });
      toast({
        title: 'Membro desativado',
        description: 'O membro foi desativado e movido para o histórico.',
      });
      setShowDeactivateDialog(false);
      setSelectedMember(null);
      setDeactivationReason('');
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar o membro.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para reativar membro
  const activateMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: true,
          deactivated_at: null,
          deactivation_reason: null,
        })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      queryClient.invalidateQueries({ queryKey: ['members-directory'] });
      toast({
        title: 'Membro reativado',
        description: 'O membro foi reativado e está visível novamente.',
      });
      setShowActivateDialog(false);
      setSelectedMember(null);
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível reativar o membro.',
        variant: 'destructive',
      });
    },
  });

  // Apenas admins podem acessar
  if (!isLoadingRole && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const filteredMembers = members?.filter(member => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.company?.toLowerCase().includes(searchLower)
    );
  });

  const activeMembers = filteredMembers?.filter(m => m.is_active) || [];
  const inactiveMembers = filteredMembers?.filter(m => !m.is_active) || [];

  const handleDeactivate = () => {
    if (!selectedMember) return;
    deactivateMutation.mutate({
      memberId: selectedMember.id,
      reason: deactivationReason,
    });
  };

  const handleActivate = () => {
    if (!selectedMember) return;
    activateMutation.mutate(selectedMember.id);
  };

  const MemberRow = ({ member, showDeactivateBtn }: { member: MemberData; showDeactivateBtn: boolean }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={member.avatar_url || ''} alt={member.full_name} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {getInitials(member.full_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold flex items-center gap-2">
            {member.full_name}
            {!member.is_active && (
              <Badge variant="destructive" className="text-xs">Inativo</Badge>
            )}
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {member.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {member.email}
              </span>
            )}
            {member.company && (
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {member.company}
              </span>
            )}
          </div>
          {!member.is_active && member.deactivated_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Desativado em {format(new Date(member.deactivated_at), "dd/MM/yyyy", { locale: ptBR })}
              {member.deactivation_reason && ` - ${member.deactivation_reason}`}
            </p>
          )}
        </div>
      </div>
      <div>
        {showDeactivateBtn ? (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setSelectedMember(member);
              setShowDeactivateDialog(true);
            }}
          >
            <UserX className="h-4 w-4 mr-1" />
            Desativar
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 hover:text-green-600"
            onClick={() => {
              setSelectedMember(member);
              setShowActivateDialog(true);
            }}
          >
            <UserCheck className="h-4 w-4 mr-1" />
            Reativar
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
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Membros</h1>
          <p className="text-muted-foreground">Ative ou desative membros da comunidade</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeMembers.length}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
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
                <p className="text-2xl font-bold">{inactiveMembers.length}</p>
                <p className="text-sm text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Ativos ({activeMembers.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="gap-2">
            <UserX className="h-4 w-4" />
            Inativos ({inactiveMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : activeMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum membro ativo encontrado
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeMembers.map(member => (
                <MemberRow key={member.id} member={member} showDeactivateBtn />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : inactiveMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum membro inativo</p>
                <p className="text-sm mt-1">Membros desativados aparecerão aqui para consulta ou reativação</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {inactiveMembers.map(member => (
                <MemberRow key={member.id} member={member} showDeactivateBtn={false} />
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
              Desativar Membro
            </DialogTitle>
            <DialogDescription>
              Ao desativar <strong>{selectedMember?.full_name}</strong>, o membro não aparecerá mais nas listagens,
              mas seus dados serão mantidos para histórico e consulta.
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
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Desativando...' : 'Desativar Membro'}
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
              Reativar Membro
            </DialogTitle>
            <DialogDescription>
              Deseja reativar <strong>{selectedMember?.full_name}</strong>? 
              O membro voltará a aparecer nas listagens da comunidade.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleActivate}
              disabled={activateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {activateMutation.isPending ? 'Reativando...' : 'Reativar Membro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
