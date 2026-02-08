import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGenteEmAcao } from '@/hooks/useGenteEmAcao';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MemberSelect from '@/components/MemberSelect';
import { Loader2, Plus, Handshake, User, Users, Trash2, Calendar, ImagePlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  meeting_type: z.enum(['membro', 'convidado']),
  partner_id: z.string().optional(),
  guest_name: z.string().max(100).optional(),
  guest_company: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  meeting_date: z.string().min(1, 'Data é obrigatória'),
});

// Função para comprimir imagem
async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Falha ao comprimir imagem'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GenteEmAcao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { meetings, isLoading, createMeeting, deleteMeeting } = useGenteEmAcao();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    meeting_type: 'membro' as 'membro' | 'convidado',
    partner_id: '',
    guest_name: '',
    guest_company: '',
    notes: '',
    meeting_date: new Date().toISOString().split('T')[0],
    selected_guest_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar convidados relacionados ao grupo do membro
  const { data: teamGuests } = useQuery({
    queryKey: ['team-guests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Primeiro, buscar grupos onde o usuário é membro
      const { data: teamMemberships, error: tmError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (tmError || !teamMemberships?.length) return [];

      const teamIds = teamMemberships.map(tm => tm.team_id);

      // Buscar todos os membros desses grupos
      const { data: allTeamMembers, error: amError } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds);

      if (amError || !allTeamMembers?.length) return [];

      const memberIds = [...new Set(allTeamMembers.map(m => m.user_id))];

      // Buscar usuários que são convidados
      const { data: guestRoles, error: grError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'convidado')
        .in('user_id', memberIds);

      if (grError || !guestRoles?.length) return [];

      const guestIds = guestRoles.map(g => g.user_id);

      // Buscar perfis dos convidados
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name, company, avatar_url')
        .in('id', guestIds);

      if (pError) return [];
      return profiles || [];
    },
    enabled: !!user?.id,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor, selecione uma imagem', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 10MB', variant: 'destructive' });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user?.id) return null;

    try {
      setUploading(true);
      const compressedBlob = await compressImage(imageFile);
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Usando bucket existente
        .upload(`gente-em-acao/${fileName}`, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(`gente-em-acao/${fileName}`);
      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({ title: 'Erro', description: 'Falha ao fazer upload da imagem', variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

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

    // Se selecionou convidado do grupo, preencher nome
    let guestName = formData.guest_name;
    let guestCompany = formData.guest_company;
    
    if (formData.meeting_type === 'convidado' && formData.selected_guest_id) {
      const selectedGuest = teamGuests?.find(g => g.id === formData.selected_guest_id);
      if (selectedGuest) {
        guestName = selectedGuest.full_name;
        guestCompany = selectedGuest.company || '';
      }
    }

    if (formData.meeting_type === 'convidado' && !guestName?.trim()) {
      setErrors({ guest_name: 'Nome do convidado é obrigatório' });
      return;
    }

    // Upload da imagem se houver
    const imageUrl = await uploadImage();

    await createMeeting.mutateAsync({
      ...formData,
      guest_name: guestName,
      guest_company: guestCompany,
      image_url: imageUrl || undefined,
    });
    
    setOpen(false);
    setFormData({
      meeting_type: 'membro',
      partner_id: '',
      guest_name: '',
      guest_company: '',
      notes: '',
      meeting_date: new Date().toISOString().split('T')[0],
      selected_guest_id: '',
    });
    removeImage();
  };

  const handleGuestSelect = (guestId: string) => {
    if (guestId === 'manual') {
      setFormData({ ...formData, selected_guest_id: '', guest_name: '', guest_company: '' });
    } else {
      const guest = teamGuests?.find(g => g.id === guestId);
      setFormData({
        ...formData,
        selected_guest_id: guestId,
        guest_name: guest?.full_name || '',
        guest_company: guest?.company || '',
      });
    }
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Reunião</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Reunião</Label>
                <RadioGroup
                  value={formData.meeting_type}
                  onValueChange={(v) => setFormData({ ...formData, meeting_type: v as 'membro' | 'convidado', selected_guest_id: '' })}
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
                <div className="space-y-4">
                  {/* Seleção de convidado do grupo */}
                  {teamGuests && teamGuests.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selecionar Convidado</Label>
                      <Select value={formData.selected_guest_id || 'manual'} onValueChange={handleGuestSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha um convidado ou preencha manualmente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">
                            <span className="text-muted-foreground">Preencher manualmente</span>
                          </SelectItem>
                          {teamGuests.map((guest) => (
                            <SelectItem key={guest.id} value={guest.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={guest.avatar_url || ''} />
                                  <AvatarFallback className="text-xs">{getInitials(guest.full_name)}</AvatarFallback>
                                </Avatar>
                                <span>{guest.full_name}</span>
                                {guest.company && <span className="text-muted-foreground">({guest.company})</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guest_name">Nome do Convidado</Label>
                      <Input
                        id="guest_name"
                        value={formData.guest_name}
                        onChange={(e) => setFormData({ ...formData, guest_name: e.target.value, selected_guest_id: '' })}
                        placeholder="Nome"
                        maxLength={100}
                        disabled={!!formData.selected_guest_id}
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
                        disabled={!!formData.selected_guest_id}
                      />
                    </div>
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

              {/* Upload de Imagem */}
              <div className="space-y-2">
                <Label>Foto do Encontro (opcional)</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Adicionar foto</span>
                    </div>
                  </Button>
                )}
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

              <Button type="submit" className="w-full" disabled={createMeeting.isPending || uploading}>
                {createMeeting.isPending || uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploading ? 'Enviando imagem...' : 'Salvando...'}</>
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
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                >
                  <Avatar className="h-12 w-12 border-2 border-primary/20 flex-shrink-0">
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
                    <div className="flex items-center gap-2 flex-wrap">
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
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{meeting.notes}</p>
                    )}
                    {meeting.image_url && (
                      <img 
                        src={meeting.image_url} 
                        alt="Foto do encontro" 
                        className="mt-2 h-24 w-auto rounded-lg object-cover cursor-pointer hover:opacity-90"
                        onClick={() => window.open(meeting.image_url!, '_blank')}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(parseLocalDate(meeting.meeting_date), "dd/MM/yyyy", { locale: ptBR })}
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