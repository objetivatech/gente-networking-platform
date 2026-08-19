/**
 * @page AdminResgate
 * @route /admin/resgate
 * @description Central de Resgate e Reativação (v3.43.0) — gestão das réguas
 * automáticas de e-mail para ex-membros e convidados, com fila de disparos.
 *
 * @access Apenas administradores
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { canManageRescue } from '@/lib/access-control';
import {
  useRescueCampaigns,
  useUpdateRescueCampaign,
  useRescueDispatches,
  useCancelRescueDispatch,
  useRunRescueNow,
  RESCUE_AUDIENCE_LABEL,
  RESCUE_STATUS_LABEL,
  type RescueCampaign,
} from '@/hooks/useRescue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HeartHandshake, Play, Pencil, Ban, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminResgate() {
  const { role, isLoading: loadingRole } = useAdmin() as { role?: string; isLoading: boolean };
  const { data: campaigns, isLoading: loadingCampaigns } = useRescueCampaigns();
  const { data: dispatches, isLoading: loadingDispatches } = useRescueDispatches();
  const updateCampaign = useUpdateRescueCampaign();
  const cancelDispatch = useCancelRescueDispatch();
  const runNow = useRunRescueNow();

  const [editing, setEditing] = useState<RescueCampaign | null>(null);

  const stats = useMemo(() => {
    const rows = dispatches ?? [];
    return {
      scheduled: rows.filter((d) => d.status === 'scheduled').length,
      sent: rows.filter((d) => d.status === 'sent').length,
      failed: rows.filter((d) => d.status === 'failed').length,
      cancelled: rows.filter((d) => d.status === 'cancelled').length,
    };
  }, [dispatches]);

  if (loadingRole) return <Skeleton className="h-64 w-full" />;
  if (!canManageRescue(role as never)) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <HeartHandshake className="h-7 w-7 text-primary shrink-0" />
            Resgate e Reativação
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Réguas automáticas de e-mail para ex-membros e convidados, com CTA para WhatsApp e
            registro da jornada no CRM.
          </p>
        </div>
        <Button onClick={() => runNow.mutate(false)} disabled={runNow.isPending}>
          <Play className="h-4 w-4 mr-2" />
          {runNow.isPending ? 'Executando...' : 'Executar régua agora'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Agendados', value: stats.scheduled, icon: Clock },
          { label: 'Enviados', value: stats.sent, icon: Mail },
          { label: 'Falhas', value: stats.failed, icon: Ban },
          { label: 'Cancelados', value: stats.cancelled, icon: Ban },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <s.icon className="h-4 w-4" />
                {s.label}
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="campanhas">
        <TabsList className="hscroll">
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="fila">Fila de disparos</TabsTrigger>
        </TabsList>

        <TabsContent value="campanhas" className="space-y-3 mt-4">
          {loadingCampaigns ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            (campaigns ?? []).map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{RESCUE_AUDIENCE_LABEL[c.audience]}</Badge>
                        <span className="text-wrap-anywhere">{c.name}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 text-wrap-anywhere">
                        Etapa {c.step} · dispara {c.delay_days} dia(s) após o gatilho · assunto:{' '}
                        <strong>{c.subject}</strong>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={c.active}
                          onCheckedChange={(v) =>
                            updateCampaign.mutate({ id: c.id, patch: { active: v } })
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {c.active ? 'Ativa' : 'Pausada'}
                        </span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="fila" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loadingDispatches ? (
                <Skeleton className="h-40 w-full" />
              ) : (dispatches ?? []).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Nenhum disparo registrado até o momento.
                </p>
              ) : (
                <div className="divide-y">
                  {(dispatches ?? []).map((d) => (
                    <div
                      key={d.id}
                      className="p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-wrap-anywhere">
                          {d.recipient_name || d.recipient_email}
                        </p>
                        <p className="text-xs text-muted-foreground text-wrap-anywhere">
                          {RESCUE_AUDIENCE_LABEL[d.audience]} · etapa {d.step} ·{' '}
                          {format(new Date(d.scheduled_for), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          {d.error ? ` · ${d.error}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            d.status === 'sent'
                              ? 'default'
                              : d.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {RESCUE_STATUS_LABEL[d.status]}
                        </Badge>
                        {d.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelDispatch.mutate(d.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar campanha</DialogTitle>
            <DialogDescription>
              Ajuste o conteúdo do e-mail e o intervalo de disparo desta etapa.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome interno</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Dias após o gatilho</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editing.delay_days}
                    onChange={(e) =>
                      setEditing({ ...editing, delay_days: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Texto do botão</Label>
                  <Input
                    value={editing.cta_label}
                    onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Introdução</Label>
                <Textarea
                  rows={2}
                  value={editing.intro ?? ''}
                  onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Corpo (HTML)</Label>
                <Textarea
                  rows={6}
                  value={editing.body_html}
                  onChange={(e) => setEditing({ ...editing, body_html: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Oferta / destaque (HTML, opcional)</Label>
                <Textarea
                  rows={3}
                  value={editing.offer_html ?? ''}
                  onChange={(e) => setEditing({ ...editing, offer_html: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mensagem pré-preenchida do WhatsApp</Label>
                <Textarea
                  rows={2}
                  value={editing.whatsapp_message}
                  onChange={(e) => setEditing({ ...editing, whatsapp_message: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={updateCampaign.isPending}
              onClick={() => {
                if (!editing) return;
                const { id, created_at, updated_at, ...patch } = editing;
                updateCampaign.mutate(
                  { id, patch },
                  { onSuccess: () => setEditing(null) },
                );
              }}
            >
              {updateCampaign.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
