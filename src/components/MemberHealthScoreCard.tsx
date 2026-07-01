/**
 * @file MemberHealthScoreCard.tsx
 * @description Card administrativo que exibe o Health Score (índice de engajamento)
 * por membro nos últimos N dias, classificando-os em Saudável / Atenção / Risco.
 * É uma métrica de retenção e NÃO interfere na pontuação/ranking de gamificação.
 * @copyright Ranktop / Gente Networking
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { HeartPulse, Loader2, Info, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemberHealthScores, type HealthLevel } from '@/hooks/useMemberHealthScores';

const LEVEL_META: Record<HealthLevel, { label: string; className: string; bar: string }> = {
  saudavel: { label: 'Saudável', className: 'bg-green-500/15 text-green-600 border-green-500/30', bar: '[&>div]:bg-green-500' },
  atencao: { label: 'Atenção', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30', bar: '[&>div]:bg-amber-500' },
  risco: { label: 'Risco', className: 'bg-red-500/15 text-red-600 border-red-500/30', bar: '[&>div]:bg-red-500' },
};

// Pesos usados no cálculo do Health Score (mesma lógica da RPC get_members_health_scores).
const SCORE_WEIGHTS = [
  { label: 'Reunião 1x1 (Gente em Ação)', points: 15 },
  { label: 'Indicação enviada', points: 15 },
  { label: 'Presença em encontro', points: 20 },
  { label: 'Depoimento', points: 10 },
  { label: 'Case de negócio', points: 10 },
  { label: 'Interação no Conselho 24/7', points: 5 },
];

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function MemberHealthScoreCard({ enabled = true }: { enabled?: boolean }) {
  const [days, setDays] = useState('60');
  const { data, isLoading, error } = useMemberHealthScores(Number(days), enabled);


  const counts = (data || []).reduce(
    (acc, m) => {
      acc[m.health_level]++;
      return acc;
    },
    { saudavel: 0, atencao: 0, risco: 0 } as Record<HealthLevel, number>,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              Health Score por Membro
            </CardTitle>
            <CardDescription>
              Índice de engajamento recente (não afeta a pontuação). Ordenado dos mais em risco aos mais ativos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Como o Health Score é calculado">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <p className="font-medium mb-2">Como o Health Score é calculado</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Para cada membro somamos os pontos das atividades registradas no período selecionado.
                  O total é limitado a 100. É uma métrica de retenção e <strong>não</strong> afeta a
                  pontuação/ranking de gamificação.
                </p>
                <ul className="space-y-1.5 text-sm">
                  {SCORE_WEIGHTS.map((w) => (
                    <li key={w.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{w.label}</span>
                      <span className="font-medium">+{w.points}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                  <p><strong className="text-green-600">Saudável</strong>: 60 ou mais</p>
                  <p><strong className="text-amber-600">Atenção</strong>: 30 a 59</p>
                  <p><strong className="text-red-600">Risco</strong>: abaixo de 30</p>
                </div>
              </PopoverContent>
            </Popover>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" className={LEVEL_META.saudavel.className}>{counts.saudavel} saudáveis</Badge>
          <Badge variant="outline" className={LEVEL_META.atencao.className}>{counts.atencao} em atenção</Badge>
          <Badge variant="outline" className={LEVEL_META.risco.className}>{counts.risco} em risco</Badge>
        </div>

      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (data || []).length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum membro encontrado</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {(data || []).map((m) => {
                const meta = LEVEL_META[m.health_level];
                return (
                  <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.avatar_url || ''} />
                      <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{m.full_name}</p>
                        <Badge variant="outline" className={`${meta.className} text-xs`}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.team_name || 'Sem grupo'}
                        {' · '}
                        {m.last_activity_at
                          ? `ativo ${formatDistanceToNow(new Date(m.last_activity_at), { addSuffix: true, locale: ptBR })}`
                          : 'sem atividade recente'}
                      </p>
                      <Progress value={m.health_score} className={`h-1.5 mt-1.5 ${meta.bar}`} />
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{m.health_score}</div>
                      <p className="text-[10px] text-muted-foreground">/100</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
