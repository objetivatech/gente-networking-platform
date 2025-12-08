import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  const { toast } = useToast();

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await subscribe();
      if (success) {
        toast({
          title: 'Notificações ativadas!',
          description: 'Você receberá alertas sobre novas atividades.',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Permissão negada',
          description: 'Habilite as notificações nas configurações do navegador.',
          variant: 'destructive',
        });
      }
    } else {
      await unsubscribe();
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais alertas push.',
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba alertas instantâneos sobre indicações, depoimentos e encontros.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Habilitar notificações push
            </Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? 'Permissão bloqueada. Altere nas configurações do navegador.'
                : 'Receba notificações mesmo quando o app não estiver aberto.'}
            </p>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={permission === 'denied'}
            />
          )}
        </div>

        {permission === 'denied' && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Para habilitar notificações, clique no ícone de cadeado na barra de endereço 
              do seu navegador e permita notificações para este site.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
