/**
 * HubBillingPanel - Painel de cobrança HUB no drawer do lead (v3.26.0).
 * Mostra histórico, permite reenvio e marcar pago manualmente.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CircleDollarSign, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  HUB_BILLING_LABEL,
  useDispatchHubBilling,
  useHubBillingEvents,
  useMarkLeadPaid,
} from '@/hooks/useHubBilling';
import type { CrmLead } from '@/hooks/useCrmLeads';

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  sent: 'bg-blue-100 text-blue-800 border-blue-300',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  failed: 'bg-rose-100 text-rose-800 border-rose-300',
};

export function HubBillingPanel({ lead }: { lead: CrmLead }) {
  const { data: events, isLoading } = useHubBillingEvents(lead.id);
  const dispatch = useDispatchHubBilling();
  const markPaid = useMarkLeadPaid();
  const [showPaidForm, setShowPaidForm] = useState(false);
  const [reason, setReason] = useState('');

  if (!lead.is_hub) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CircleDollarSign className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium uppercase text-muted-foreground">Cobrança HUB</p>
        {lead.payment_status && (
          <Badge variant="outline" className={STATUS_COLOR[lead.payment_status] ?? ''}>
            {lead.payment_status}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch.mutate({ leadId: lead.id, force: (events?.length ?? 0) > 0 })}
          disabled={dispatch.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${dispatch.isPending ? 'animate-spin' : ''}`} />
          {(events?.length ?? 0) > 0 ? 'Reenviar cobrança' : 'Disparar cobrança'}
        </Button>
        {lead.payment_status !== 'paid' && (
          <Button size="sm" variant="ghost" onClick={() => setShowPaidForm((s) => !s)}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar pago manualmente
          </Button>
        )}
      </div>

      {showPaidForm && (
        <Card>
          <CardContent className="pt-3 space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo obrigatório (recibo, transferência, cortesia etc.)"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!reason.trim() || markPaid.isPending}
                onClick={async () => {
                  await markPaid.mutateAsync({ leadId: lead.id, reason: reason.trim() });
                  setReason('');
                  setShowPaidForm(false);
                }}
              >
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPaidForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando histórico...</p>
      ) : (events?.length ?? 0) === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum evento de cobrança registrado.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-2 border-l-2 border-primary/40 pl-2">
              <div className="min-w-0">
                <p className="font-medium">{HUB_BILLING_LABEL[e.event_type] ?? e.event_type}</p>
                {typeof e.payload?.reason === 'string' && (
                  <p className="text-muted-foreground text-wrap-anywhere">{String(e.payload.reason)}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Tentativa {e.attempt} · {e.status}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(parseISO(e.created_at), 'dd/MM HH:mm', { locale: ptBR })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
