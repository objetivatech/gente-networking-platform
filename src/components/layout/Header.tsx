import { useState, useEffect } from 'react';
import { Menu, Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const LAST_SEEN_KEY = 'notifications-last-seen';

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { activities } = useActivityFeed();
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // Load last seen from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    if (stored) {
      setLastSeen(new Date(stored));
    }
  }, []);

  // Mark as read when popover opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      localStorage.setItem(LAST_SEEN_KEY, now.toISOString());
      setLastSeen(now);
    }
  }, [open]);

  // Get recent activities (last 10)
  const recentActivities = activities?.slice(0, 10) || [];
  
  // Count unread notifications
  const unreadCount = recentActivities.filter(activity => {
    if (!lastSeen) return true;
    return new Date(activity.created_at) > lastSeen;
  }).length;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'referral': return '🤝';
      case 'testimonial': return '💬';
      case 'meeting': return '📅';
      case 'gente_em_acao': return '☕';
      case 'business_deal': return '💰';
      default: return '📣';
    }
  };

  const isUnread = (createdAt: string) => {
    if (!lastSeen) return true;
    return new Date(createdAt) > lastSeen;
  };

  const markAllAsRead = () => {
    const now = new Date();
    localStorage.setItem(LAST_SEEN_KEY, now.toISOString());
    setLastSeen(now);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menu</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              <span className="sr-only">Notificações</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                  onClick={markAllAsRead}
                >
                  <Check className="w-3 h-3" />
                  Marcar como lidas
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma notificação recente
                </div>
              ) : (
                <div className="divide-y">
                  {recentActivities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                        isUnread(activity.created_at) ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex gap-3">
                        <div className="relative">
                          <span className="text-lg">{getActivityIcon(activity.activity_type)}</span>
                          {isUnread(activity.created_at) && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isUnread(activity.created_at) ? 'font-semibold' : 'font-medium'}`}>
                            {activity.title}
                          </p>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-2 border-t">
              <Link to="/" onClick={() => setOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Ver todas as atividades
                </Button>
              </Link>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(profile?.full_name || user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{profile?.full_name || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
