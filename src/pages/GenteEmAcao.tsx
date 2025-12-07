import { useState } from 'react';
import { useGenteEmAcao } from '@/hooks/useGenteEmAcao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MemberSelect from '@/components/MemberSelect';
import { Loader2, Plus, Handshake, User, Users, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { z } from 'zod';

const formSchema = z.object({
  meeting_type: z.enum(['membro', 'convidado']),
  partner_id: z.string().optional(),
  guest_name: z.string().max(100).optional(),
  guest_company: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  meeting_date: z.string().min(1, 'Data é obrigatória'),
});

export default function GenteEmAcao() {
  const { meetings, isLoading, createMeeting, deleteMeeting } = useGenteEmAcao();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    meeting_type: 'membro' as 'membro' | 'convidado',
    partner_id: '',
    guest_name: '',
    guest_company: '',
    notes: '',
    meeting_date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (formData.meeting_type === 'membro' && !formData.partner_id) {
      setErrors({ partner_id: 'Selecione um membro' });
      return;
    }

    if (formData.meeting_type === 'convidado' && !formData.guest_name.trim()) {
      setErrors({ guest_name: 'Nome do convidado é obrigatório' });
      return;
    }

    await createMeeting.mutateAsync(formData);
    setOpen(false);
    setFormData({
      meeting_type: 'membro',
      partner_id: '',
      guest_name: '',
      guest_company: '',
      notes: '',
      meeting_date: new Date().toISOString().split('T')[0],
    });
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="w-6 h-6 text-primary" />
            Gente em Ação
          </h1>
          <p className="text-muted-foreground">Registre suas reuniões 1-a-1</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Reunião
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Reunião</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Reunião</Label>
                <RadioGroup
                  value={formData.meeting_type}
                  onValueChange={(v) => setFormData({ ...formData, meeting_type: v as 'membro' | 'convidado' })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="membro" id="membro" />
                    <Label htmlFor="membro" className="flex items-center gap-1 cursor-pointer">
                      <Users className="w-4 h-4" /> Com Membro
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="convidado" id="convidado" />
                    <Label htmlFor="convidado" className="flex items-center gap-1 cursor-pointer">
                      <User className="w-4 h-4" /> Com Convidado
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.meeting_type === 'membro' ? (
                <div className="space-y-2">
                  <Label>Membro</Label>
                  <MemberSelect
                    value={formData.partner_id}
                    onChange={(v) => setFormData({ ...formData, partner_id: v })}
                    placeholder="Selecione o membro"
                  />
                  {errors.partner_id && <p className="text-sm text-destructive">{errors.partner_id}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest_name">Nome do Convidado</Label>
                    <Input
                      id="guest_name"
                      value={formData.guest_name}
                      onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                      placeholder="Nome"
                      maxLength={100}
                    />
                    {errors.guest_name && <p className="text-sm text-destructive">{errors.guest_name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest_company">Empresa</Label>
                    <Input
                      id="guest_company"
                      value={formData.guest_company}
                      onChange={(e) => setFormData({ ...formData, guest_company: e.target.value })}
                      placeholder="Empresa"
                      maxLength={100}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="meeting_date">Data da Reunião</Label>
                <Input
                  id="meeting_date"
                  type="date"
                  value={formData.meeting_date}
                  onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                  required
                />
                {errors.meeting_date && <p className="text-sm text-destructive">{errors.meeting_date}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Anotações sobre a reunião..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMeeting.isPending}>
                {createMeeting.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  'Registrar Reunião'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{meetings?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total de Reuniões</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {meetings?.filter((m) => m.meeting_type === 'membro').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Com Membros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {meetings?.filter((m) => m.meeting_type === 'convidado').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Com Convidados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Reuniões */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Reuniões</CardTitle>
          <CardDescription>Histórico de reuniões 1-a-1</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !meetings?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Handshake className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma reunião registrada ainda</p>
              <p className="text-sm">Clique em "Nova Reunião" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    {meeting.meeting_type === 'membro' && meeting.partner ? (
                      <>
                        <AvatarImage src={meeting.partner.avatar_url || ''} />
                        <AvatarFallback>{getInitials(meeting.partner.full_name)}</AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback className="bg-orange-100 text-orange-600">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {meeting.meeting_type === 'membro'
                          ? meeting.partner?.full_name
                          : meeting.guest_name}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          meeting.meeting_type === 'membro'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {meeting.meeting_type === 'membro' ? 'Membro' : 'Convidado'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {meeting.meeting_type === 'membro'
                        ? meeting.partner?.company
                        : meeting.guest_company}
                    </p>
                    {meeting.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{meeting.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(meeting.meeting_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMeeting.mutate(meeting.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
