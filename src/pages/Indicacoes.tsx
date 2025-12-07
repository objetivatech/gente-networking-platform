import { useState } from 'react';
import { useReferrals } from '@/hooks/useReferrals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MemberSelect from '@/components/MemberSelect';
import { Loader2, Plus, Send, Inbox, Trash2, Phone, Mail, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';

const formSchema = z.object({
  to_user_id: z.string().min(1, 'Selecione um membro'),
  contact_name: z.string().trim().min(2, 'Nome é obrigatório').max(100),
  contact_phone: z.string().max(20).optional(),
  contact_email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
});

export default function Indicacoes() {
  const { sentReferrals, receivedReferrals, isLoading, createReferral, deleteReferral } = useReferrals();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ to_user_id: '', contact_name: '', contact_phone: '', contact_email: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    await createReferral.mutateAsync(formData);
    setOpen(false);
    setFormData({ to_user_id: '', contact_name: '', contact_phone: '', contact_email: '', notes: '' });
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const ReferralCard = ({ referral, type }: { referral: any; type: 'sent' | 'received' }) => {
    const user = type === 'sent' ? referral.to_user : referral.from_user;
    const label = type === 'sent' ? 'Para' : 'De';

    return (
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src={user?.avatar_url || ''} />
            <AvatarFallback>{getInitials(user?.full_name || 'U')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs text-muted-foreground">{label}: </span>
                <span className="font-medium">{user?.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(referral.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                {type === 'sent' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteReferral.mutate(referral.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{referral.contact_name}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {referral.contact_phone && (
                  <a href={`tel:${referral.contact_phone}`} className="flex items-center gap-1 hover:text-primary">
                    <Phone className="w-3.5 h-3.5" /> {referral.contact_phone}
                  </a>
                )}
                {referral.contact_email && (
                  <a href={`mailto:${referral.contact_email}`} className="flex items-center gap-1 hover:text-primary">
                    <Mail className="w-3.5 h-3.5" /> {referral.contact_email}
                  </a>
                )}
              </div>
              {referral.notes && <p className="mt-2 text-sm text-muted-foreground">{referral.notes}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" />
            Indicações
          </h1>
          <p className="text-muted-foreground">Leads compartilhados entre membros</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Nova Indicação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar Indicação</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Para qual membro?</Label>
                <MemberSelect value={formData.to_user_id} onChange={(v) => setFormData({ ...formData, to_user_id: v })} placeholder="Selecione o membro" />
                {errors.to_user_id && <p className="text-sm text-destructive">{errors.to_user_id}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome do Contato</Label>
                <Input id="contact_name" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} placeholder="Nome completo" maxLength={100} required />
                {errors.contact_name && <p className="text-sm text-destructive">{errors.contact_name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefone</Label>
                  <Input id="contact_phone" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="(11) 99999-9999" maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Email</Label>
                  <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="email@exemplo.com" />
                  {errors.contact_email && <p className="text-sm text-destructive">{errors.contact_email}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Informações adicionais..." rows={3} maxLength={500} />
              </div>
              <Button type="submit" className="w-full" disabled={createReferral.isPending}>
                {createReferral.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Enviar Indicação</>}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4"><div className="text-center"><p className="text-3xl font-bold text-blue-600">{sentReferrals?.length || 0}</p><p className="text-sm text-muted-foreground">Enviadas</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-center"><p className="text-3xl font-bold text-green-600">{receivedReferrals?.length || 0}</p><p className="text-sm text-muted-foreground">Recebidas</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2"><Inbox className="w-4 h-4" /> Recebidas</TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2"><Send className="w-4 h-4" /> Enviadas</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Indicações Recebidas</CardTitle><CardDescription>Leads que outros membros enviaram para você</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                : !receivedReferrals?.length ? <div className="text-center py-8 text-muted-foreground"><Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhuma indicação recebida</p></div>
                : <div className="space-y-4">{receivedReferrals.map((r) => <ReferralCard key={r.id} referral={r} type="received" />)}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Indicações Enviadas</CardTitle><CardDescription>Leads que você compartilhou com outros membros</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                : !sentReferrals?.length ? <div className="text-center py-8 text-muted-foreground"><Send className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhuma indicação enviada</p></div>
                : <div className="space-y-4">{sentReferrals.map((r) => <ReferralCard key={r.id} referral={r} type="sent" />)}</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
