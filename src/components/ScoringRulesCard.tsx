import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Handshake, UserCheck, Send, MessageSquare, DollarSign, UserPlus, MessageCircle, Briefcase } from 'lucide-react';

interface ScoringRulesCardProps {
  compact?: boolean;
}

const scoringRules = [
  { icon: Handshake, label: 'Gente em Ação', points: '25 pts', description: 'por reunião 1-a-1' },
  { icon: Send, label: 'Indicações', points: '20 pts', description: 'por indicação' },
  { icon: UserCheck, label: 'Presenças', points: '20 pts', description: 'por encontro' },
  { icon: MessageSquare, label: 'Depoimentos', points: '15 pts', description: 'por depoimento' },
  { icon: UserPlus, label: 'Convites', points: '15 pts', description: 'por convidado presente' },
  { icon: Briefcase, label: 'Case de Negócio', points: '15 pts', description: 'por case publicado (20 pts para indicador)' },
  { icon: MessageCircle, label: 'Conselho 24/7', points: '5-10 pts', description: '5 resposta + 5 melhor' },
  { icon: DollarSign, label: 'Negócios', points: '5 pts', description: 'por R$ 100' },
];

export default function ScoringRulesCard({ compact = false }: ScoringRulesCardProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {scoringRules.map((rule) => (
          <div
            key={rule.label}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
          >
            <rule.icon className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-secondary">{rule.points}</span>
              <span className="text-muted-foreground ml-1 truncate">{rule.description}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sistema de Pontuação</CardTitle>
        <CardDescription>Como acumular pontos no Gente Networking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scoringRules.map((rule) => (
            <div
              key={rule.label}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <rule.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{rule.label}</p>
                <p className="text-sm">
                  <span className="font-bold text-secondary">{rule.points}</span>
                  <span className="text-muted-foreground ml-1">{rule.description}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
