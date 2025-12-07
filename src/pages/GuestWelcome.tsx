import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useMeetings } from '@/hooks/useMeetings';
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
  CheckCircle
} from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoGente from '@/assets/logo-gente.png';

export default function GuestWelcome() {
  const { profile } = useProfile();
  const { meetings } = useMeetings();

  const upcomingMeetings = meetings?.filter(m => isFuture(parseISO(m.meeting_date))).slice(0, 3);

  const benefits = [
    { icon: Handshake, title: 'Gente em Ação', description: 'Participe de reuniões 1-a-1 com membros da comunidade' },
    { icon: MessageSquare, title: 'Depoimentos', description: 'Receba e envie depoimentos profissionais' },
    { icon: Send, title: 'Indicações', description: 'Receba indicações qualificadas de negócios' },
    { icon: DollarSign, title: 'Negócios', description: 'Feche negócios através da rede de contatos' },
    { icon: Trophy, title: 'Gamificação', description: 'Acumule pontos e suba de rank na comunidade' },
  ];

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
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Participe de um encontro</p>
                <p className="text-sm text-muted-foreground">
                  Compareça a um dos nossos encontros quinzenais e conheça a comunidade
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Conheça os membros</p>
                <p className="text-sm text-muted-foreground">
                  Interaja com os membros e entenda como funciona o networking
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

      {/* Próximos Encontros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Próximos Encontros
          </CardTitle>
          <CardDescription>
            Participe de um encontro para conhecer a comunidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingMeetings?.length ? (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <h4 className="font-semibold">{meeting.title}</h4>
                  {meeting.description && (
                    <p className="text-sm text-muted-foreground mt-1">{meeting.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(meeting.meeting_date), "dd 'de' MMMM", { locale: ptBR })}
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg bg-muted/50">
              <div className="text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Nenhum encontro agendado</p>
                <p className="text-sm">Em breve teremos novos encontros!</p>
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
            Complete seu perfil e aguarde o convite de um facilitador para participar de um encontro!
          </p>
          <Button asChild size="lg">
            <a href="/perfil">Completar Meu Perfil</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
