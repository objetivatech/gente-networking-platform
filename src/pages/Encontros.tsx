import { useState } from 'react';
import { useMeetings, useMeetingAttendees } from '@/hooks/useMeetings';
import { useAdminMeetings, useUserRole } from '@/hooks/useAdmin';
import { useTeams } from '@/hooks/useTeams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Calendar, MapPin, Clock, Users, Check, X, Trash2 } from 'lucide-react';
import { format, isPast, isToday, isFuture, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';

export default function Encontros() {
  const { meetings, isLoading, toggleAttendance, removeAttendance } = useMeetings();
  const { data: userRole } = useUserRole();
  const { createMeeting, deleteMeeting } = useAdminMeetings();
  const { teams } = useTeams();
  const [open, setOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', meeting_date: '', meeting_time: '', location: '', team_id: '' });

  const isAdmin = userRole === 'admin' || userRole === 'facilitador';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMeeting.mutateAsync({ ...formData, team_id: formData.team_id || undefined });
    setOpen(false);
    setFormData({ title: '', description: '', meeting_date: '', meeting_time: '', location: '', team_id: '' });
  };

  const upcomingMeetings = (meetings?.filter(m => isFuture(parseLocalDate(m.meeting_date)) || isToday(parseLocalDate(m.meeting_date))) || [])
    .sort((a, b) => parseLocalDate(a.meeting_date).getTime() - parseLocalDate(b.meeting_date).getTime());
  const pastMeetings = (meetings?.filter(m => isPast(parseLocalDate(m.meeting_date)) && !isToday(parseLocalDate(m.meeting_date))) || [])
    .sort((a, b) => parseLocalDate(b.meeting_date).getTime() - parseLocalDate(a.meeting_date).getTime());

  const MeetingCard = ({ meeting }: { meeting: typeof meetings[0] }) => {
    const isPastMeeting = isPast(parseLocalDate(meeting.meeting_date)) && !isToday(parseLocalDate(meeting.meeting_date));

    const daysUntil = differenceInDays(parseLocalDate(meeting.meeting_date), new Date());
    const isSoon = !isPastMeeting && daysUntil <= 7 && daysUntil >= 0 && !isToday(parseLocalDate(meeting.meeting_date));

    return (
      <Card className={`transition-all ${isPastMeeting ? 'opacity-70' : isSoon ? 'border-primary/50 shadow-md' : 'hover:shadow-md'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-semibold">{meeting.title}</h3>
                {meeting.team && (
                  <Badge variant="outline" style={{ borderColor: meeting.team.color, color: meeting.team.color }}>
                    {meeting.team.name}
                  </Badge>
                )}
                {isToday(parseLocalDate(meeting.meeting_date)) && <Badge className="bg-primary">Hoje</Badge>}
                {isSoon && <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Em breve</Badge>}
              </div>
              {meeting.description && <p className="text-sm text-muted-foreground mb-3">{meeting.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(parseLocalDate(meeting.meeting_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </div>
                {meeting.meeting_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {meeting.meeting_time.slice(0, 5)}
                  </div>
                )}
                {meeting.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {meeting.location}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {meeting.attendees_count} confirmados
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isPastMeeting && (
                <Button
                  variant={meeting.is_attending ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleAttendance.mutate({ meetingId: meeting.id, isAttending: meeting.is_attending || false })}
                  disabled={toggleAttendance.isPending}
                >
                  {meeting.is_attending ? <><Check className="w-4 h-4 mr-1" /> Confirmado</> : 'Confirmar'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedMeeting(selectedMeeting === meeting.id ? null : meeting.id)}>
                <Users className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMeeting.mutate(meeting.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {selectedMeeting === meeting.id && <AttendeesList meetingId={meeting.id} canRemove={isAdmin} onRemove={(userId) => removeAttendance.mutate({ meetingId: meeting.id, userId })} />}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Encontros
          </h1>
          <p className="text-muted-foreground">Agenda e presenças</p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Novo Encontro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Encontro</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4" data-rd-no-capture="true">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Encontro Quinzenal" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meeting_date">Data</Label>
                    <Input id="meeting_date" type="date" value={formData.meeting_date} onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting_time">Horário</Label>
                    <Input id="meeting_time" type="time" value={formData.meeting_time} onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Local</Label>
                  <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Endereço ou link" />
                </div>
                <div className="space-y-2">
                  <Label>Grupo (opcional)</Label>
                  <Select value={formData.team_id || "all"} onValueChange={(v) => setFormData({ ...formData, team_id: v === "all" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Todos os grupos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os grupos</SelectItem>
                      {teams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detalhes do encontro..." rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={createMeeting.isPending}>
                  {createMeeting.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</> : 'Criar Encontro'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Próximos Encontros ({upcomingMeetings.length})
            </h2>
            {upcomingMeetings.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum encontro agendado</p></CardContent></Card>
            ) : (
              <div className="space-y-4">{upcomingMeetings.map((m) => <MeetingCard key={m.id} meeting={m} />)}</div>
            )}
          </div>

          {pastMeetings.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Encontros Anteriores ({pastMeetings.length})</h2>
              <div className="space-y-4">{pastMeetings.slice(0, 5).map((m) => <MeetingCard key={m.id} meeting={m} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AttendeesList({ meetingId, canRemove, onRemove }: { meetingId: string; canRemove?: boolean; onRemove?: (userId: string) => void }) {
  const { data: attendees, isLoading } = useMeetingAttendees(meetingId);
  const { data: guests, isLoading: isLoadingGuests } = useQuery({
    queryKey: ['meeting-guests', meetingId],
    queryFn: async () => {
      // Get the meeting to find team_id
      const { data: meeting } = await supabase.from('meetings').select('team_id').eq('id', meetingId).single();
      if (!meeting?.team_id) return [];
      
      // Get invitations from members of this team whose accepted guests have attendance for this meeting
      const { data: teamMemberIds } = await supabase.from('team_members').select('user_id').eq('team_id', meeting.team_id);
      if (!teamMemberIds?.length) return [];

      const inviterIds = teamMemberIds.map(tm => tm.user_id);
      const { data: invitations } = await supabase
        .from('invitations')
        .select('id, name, email, accepted_by, invited_by, status')
        .in('invited_by', inviterIds)
        .eq('status', 'accepted');
      
      if (!invitations?.length) return [];

      // Check which accepted guests have attendance for this meeting
      const guestUserIds = invitations.map(i => i.accepted_by).filter(Boolean) as string[];
      if (!guestUserIds.length) return [];

      const { data: guestAttendances } = await supabase
        .from('attendances')
        .select('user_id')
        .eq('meeting_id', meetingId)
        .in('user_id', guestUserIds);

      const attendingGuestIds = new Set(guestAttendances?.map(a => a.user_id) || []);
      if (attendingGuestIds.size === 0) return [];

      // Get profiles of attending guests
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, company')
        .in('id', Array.from(attendingGuestIds));

      return profiles || [];
    },
    enabled: !!meetingId,
  });

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  if (isLoading || isLoadingGuests) return <div className="mt-4 pt-4 border-t"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  
  const memberAttendees = attendees?.filter(a => !guests?.some(g => g.id === a.user_id)) || [];
  const hasGuests = guests && guests.length > 0;
  const hasMembers = memberAttendees.length > 0;

  if (!hasMembers && !hasGuests) return <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">Nenhum confirmado ainda</div>;

  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      {hasMembers && (
        <div>
          <p className="text-sm font-medium mb-2">Membros Confirmados ({memberAttendees.length})</p>
          <div className="flex flex-wrap gap-2">
            {memberAttendees.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted text-sm group">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={a.profile?.avatar_url || ''} />
                  <AvatarFallback className="text-[10px]">{getInitials(a.profile?.full_name || 'U')}</AvatarFallback>
                </Avatar>
                <span>{a.profile?.full_name}</span>
                {canRemove && onRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="ml-1 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remover presença">
                        <X className="w-3 h-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover presença?</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja remover a presença de <strong>{a.profile?.full_name}</strong> deste encontro?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onRemove(a.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {hasGuests && (
        <div>
          <p className="text-sm font-medium mb-2 text-amber-600">Convidados Presentes ({guests.length})</p>
          <div className="flex flex-wrap gap-2">
            {guests.map((g) => (
              <div key={g.id} className="flex items-center gap-2 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={g.avatar_url || ''} />
                  <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">{getInitials(g.full_name || 'C')}</AvatarFallback>
                </Avatar>
                <span>{g.full_name}</span>
                {g.company && <span className="text-xs text-muted-foreground">({g.company})</span>}
                {(g.phone || g.email) && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {g.phone && <span title="Telefone">📱 {g.phone}</span>}
                    {g.phone && g.email && ' · '}
                    {g.email && <span title="Email">✉️ {g.email}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
