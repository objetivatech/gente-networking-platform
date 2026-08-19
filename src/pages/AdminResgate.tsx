/**
 * @page AdminResgate
 * @route /admin/resgate
 * @description Central de Resgate e Reativação (v3.43.0 / v3.44.0) — orçamento diário
 * de e-mails, pessoas na régua, campanhas com preview/teste e histórico exportável.
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
  useSkipRescueDispatch,
  useRemoveFromRescue,
  usePauseRescue,
  useRunRescueNow,
  useSendRescueDispatchNow,
  useSendRescueTest,
  useRescueStatus,
  useRescueSettings,
  useUpdateRescueSettings,
  RESCUE_AUDIENCE_LABEL,
  RESCUE_STATUS_LABEL,
  RESCUE_VARIABLES,
  RESCUE_SETTINGS_DEFAULTS,
  type RescueCampaign,
  type RescueDispatch,
  type RescueSettings,
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import RichTextEditor from '@/components/RichTextEditor';
import ExportButton from '@/components/ExportButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HeartHandshake,
  Play,
  Pencil,
  Ban,
  Mail,
  Clock,
  SendHorizonal,
  SkipForward,
  UserMinus,
  PauseCircle,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toDisplayHtml } from '@/lib/rich-text';

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
];

const fmt = (iso?: string | null) =>
  iso ? format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—';

export default function AdminResgate() {
  const { role, isLoading: loadingRole } = useAdmin() as { role?: string; isLoading: boolean };
  const { data: campaigns, isLoading: loadingCampaigns } = useRescueCampaigns();
  const { data: dispatches, isLoading: loadingDispatches } = useRescueDispatches();
  const { data: status } = useRescueStatus();
  const { data: settingsRow } = useRescueSettings();
  const updateCampaign = useUpdateRescueCampaign();
  const updateSettings = useUpdateRescueSettings();
  const cancelDispatch = useCancelRescueDispatch();
  const skipDispatch = useSkipRescueDispatch();
  const removeFromRescue = useRemoveFromRescue();
  const pauseRescue = usePauseRescue();
  const sendNow = useSendRescueDispatchNow();
  const sendTest = useSendRescueTest();
  const runNow = useRunRescueNow();

  const [editing, setEditing] = useState<RescueCampaign | null>(null);
  const [previewing, setPreviewing] = useState<RescueCampaign | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [draftSettings, setDraftSettings] = useState<RescueSettings | null>(null);
  const [historyStatus, setHistoryStatus] = useState<string>('all');
  const [historyAudience, setHistoryAudience] = useState<string>('all');

  const settings = draftSettings ?? settingsRow?.settings ?? RESCUE_SETTINGS_DEFAULTS;

  const rows = useMemo(() => dispatches ?? [], [dispatches]);

  const stats = useMemo(
    () => ({
      queued: rows.filter((d) => d.status === 'queued').length,
      sent: rows.filter((d) => d.status === 'sent').length,
      error: rows.filter((d) => d.status === 'error').length,
      cancelled: rows.filter((d) => d.status === 'cancelled' || d.status === 'skipped').length,
    }),
    [rows],
  );

  /** Pessoas na régua: agrupa disparos por destinatário. */
  const people = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        email: string;
        audience: string;
        profileId: string | null;
        leadId: string | null;
        currentStep: number;
        nextDispatch: RescueDispatch | null;
        sentCount: number;
        lastSentAt: string | null;
      }
    >();
    for (const d of rows) {
      if (d.audience === 'risco') continue;
      const key = d.profile_id ?? d.lead_id ?? d.recipient_email;
      const entry = map.get(key) ?? {
        key,
        name: d.recipient_name ?? d.recipient_email,
        email: d.recipient_email,
        audience: d.audience,
        profileId: d.profile_id,
        leadId: d.lead_id,
        currentStep: 0,
        nextDispatch: null,
        sentCount: 0,
        lastSentAt: null,
      };
      if (d.status === 'sent') {
        entry.sentCount += 1;
        entry.currentStep = Math.max(entry.currentStep, d.step);
        if (!entry.lastSentAt || (d.sent_at ?? '') > entry.lastSentAt) entry.lastSentAt = d.sent_at;
      }
      if (d.status === 'queued') {
        if (!entry.nextDispatch || d.scheduled_for < entry.nextDispatch.scheduled_for) {
          entry.nextDispatch = d;
        }
      }
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => {
      const an = a.nextDispatch?.scheduled_for ?? '9999';
      const bn = b.nextDispatch?.scheduled_for ?? '9999';
      return an.localeCompare(bn);
    });
  }, [rows]);

  const history = useMemo(
    () =>
      rows.filter(
        (d) =>
          (historyStatus === 'all' || d.status === historyStatus) &&
          (historyAudience === 'all' || d.audience === historyAudience),
      ),
    [rows, historyStatus, historyAudience],
  );

  if (loadingRole) return <Skeleton className="h-64 w-full" />;
  if (!canManageRescue(role as never)) return <Navigate to="/" replace />;

  const budget = status?.budget;
  const usedPct = budget?.dailyBudget ? Math.min(100, (budget.used / budget.dailyBudget) * 100) : 0;

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runNow.mutate({ dryRun: true })} disabled={runNow.isPending}>
            Simular
          </Button>
          <Button onClick={() => runNow.mutate({ force: true })} disabled={runNow.isPending}>
            <Play className="h-4 w-4 mr-2" />
            {runNow.isPending ? 'Executando...' : 'Executar régua agora'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Na fila', value: stats.queued, icon: Clock },
          { label: 'Enviados', value: stats.sent, icon: Mail },
          { label: 'Falhas', value: stats.error, icon: Ban },
          { label: 'Cancelados/pulados', value: stats.cancelled, icon: Ban },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <s.icon className="h-4 w-4" />
                <span className="min-w-0 truncate">{s.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="visao">
        <TabsList className="hscroll">
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- Visão */}
        <TabsContent value="visao" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orçamento diário de e-mails</CardTitle>
              <CardDescription>
                A Resend não informa a cota restante; usamos o log local de envios das últimas 24h
                como fonte de verdade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={usedPct} />
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  <strong>{budget?.used ?? 0}</strong> de {budget?.dailyBudget ?? settings.daily_budget} usados hoje
                </span>
                <span>
                  Disponível para resgate: <strong>{budget?.available ?? 0}</strong>
                </span>
                <span>
                  Na fila: <strong>{status?.queued ?? stats.queued}</strong> (vencidos: {status?.due ?? 0})
                </span>
                <Badge variant={status?.in_window ? 'default' : 'secondary'}>
                  {status?.in_window ? 'Dentro da janela de envio' : 'Fora da janela de envio'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações da régua</CardTitle>
              <CardDescription>
                Limite diário, reserva para e-mails transacionais e janela inteligente de envio
                (horário de São Paulo).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Limite diário</Label>
                  <Input
                    type="number"
                    value={settings.daily_budget}
                    onChange={(e) =>
                      setDraftSettings({ ...settings, daily_budget: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reserva transacional</Label>
                  <Input
                    type="number"
                    value={settings.transactional_reserve}
                    onChange={(e) =>
                      setDraftSettings({
                        ...settings,
                        transactional_reserve: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora inicial</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.send_hour_start}
                    onChange={(e) =>
                      setDraftSettings({ ...settings, send_hour_start: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora final</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={settings.send_hour_end}
                    onChange={(e) =>
                      setDraftSettings({ ...settings, send_hour_end: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>WhatsApp de destino (somente números)</Label>
                  <Input
                    value={settings.whatsapp_number}
                    onChange={(e) =>
                      setDraftSettings({ ...settings, whatsapp_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias de envio</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const active = settings.send_days.includes(d.value);
                    return (
                      <Button
                        key={d.value}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        onClick={() =>
                          setDraftSettings({
                            ...settings,
                            send_days: active
                              ? settings.send_days.filter((v) => v !== d.value)
                              : [...settings.send_days, d.value].sort(),
                          })
                        }
                      >
                        {d.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label>Régua ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Desligado, nada é enviado — a fila continua sendo montada.
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(v) => setDraftSettings({ ...settings, enabled: v })}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    updateSettings.mutate(settings, { onSuccess: () => setDraftSettings(null) })
                  }
                  disabled={updateSettings.isPending || !draftSettings}
                >
                  {updateSettings.isPending ? 'Salvando...' : 'Salvar configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------------------------------------- Pessoas */}
        <TabsContent value="pessoas" className="space-y-3 mt-4">
          {loadingDispatches ? (
            <Skeleton className="h-40 w-full" />
          ) : people.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Ninguém elegível na régua no momento. Rode "Simular" para montar a fila.
              </CardContent>
            </Card>
          ) : (
            people.map((p) => (
              <Card key={p.key}>
                <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-wrap-anywhere">{p.name}</span>
                      <Badge variant="secondary">
                        {RESCUE_AUDIENCE_LABEL[p.audience as keyof typeof RESCUE_AUDIENCE_LABEL]}
                      </Badge>
                      <Badge variant="outline">Etapa {p.currentStep || 0}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-wrap-anywhere">
                      {p.email} · enviados: {p.sentCount} · último: {fmt(p.lastSentAt)}
                      {p.nextDispatch ? ` · próximo: ${fmt(p.nextDispatch.scheduled_for)}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!p.nextDispatch || sendNow.isPending}
                      onClick={() => p.nextDispatch && sendNow.mutate(p.nextDispatch.id)}
                    >
                      <SendHorizonal className="h-4 w-4 mr-1" />
                      Enviar agora
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!p.nextDispatch}
                      onClick={() => p.nextDispatch && skipDispatch.mutate(p.nextDispatch.id)}
                    >
                      <SkipForward className="h-4 w-4 mr-1" />
                      Pular etapa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        pauseRescue.mutate({ profileId: p.profileId, leadId: p.leadId, days: 30 })
                      }
                    >
                      <PauseCircle className="h-4 w-4 mr-1" />
                      Pausar 30d
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        removeFromRescue.mutate({ profileId: p.profileId, leadId: p.leadId })
                      }
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* --------------------------------------------------------- Campanhas */}
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
                        <Badge variant="outline">Etapa {c.step}</Badge>
                      </CardTitle>
                      <CardDescription className="mt-1 text-wrap-anywhere">
                        Dispara {c.delay_days} dias após o marco anterior · Assunto: {c.subject}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Switch
                        checked={c.active}
                        onCheckedChange={(v) =>
                          updateCampaign.mutate({ id: c.id, patch: { active: v } })
                        }
                      />
                      <Button size="sm" variant="outline" onClick={() => setPreviewing(c)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        {/* --------------------------------------------------------- Histórico */}
        <TabsContent value="historico" className="space-y-3 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={historyAudience} onValueChange={setHistoryAudience}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Público" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os públicos</SelectItem>
                <SelectItem value="ex_membro">Ex-membros</SelectItem>
                <SelectItem value="convidado">Convidados</SelectItem>
                <SelectItem value="risco">Alertas de risco</SelectItem>
              </SelectContent>
            </Select>
            <Select value={historyStatus} onValueChange={setHistoryStatus}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(RESCUE_STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton
              rows={history}
              fileName="resgate-historico"
              title="Histórico de disparos de resgate"
              subtitle={`${history.length} registros`}
              columns={[
                { header: 'Destinatário', value: (d: RescueDispatch) => d.recipient_name ?? '' },
                { header: 'E-mail', value: (d: RescueDispatch) => d.recipient_email },
                {
                  header: 'Público',
                  value: (d: RescueDispatch) => RESCUE_AUDIENCE_LABEL[d.audience] ?? d.audience,
                },
                { header: 'Etapa', value: (d: RescueDispatch) => d.step },
                {
                  header: 'Status',
                  value: (d: RescueDispatch) => RESCUE_STATUS_LABEL[d.status] ?? d.status,
                },
                { header: 'Agendado para', value: (d: RescueDispatch) => fmt(d.scheduled_for) },
                { header: 'Enviado em', value: (d: RescueDispatch) => fmt(d.sent_at) },
                { header: 'Observação', value: (d: RescueDispatch) => d.cancel_reason ?? d.error ?? '' },
              ]}
            />
          </div>

          {loadingDispatches ? (
            <Skeleton className="h-40 w-full" />
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum disparo registrado com esses filtros.
              </CardContent>
            </Card>
          ) : (
            history.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-wrap-anywhere">
                        {d.recipient_name ?? d.recipient_email}
                      </span>
                      <Badge variant="secondary">{RESCUE_AUDIENCE_LABEL[d.audience]}</Badge>
                      <Badge variant="outline">Etapa {d.step}</Badge>
                      <Badge
                        variant={
                          d.status === 'sent'
                            ? 'default'
                            : d.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {RESCUE_STATUS_LABEL[d.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-wrap-anywhere">
                      Agendado: {fmt(d.scheduled_for)} · Enviado: {fmt(d.sent_at)}
                      {d.cancel_reason ? ` · ${d.cancel_reason}` : ''}
                      {d.error ? ` · erro: ${d.error}` : ''}
                    </p>
                  </div>
                  {d.status === 'queued' && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => sendNow.mutate(d.id)}>
                        <SendHorizonal className="h-4 w-4 mr-1" />
                        Enviar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelDispatch.mutate({ id: d.id })}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* --------------------------------------------------------- Preview */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview e teste</DialogTitle>
            <DialogDescription className="text-wrap-anywhere">
              {previewing?.subject}
            </DialogDescription>
          </DialogHeader>
          {previewing && (
            <div className="space-y-4">
              <div
                className="rounded-md border p-4 text-sm prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: toDisplayHtml(
                    [previewing.intro, previewing.body_html, previewing.offer_html]
                      .filter(Boolean)
                      .join(''),
                  ),
                }}
              />
              <p className="text-xs text-muted-foreground text-wrap-anywhere">
                CTA: <strong>{previewing.cta_label}</strong> → WhatsApp {settings.whatsapp_number} com a
                mensagem "{previewing.whatsapp_message}"
              </p>
              <Separator />
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="email@para.teste"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button
                  disabled={!testEmail || sendTest.isPending}
                  onClick={() => sendTest.mutate({ campaignId: previewing.id, email: testEmail })}
                >
                  {sendTest.isPending ? 'Enviando...' : 'Enviar teste'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------- Editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar campanha</DialogTitle>
            <DialogDescription>
              Variáveis disponíveis: {RESCUE_VARIABLES.map((v) => v.token).join(', ')}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome interno</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Atraso (dias)</Label>
                  <Input
                    type="number"
                    value={editing.delay_days}
                    onChange={(e) =>
                      setEditing({ ...editing, delay_days: Number(e.target.value) })
                    }
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
                  value={editing.intro ?? ''}
                  onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Corpo do e-mail</Label>
                <RichTextEditor
                  value={editing.body_html}
                  onChange={(html) => setEditing({ ...editing, body_html: html })}
                  minHeight={160}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Oferta especial (opcional)</Label>
                <RichTextEditor
                  value={editing.offer_html ?? ''}
                  onChange={(html) => setEditing({ ...editing, offer_html: html })}
                  minHeight={100}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio enquanto não houver oferta definida — o bloco não aparece no e-mail.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Texto do botão</Label>
                  <Input
                    value={editing.cta_label}
                    onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mensagem pré-preenchida no WhatsApp</Label>
                  <Textarea
                    value={editing.whatsapp_message}
                    onChange={(e) => setEditing({ ...editing, whatsapp_message: e.target.value })}
                    rows={2}
                  />
                </div>
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
                updateCampaign.mutate({ id, patch }, { onSuccess: () => setEditing(null) });
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
