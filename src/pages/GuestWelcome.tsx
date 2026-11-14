import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { GuestAgenda } from '@/components/guests/GuestAgenda';
import { CheckCircle } from 'lucide-react';
const logoGente = '/logo-gente-networking-branco.png';

export default function GuestWelcome() {
  const { profile } = useProfile();
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header de Boas-vindas */}
      <div className="text-center py-8">
        <span className="inline-flex rounded-2xl bg-primary px-6 py-4 mb-4">
          <img 
            src={logoGente} 
            alt="Gente Networking" 
            className="w-40 h-auto mx-auto"
          />
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Bem-vindo ao Gente Networking, {profile?.full_name?.split(' ')?.[0] ?? 'Convidado'}!
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Você está como <Badge variant="secondary" className="mx-1">Convidado</Badge> da comunidade.
          Participe dos encontros e conheça os membros para se tornar um membro efetivo!
        </p>
      </div>

      <GuestAgenda />

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
