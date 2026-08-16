/**
 * PlanosAssinaturas - Gestão de planos, descontos, assinaturas e cobranças (v3.37.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 *
 * Admin-only. O botão de cobrança do CRM só é liberado quando existe um plano
 * ativo e uma assinatura vinculada ao lead.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CircleDollarSign, Plus, Tag, Repeat, Send, CheckCircle2, FileText,
} from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useContractTemplates } from '@/hooks/useContractTemplates';
import { useCrmLeads } from '@/hooks/useCrmLeads';
import {
  CHARGE_STATUS_LABEL, INTERVAL_LABEL, PLAN_TYPE_LABEL, SUBSCRIPTION_STATUS_LABEL,
  formatCents, parseCurrencyToCents,
  useBillingCharges, useBillingDiscounts, useBillingPlans, useBillingSubscriptions,
  useDeleteBillingDiscount, useMarkChargePaid, useSaveBillingDiscount, useSaveBillingPlan,
  useSaveSubscription, useSendCharge, useTogglePlanActive,
  type BillingInterval, type BillingPlan, type PlanType,
} from '@/hooks/useBilling';

function PlanDialog({ plan }: { plan?: BillingPlan }) {
  const save = useSaveBillingPlan();
  const { data: templates } = useContractTemplates();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [planType, setPlanType] = useState<PlanType>(plan?.plan_type ?? 'recorrente');
  const [amount, setAmount] = useState(plan ? (plan.amount_cents / 100).toFixed(2) : '');
  const [interval, setInterval] = useState<BillingInterval>(plan?.billing_interval ?? 'monthly');
  const [audience, setAudience] = useState(plan?.audience ?? 'hub');
  const [templateId, setTemplateId] = useState(plan?.contract_template_id ?? 'none');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {plan ? (
          <Button size="sm" variant="outline">Editar</Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo plano</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{plan ? 'Editar plano' : 'Novo plano'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Gente HUB Mensal" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                  <SelectItem value="pontual">Pontual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="197,00" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {planType === 'recorrente' && (
              <div className="space-y-1.5">
                <Label>Periodicidade</Label>
                <Select value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTERVAL_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Público</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hub">Gente HUB</SelectItem>
                  <SelectItem value="premium">Grupo Premium</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Modelo de contrato vinculado</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(templates ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim() || save.isPending}
            onClick={() =>
              save.mutate(
                {
                  id: plan?.id,
                  name: name.trim(),
                  description: description || null,
                  plan_type: planType,
                  audience,
                  amount_cents: parseCurrencyToCents(amount),
                  billing_interval: planType === 'recorrente' ? interval : null,
                  contract_template_id: templateId === 'none' ? null : templateId,
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog() {
  const save = useSaveBillingDiscount();
  const { data: plans } = useBillingPlans();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [planId, setPlanId] = useState('all');
  const [validUntil, setValidUntil] = useState('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo desconto</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Novo desconto</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="GENTE20" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'percent' | 'fixed')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'percent' ? '20' : '50,00'} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                {(plans ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Válido até (opcional)</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!code.trim() || save.isPending}
            onClick={() =>
              save.mutate(
                {
                  code: code.trim(),
                  description: description || null,
                  discount_type: type,
                  value: Number(value.replace(',', '.')) || 0,
                  plan_id: planId === 'all' ? null : planId,
                  valid_until: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : null,
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionDialog() {
  const save = useSaveSubscription();
  const { data: plans } = useBillingPlans();
  const { data: discounts } = useBillingDiscounts();
  const { data: leads } = useCrmLeads();
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [discountId, setDiscountId] = useState('none');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const activePlans = (plans ?? []).filter((p) => p.active);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={activePlans.length === 0}>
          <Plus className="h-4 w-4 mr-1" /> Nova assinatura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova assinatura</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {activePlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {formatCents(p.amount_cents)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente (lead do CRM)</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {(leads ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} — {l.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Desconto</Label>
            <Select value={discountId} onValueChange={setDiscountId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem desconto</SelectItem>
                {(discounts ?? []).filter((d) => d.active).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} ({d.discount_type === 'percent' ? `${d.value}%` : formatCents(d.value * 100)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Início / primeira cobrança</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!planId || !leadId || save.isPending}
            onClick={() =>
              save.mutate(
                {
                  plan_id: planId,
                  lead_id: leadId,
                  discount_id: discountId === 'none' ? null : discountId,
                  start_date: startDate,
                  next_charge_date: startDate,
                  notes: notes || null,
                  status: 'draft',
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Criar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanosAssinaturas() {
  const { isAdmin } = useAdmin();
  const { data: plans } = useBillingPlans();
  const { data: discounts } = useBillingDiscounts();
  const { data: subscriptions } = useBillingSubscriptions();
  const { data: charges } = useBillingCharges();
  const { data: leads } = useCrmLeads();
  const togglePlan = useTogglePlanActive();
  const removeDiscount = useDeleteBillingDiscount();
  const sendCharge = useSendCharge();
  const markPaid = useMarkChargePaid();

  const planById = useMemo(
    () => new Map((plans ?? []).map((p) => [p.id, p])),
    [plans],
  );
  const leadById = useMemo(
    () => new Map((leads ?? []).map((l) => [l.id, l])),
    [leads],
  );

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Área restrita a administradores.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CircleDollarSign className="h-8 w-8 text-primary" />
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Planos e Assinaturas</h1>
          <p className="text-muted-foreground">
            Crie planos, aplique descontos, vincule clientes e dispare as cobranças.
          </p>
        </div>
      </div>

      <Tabs defaultValue="planos">
        <TabsList className="hscroll">
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="descontos">Descontos</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
          <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
        </TabsList>

        {/* PLANOS */}
        <TabsContent value="planos" className="space-y-3 pt-4">
          <div className="flex justify-end"><PlanDialog /></div>
          {(plans ?? []).length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Nenhum plano cadastrado ainda.
            </CardContent></Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {(plans ?? []).map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base text-wrap-anywhere">{p.name}</CardTitle>
                      <CardDescription className="text-wrap-anywhere">{p.description}</CardDescription>
                    </div>
                    <Switch
                      checked={p.active}
                      onCheckedChange={(v) => togglePlan.mutate({ id: p.id, active: v })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      {p.plan_type === 'recorrente' ? <Repeat className="h-3 w-3" /> : null}
                      {PLAN_TYPE_LABEL[p.plan_type]}
                      {p.billing_interval ? ` · ${INTERVAL_LABEL[p.billing_interval]}` : ''}
                    </Badge>
                    <Badge variant="outline">{formatCents(p.amount_cents)}</Badge>
                    {p.contract_template_id && (
                      <Badge variant="outline" className="gap-1">
                        <FileText className="h-3 w-3" /> Contrato vinculado
                      </Badge>
                    )}
                    {!p.active && <Badge variant="outline">Inativo</Badge>}
                  </div>
                  <PlanDialog plan={p} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* DESCONTOS */}
        <TabsContent value="descontos" className="space-y-3 pt-4">
          <div className="flex justify-end"><DiscountDialog /></div>
          {(discounts ?? []).map((d) => (
            <Card key={d.id}>
              <CardContent className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> {d.code}
                  </p>
                  <p className="text-sm text-muted-foreground text-wrap-anywhere">
                    {d.description ?? 'Sem descrição'} ·{' '}
                    {d.discount_type === 'percent' ? `${d.value}%` : formatCents(d.value * 100)}
                    {d.plan_id ? ` · ${planById.get(d.plan_id)?.name ?? 'plano'}` : ' · todos os planos'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeDiscount.mutate(d.id)}>
                  Remover
                </Button>
              </CardContent>
            </Card>
          ))}
          {(discounts ?? []).length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Nenhum desconto cadastrado.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ASSINATURAS */}
        <TabsContent value="assinaturas" className="space-y-3 pt-4">
          <div className="flex justify-end"><SubscriptionDialog /></div>
          {(plans ?? []).filter((p) => p.active).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Crie e ative ao menos um plano para poder gerar assinaturas.
            </p>
          )}
          {(subscriptions ?? []).map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-wrap-anywhere">
                    {s.lead_id ? leadById.get(s.lead_id)?.name ?? 'Lead' : 'Membro'} ·{' '}
                    {planById.get(s.plan_id)?.name ?? 'Plano'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCents(s.amount_cents)} · início {s.start_date}
                    {s.next_charge_date ? ` · próxima ${s.next_charge_date}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{SUBSCRIPTION_STATUS_LABEL[s.status]}</Badge>
                  <Button
                    size="sm"
                    disabled={sendCharge.isPending || s.status === 'canceled'}
                    onClick={() => sendCharge.mutate({ subscription_id: s.id, force: true })}
                  >
                    <Send className="h-4 w-4 mr-1" /> Cobrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(subscriptions ?? []).length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma assinatura criada.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* COBRANÇAS */}
        <TabsContent value="cobrancas" className="space-y-3 pt-4">
          {(charges ?? []).map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-wrap-anywhere">
                    {c.lead_id ? leadById.get(c.lead_id)?.name ?? 'Lead' : 'Membro'} ·{' '}
                    {c.plan_id ? planById.get(c.plan_id)?.name ?? 'Plano' : 'Plano'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCents(c.amount_cents)} · vencimento {c.due_date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{CHARGE_STATUS_LABEL[c.status]}</Badge>
                  {c.status !== 'paid' && (
                    <Button size="sm" variant="ghost" onClick={() => markPaid.mutate(c.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar paga
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(charges ?? []).length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma cobrança emitida.
            </CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
