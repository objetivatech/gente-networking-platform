import { useActivityFeed, Activity } from '@/hooks/useActivityFeed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  MessageSquare, 
  DollarSign, 
  UserPlus, 
  Calendar,
  Activity as ActivityIcon 
} from 'lucide-react';

const activityTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  gente_em_acao: { icon: Users, color: 'text-blue-500' },
  testimonial: { icon: MessageSquare, color: 'text-purple-500' },
  business_deal: { icon: DollarSign, color: 'text-green-500' },
  referral: { icon: UserPlus, color: 'text-orange-500' },
  attendance: { icon: Calendar, color: 'text-primary' },
};

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const config = activityTypeConfig[activity.activity_type] || { 
    icon: ActivityIcon, 
    color: 'text-muted-foreground' 
  };
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={activity.user?.avatar_url || undefined} />
        <AvatarFallback>
          {activity.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-xs text-muted-foreground truncate">
                {activity.description}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(activity.created_at), { 
            addSuffix: true, 
            locale: ptBR 
          })}
        </p>
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
}

export default function ActivityFeed({ limit = 10, showHeader = true }: ActivityFeedProps) {
  const { activities, isLoading } = useActivityFeed(limit);

  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities?.length) {
    return (
      <Card>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ActivityIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma atividade registrada ainda.</p>
            <p className="text-sm">As atividades da comunidade aparecerão aqui.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5 text-primary" />
            Atividades Recentes
            <span className="ml-auto flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
