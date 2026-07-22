/**
 * LeadAuditTimeline - Timeline vertical de eventos de um lead do CRM.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowRight,
  FileText,
  FilePen,
  FileX,
  Coins,
  Crown,
  StickyNote,
  Activity,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  CRM_EVENT_LABEL,
  CRM_STATUS_LABEL,
  type CrmLeadHistoryEntry,
  type CrmLeadStatus,
} from '@/hooks/useCrmLeads';

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  status_change: Activity,
  contract_sent: FileText,
  contract_signed: FilePen,
  contract_rejected: FileX,
  contract_expired: FileX,
  contract_event: FileText,
  hub_billing_triggered: Coins,
  promoted: Crown,
  note_added: StickyNote,
};

interface Props {
  entries: CrmLeadHistoryEntry[];
  isLoading?: boolean;
}

export function LeadAuditTimeline({ entries, isLoading }: Props) {
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  if (!entries.length) return <p className="text-sm text-muted-foreground">Sem eventos registrados.</p>;

  return (
    <ol className="space-y-3">
      {entries.map((e) => {
        const Icon = EVENT_ICON[e.event_type] ?? Activity;
        return (
          <li key={e.id} className="border rounded-md p-3 bg-card">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 rounded-full bg-muted p-2 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {CRM_EVENT_LABEL[e.event_type] ?? e.event_type}
                  </Badge>
                  {e.event_type === 'status_change' && e.from_status && e.to_status && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {CRM_STATUS_LABEL[e.from_status as CrmLeadStatus] ?? e.from_status}
                      <ArrowRight className="h-3 w-3" />
                      {CRM_STATUS_LABEL[e.to_status as CrmLeadStatus] ?? e.to_status}
                    </span>
                  )}
                  {e.source_snapshot && (
                    <Badge variant="outline" className="text-[10px]">
                      {e.source_snapshot}
                    </Badge>
                  )}
                </div>
                {e.reason && (
                  <p className="text-xs text-foreground/80 text-wrap-anywhere">{e.reason}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {e.moved_by_name ?? (e.moved_by ? 'Usuário' : 'Sistema')} •{' '}
                  {format(parseISO(e.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
