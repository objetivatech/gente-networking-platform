import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Mail, Bell, MessageSquare, Send, Calendar, Loader2, Trash2 } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';
import { clearOfflineData, getOfflineDataSize } from '@/hooks/useOfflineData';
interface NotificationSettings {
  email_notifications_enabled: boolean;
  notify_on_testimonial: boolean;
  notify_on_referral: boolean;
  notify_on_meeting: boolean;
}

export default function Configuracoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications_enabled: true,
    notify_on_testimonial: true,
    notify_on_referral: true,
    notify_on_meeting: true,
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email_notifications_enabled, notify_on_testimonial, notify_on_referral, notify_on_meeting')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setSettings({
            email_notifications_enabled: data.email_notifications_enabled ?? true,
            notify_on_testimonial: data.notify_on_testimonial ?? true,
            notify_on_referral: data.notify_on_referral ?? true,
            notify_on_meeting: data.notify_on_meeting ?? true,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Configurações salvas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências de notificação</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notificações por Email
          </CardTitle>
          <CardDescription>
            Configure quais notificações você deseja receber por email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-master" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Habilitar notificações por email
              </Label>
              <p className="text-sm text-muted-foreground">
                Controle mestre para todas as notificações por email
              </p>
            </div>
            <Switch
              id="email-master"
              checked={settings.email_notifications_enabled}
              onCheckedChange={(checked) => updateSetting('email_notifications_enabled', checked)}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Tipos de notificação:</p>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-testimonial" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Depoimentos recebidos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber email quando alguém enviar um depoimento para você
                </p>
              </div>
              <Switch
                id="notify-testimonial"
                checked={settings.notify_on_testimonial}
                onCheckedChange={(checked) => updateSetting('notify_on_testimonial', checked)}
                disabled={!settings.email_notifications_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-referral" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Indicações recebidas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber email quando alguém enviar uma indicação para você
                </p>
              </div>
              <Switch
                id="notify-referral"
                checked={settings.notify_on_referral}
                onCheckedChange={(checked) => updateSetting('notify_on_referral', checked)}
                disabled={!settings.email_notifications_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-meeting" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Novos encontros
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receber email quando um novo encontro for agendado
                </p>
              </div>
              <Switch
                id="notify-meeting"
                checked={settings.notify_on_meeting}
                onCheckedChange={(checked) => updateSetting('notify_on_meeting', checked)}
                disabled={!settings.email_notifications_enabled}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <NotificationSettings />

      {/* Offline Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Dados Offline
          </CardTitle>
          <CardDescription>
            Gerencie os dados armazenados localmente para uso offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium">Espaço utilizado</p>
              <p className="text-sm text-muted-foreground">
                {getOfflineDataSize()} de dados armazenados
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                clearOfflineData();
                toast({
                  title: 'Dados limpos',
                  description: 'Todos os dados offline foram removidos.',
                });
              }}
            >
              Limpar cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
