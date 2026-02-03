import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProfile } from '@/hooks/useProfile';
import { useGuestData } from '@/hooks/useGuestData';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  Star, 
  Trophy,
  Handshake,
  MessageSquare,
  DollarSign,
  Send,
  CheckCircle,
  UserCheck,
  AlertCircle,
  CalendarCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/date-utils';
import logoGente from '@/assets/logo-gente.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function GuestWelcome() {
  const { profile } = useProfile();
  const { guestData, guestMeetings, isLoading, confirmAttendance, cancelAttendance } = useGuestData();

  const benefits = [
    { icon: Handshake, title: 'Gente em Ação', description: 'Participe de reuniões 1-a-1 com membros da comunidade' },
    { icon: MessageSquare, title: 'Depoimentos', description: 'Receba e envie depoimentos profissionais' },
    { icon: Send, title: 'Indicações', description: 'Receba indicações qualificadas de negócios' },
    { icon: DollarSign, title: 'Negócios', description: 'Feche negócios através da rede de contatos' },
    { icon: Trophy, title: 'Gamificação', description: 'Acumule pontos e suba de rank na comunidade' },
  ];

  // Verificar se já confirmou presença em algum encontro
  const confirmedMeeting = guestMeetings?.find(m => m.is_attending);

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header de Boas-vindas */}
      <div className="text-center py-8">
        <img 
          src={logoGente} 
          alt="Gente Networking" 
          className="w-24 h-auto mx-auto mb-4"
        />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bem-vindo ao Gente Networking, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Você está como <Badge variant="secondary" className="mx-1">Convidado</Badge> da comunidade.
          Participe dos encontros e conheça os membros para se tornar um membro efetivo!
        </p>
      </div>

      {/* Card do Membro que Convidou */}
      {guestData?.inviter && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Seu Convite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={guestData.inviter.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {guestData.inviter.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{guestData.inviter.full_name}</p>
                {guestData.inviter.company && (
                  <p className="text-muted-foreground">{guestData.inviter.company}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Convidou você para participar do Gente Networking
                </p>
              </div>
            </div>
            {guestData.inviterTeams.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Grupos:</span>
                {guestData.inviterTeams.map(team => (
                  <Badge 
                    key={team.id} 
                    variant="outline"
                    style={{ borderColor: team.color, color: team.color }}
                  >
                    {team.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerta sobre compromisso já confirmado */}
      {confirmedMeeting && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CalendarCheck className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-700">Presença Confirmada!</AlertTitle>
          <AlertDescription className="text-green-600">
            Você confirmou presença no encontro <strong>{confirmedMeeting.title}</strong> em{' '}
            {format(parseLocalDate(confirmedMeeting.meeting_date), "dd 'de' MMMM", { locale: ptBR })}.
            Aguardamos você!
          </AlertDescription>
        </Alert>
      )}

      {/* Card de Status */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Como se tornar um Membro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Para se tornar um membro efetivo do Gente Networking, siga estes passos:
          </p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${confirmedMeeting ? 'bg-green-500 text-white' : 'bg-primary/10'}`}>
                {confirmedMeeting ? <CheckCircle className="h-4 w-4" /> : <span className="text-sm font-bold text-primary">1</span>}
              </div>
              <div>
                <p className="font-medium">Confirme presença em um encontro</p>
                <p className="text-sm text-muted-foreground">
                  Escolha uma data nos encontros disponíveis do grupo de {guestData?.inviter?.full_name?.split(' ')[0]}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Participe do encontro</p>
                <p className="text-sm text-muted-foreground">
                  Compareça ao encontro e conheça os membros da comunidade
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">Solicite sua adesão</p>
                <p className="text-sm text-muted-foreground">
                  Após participar, converse com o facilitador do grupo para se tornar membro
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Encontros Filtrados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Escolha um Encontro para Participar
          </CardTitle>
          <CardDescription>
            {guestData?.inviter ? (
              <>Encontros disponíveis do grupo de {guestData.inviter.full_name.split(' ')[0]}</>
            ) : (
              <>Selecione uma data para sua primeira visita</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse p-4 rounded-lg bg-muted">
                  <div className="h-4 bg-muted-foreground/20 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : guestMeetings?.length ? (
            <div className="space-y-3">
              {/* Aviso importante */}
              <Alert variant="default" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription>
                  Ao confirmar sua presença, você assume o compromisso de comparecer ao encontro. 
                  Sua participação é fundamental para conhecer a comunidade e iniciar sua jornada no Gente Networking.
                </AlertDescription>
              </Alert>

              {guestMeetings.map((meeting) => (
                <div 
                  key={meeting.id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    meeting.is_attending 
                      ? 'bg-green-500/10 border-green-500/50' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{meeting.title}</h4>
                        {meeting.team && (
                          <Badge 
                            variant="outline" 
                            style={{ borderColor: meeting.team.color, color: meeting.team.color }}
                          >
                            {meeting.team.name}
                          </Badge>
                        )}
                        {meeting.is_attending && (
                          <Badge className="bg-green-500">Confirmado</Badge>
                        )}
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground">{meeting.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(parseLocalDate(meeting.meeting_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        {meeting.meeting_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {meeting.meeting_time.slice(0, 5)}
                          </span>
                        )}
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {meeting.location}
                          </span>
                        )}
                        {meeting.attendees_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {meeting.attendees_count} confirmados
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {meeting.is_attending ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelAttendance.mutate(meeting.id)}
                          disabled={cancelAttendance.isPending}
                        >
                          Cancelar Presença
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => confirmAttendance.mutate(meeting.id)}
                          disabled={confirmAttendance.isPending || !!confirmedMeeting}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar Presença
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg bg-muted/50">
              <div className="text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nenhum encontro agendado</p>
                <p className="text-sm">
                  {guestData?.inviter 
                    ? `O grupo de ${guestData.inviter.full_name.split(' ')[0]} ainda não tem encontros agendados.`
                    : 'Em breve teremos novos encontros!'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefícios de ser Membro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Benefícios de ser Membro
          </CardTitle>
          <CardDescription>
            Veja o que você terá acesso ao se tornar um membro efetivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3 p-4 rounded-lg border">
                <div className="p-2 rounded-lg bg-primary/10">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{benefit.title}</p>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Pronto para fazer parte?</h3>
          <p className="text-muted-foreground mb-4">
            Complete seu perfil e confirme sua presença em um encontro para começar!
          </p>
          <Button asChild size="lg">
            <a href="/perfil">Completar Meu Perfil</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
