/**
 * LeadDrawer - Painel lateral de detalhes de um lead do CRM com ações e timeline.
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
} from 'lucide-react';
import {
  CRM_SOURCE_LABEL,
  CRM_STATUS_LABEL,
  useAddLeadNote,
  useGetContractUrl,
  useLeadHistory,
  useSendContract,
  type CrmLead,
} from '@/hooks/useCrmLeads';
import { LeadAuditTimeline } from './LeadAuditTimeline';
import { PromoteLeadDialog } from './PromoteLeadDialog';

interface Props {
  lead: CrmLead | null;
  teamName?: string | null;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}

export function LeadDrawer({ lead, teamName, onOpenChange, isAdmin }: Props) {
  const open = !!lead;
  const { data: history, isLoading } = useLeadHistory(lead?.id ?? null);
  const sendContract = useSendContract();
  const addNote = useAddLeadNote();
  const getContractUrl = useGetContractUrl();
  const [note, setNote] = useState('');
  const [promoteOpen, setPromoteOpen] = useState(false);

  if (!lead) return null;

  const contractSent = lead.contract_status === 'sent' || lead.contract_status === 'signed';
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
              <p className="text-xs">
                Contrato:{' '}
                <span className="font-medium">
                  {lead.contract_status ?? 'não enviado'}
                </span>{' '}
                • Pagamento:{' '}
                <span className="font-medium">{lead.payment_status ?? '—'}</span>
              </p>
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
                      onClick={() => sendContract.mutate(lead.id)}
                      disabled={contractSent || sendContract.isPending}
                    >
                      {lead.contract_status === 'signed' ? (
                        <FilePen className="h-4 w-4 mr-1" />
                      ) : (
                        <FileText className="h-4 w-4 mr-1" />
                      )}
                      {contractSent ? 'Contrato enviado' : 'Enviar contrato'}
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
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a href={`mailto:${lead.email}`}>
                        <Mail className="h-4 w-4 mr-1" /> Email
                      </a>
                    </Button>
                  </div>
                </div>
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
        <PromoteLeadDialog lead={lead} open={promoteOpen} onOpenChange={setPromoteOpen} />
      )}
    </>
  );
}
