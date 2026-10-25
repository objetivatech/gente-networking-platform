/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft } from 'lucide-react';
export function PersonRoleDialog({ profileId, name, teams }: { profileId: string; name: string; teams: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<'convidado' | 'assinante' | 'membro'>('convidado');
  const [teamId, setTeamId] = useState('');
  const qc = useQueryClient();
  const { toast } = useToast();
  const change = useMutation({ mutationFn: async () => {
    const { error } = await supabase.rpc('admin_change_community_role', { _profile_id: profileId, _role: role, _team_id: role === 'membro' ? teamId : null });
    if (error) throw error;
  }, onSuccess: () => { for (const key of ['all-people-admin','user-role','user-entitlements','members-directory','guests-directory','community-showcase','teams']) qc.invalidateQueries({ queryKey: [key] }); setOpen(false); toast({ title: 'Papel atualizado' }); },
    onError: (error: Error) => toast({ title: 'Não foi possível mudar o papel', description: error.message, variant: 'destructive' }),
  });
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm"><ArrowRightLeft className="h-4 w-4 mr-1" />Papel</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Alterar papel</DialogTitle><DialogDescription>Confirme o novo papel de {name}. Assinaturas e histórico são preservados; planos incompatíveis precisam ser revisados antes.</DialogDescription></DialogHeader>
      <Label>Papel</Label><Select value={role} onValueChange={value => setRole(value as typeof role)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="convidado">Convidado</SelectItem><SelectItem value="assinante">Assinante da Comunidade</SelectItem><SelectItem value="membro">Membro</SelectItem></SelectContent></Select>
      {role === 'membro' && <><Label>Grupo</Label><Select value={teamId} onValueChange={setTeamId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent></Select></>}
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={change.isPending || (role === 'membro' && !teamId)} onClick={() => change.mutate()}>Confirmar alteração</Button></DialogFooter>
    </DialogContent></Dialog>;
}