import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cake, ChevronLeft, ChevronRight, Gift, Calendar } from 'lucide-react';
import { format, parseISO, isToday, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface MemberBirthday {
  id: string;
  full_name: string;
  avatar_url: string | null;
  company: string | null;
  birthday: string;
}

export default function Aniversarios() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();

  const { data: members, isLoading } = useQuery({
    queryKey: ['birthdays', currentMonth.getMonth(), currentMonth.getFullYear()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, company, birthday')
        .not('birthday', 'is', null);

      if (error) throw error;
      return data as MemberBirthday[];
    },
  });

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMembersForMonth = (date: Date) => {
    if (!members) return [];
    
    return members.filter(member => {
      if (!member.birthday) return false;
      const birthday = parseISO(member.birthday);
      return birthday.getMonth() === date.getMonth();
    }).sort((a, b) => {
      const dayA = parseISO(a.birthday).getDate();
      const dayB = parseISO(b.birthday).getDate();
      return dayA - dayB;
    });
  };

  const isBirthdayToday = (birthday: string) => {
    const date = parseISO(birthday);
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
  };

  const monthMembers = getMembersForMonth(currentMonth);
  const todaysBirthdays = members?.filter(m => m.birthday && isBirthdayToday(m.birthday)) || [];

  const formatBirthdayDay = (birthday: string) => {
    const date = parseISO(birthday);
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cake className="h-6 w-6 text-primary" />
          Calendário de Aniversários
        </h1>
        <p className="text-muted-foreground">Veja os aniversariantes da comunidade</p>
      </div>

      {/* Aniversariantes de Hoje */}
      {todaysBirthdays.length > 0 && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Aniversariantes de Hoje!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {todaysBirthdays.map((member) => (
                <button
                  key={member.id}
                  onClick={() => navigate(`/membro/${member.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted transition-colors"
                >
                  <Avatar className="h-12 w-12 border-2 border-primary">
                    <AvatarImage src={member.avatar_url || ''} alt={member.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-semibold">{member.full_name}</p>
                    {member.company && (
                      <p className="text-sm text-muted-foreground">{member.company}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2">🎂 Hoje!</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegação do Mês */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Hoje
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <Badge variant="outline" className="text-sm">
              {monthMembers.length} aniversariante{monthMembers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : monthMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cake className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aniversariante neste mês</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => navigate(`/membro/${member.id}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex-shrink-0 w-16 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {parseISO(member.birthday).getDate()}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(parseISO(member.birthday), 'MMM', { locale: ptBR })}
                    </p>
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar_url || ''} alt={member.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{member.full_name}</p>
                    {member.company && (
                      <p className="text-sm text-muted-foreground truncate">{member.company}</p>
                    )}
                  </div>
                  {isBirthdayToday(member.birthday) && (
                    <Badge className="flex-shrink-0">🎂 Hoje!</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
