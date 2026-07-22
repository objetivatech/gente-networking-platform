/**
 * LeadDrawer - Painel lateral do lead com contrato (modelo+prévia), cobrança HUB e timeline (v3.26.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Crown,
  FileText,
  FilePen,
  Download,
  Send,
  Mail,
  Phone,
  Building2,
  Users,
  Sparkles,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import {
  CRM_SOURCE_LABEL,
  CRM_STATUS_LABEL,
  useAddLeadNote,
  useGetContractUrl,
  useLeadHistory,
  type CrmLead,
} from '@/hooks/useCrmLeads';
import { LeadAuditTimeline } from './LeadAuditTimeline';
import { PromoteLeadDialog } from './PromoteLeadDialog';
import { SendContractDialog } from './SendContractDialog';
import { HubBillingPanel } from './HubBillingPanel';

interface Props {
  lead: CrmLead | null;
  teamName?: string | null;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

const CONTRACT_BADGE: Record<string, string> = {
  not_sent: 'bg-muted text-muted-foreground border-muted-foreground/30',
  sent: 'bg-blue-100 text-blue-800 border-blue-300',
  signed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 border-rose-300',
  expired: 'bg-amber-100 text-amber-800 border-amber-300',
};

const CONTRACT_LABEL: Record<string, string> = {
  not_sent: 'Não enviado',
  sent: 'Enviado — aguardando assinatura',
  signed: 'Assinado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
};

export function LeadDrawer({ lead, teamName, onOpenChange, isAdmin }: Props) {
  const open = !!lead;
  const { data: history, isLoading } = useLeadHistory(lead?.id ?? null);
  const addNote = useAddLeadNote();
  const getContractUrl = useGetContractUrl();
  const [note, setNote] = useState('');
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  if (!lead) return null;

  const contractKey = lead.contract_status ?? 'not_sent';
  const contractSent =
    lead.contract_status === 'sent' || lead.contract_status === 'signed';
  const canResend =
    lead.contract_status === 'rejected' || lead.contract_status === 'expired';
  const canDownloadPdf = lead.contract_status === 'signed' && !!lead.contract_signed_pdf_path;

  const handleDownloadPdf = async () => {
    try {
      const res = await getContractUrl.mutateAsync(lead.id);
      if (res?.url) window.open(res.url, '_blank', 'noopener');
    } catch {
      /* toast já feito pelo hook */
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="space-y-2 text-left">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <SheetTitle className="text-wrap-anywhere">{lead.name}</SheetTitle>
                <SheetDescription className="text-wrap-anywhere">{lead.email}</SheetDescription>
              </div>
              {lead.is_hub && (
                <Badge className="bg-amber-500 text-white gap-1">
                  <Sparkles className="h-3 w-3" /> HUB
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{CRM_STATUS_LABEL[lead.status]}</Badge>
              <Badge variant="secondary">{CRM_SOURCE_LABEL[lead.source]}</Badge>
              {teamName && <Badge variant="outline">{teamName}</Badge>}
              <Badge variant="outline" className={CONTRACT_BADGE[contractKey] ?? ''}>
                Contrato: {CONTRACT_LABEL[contractKey] ?? contractKey}
              </Badge>
            </div>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-2 text-sm">
              {lead.phone && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {lead.phone}
                </p>
              )}
              {lead.company && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" /> {lead.company}
                </p>
              )}
              {lead.business_segment && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" /> {lead.business_segment}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Criado em {format(parseISO(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
              </p>
              {lead.meeting_attendance_count > 0 && (
                <p className="text-xs">Presenças: {lead.meeting_attendance_count}</p>
              )}
              {lead.contract_signing_url && lead.contract_status === 'sent' && (
                <a
                  href={lead.contract_signing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs inline-flex items-center gap-1 text-primary hover:underline text-wrap-anywhere"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir link de assinatura
                </a>
              )}
              {lead.contract_status === 'rejected' && (
                <p className="text-xs flex items-center gap-1 text-rose-600">
                  <XCircle className="h-3 w-3" /> Contrato rejeitado — reenvie um novo modelo.
                </p>
              )}
            </div>

            {isAdmin && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Ações</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSendOpen(true)}
                      disabled={contractSent && !canResend}
                    >
                      {lead.contract_status === 'signed' ? (
                        <FilePen className="h-4 w-4 mr-1" />
                      ) : (
                        <FileText className="h-4 w-4 mr-1" />
                      )}
                      {contractSent && !canResend
                        ? 'Contrato enviado'
                        : canResend
                          ? 'Reenviar contrato'
                          : 'Enviar contrato'}
                    </Button>
                    {canDownloadPdf && (
                      <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
                        <Download className="h-4 w-4 mr-1" /> Baixar PDF
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => setPromoteOpen(true)}
                      disabled={!lead.profile_id}
                    >
                      <Crown className="h-4 w-4 mr-1" />
                      Promover para membro
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`mailto:${lead.email}`}>
                        <Mail className="h-4 w-4 mr-1" /> Email
                      </a>
                    </Button>
                  </div>
                </div>

                {lead.is_hub && (
                  <>
                    <Separator />
                    <HubBillingPanel lead={lead} />
                  </>
                )}
              </>
            )}

            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Adicionar nota</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anotação interna sobre o lead..."
                rows={2}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!note.trim() || addNote.isPending}
                onClick={() =>
                  addNote.mutate(
                    { leadId: lead.id, note: note.trim() },
                    { onSuccess: () => setNote('') },
                  )
                }
              >
                <Send className="h-4 w-4 mr-1" />
                Registrar nota
              </Button>
            </div>

            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Histórico</p>
              <LeadAuditTimeline entries={history ?? []} isLoading={isLoading} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {isAdmin && (
        <>
          <SendContractDialog
            lead={lead}
            teamName={teamName ?? null}
            open={sendOpen}
            onOpenChange={setSendOpen}
          />
          <PromoteLeadDialog lead={lead} open={promoteOpen} onOpenChange={setPromoteOpen} />
        </>
      )}
    </>
  );
}
