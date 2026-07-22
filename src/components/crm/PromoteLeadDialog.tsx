/**
 * PromoteLeadDialog - Diálogo para promover um lead a membro com validações.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { usePromoteCrmLead, type CrmLead } from '@/hooks/useCrmLeads';
import { useTeams } from '@/hooks/useTeams';

interface Props {
  lead: CrmLead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoteLeadDialog({ lead, open, onOpenChange }: Props) {
  const { teams } = useTeams();
  const promote = usePromoteCrmLead();
  const [teamId, setTeamId] = useState<string>(lead.target_team_id ?? '');
  const [skipContract, setSkipContract] = useState(false);
  const [skipPayment, setSkipPayment] = useState(false);
  const [reason, setReason] = useState('');

  const isHub = lead.source === 'lp_gentehub';
  const needsAccount = !lead.profile_id;
  const contractOK = !isHub || lead.contract_status === 'signed' || skipContract;
  const paymentOK = !isHub || lead.payment_status === 'paid' || skipPayment;
  const teamOK = !!teamId;
  const reasonOK = !(skipContract || skipPayment) || reason.trim().length >= 3;
  const canSubmit = !needsAccount && contractOK && paymentOK && teamOK && reasonOK && !promote.isPending;

  const checklist = useMemo(
    () => [
      { ok: !needsAccount, label: 'Lead criou conta na plataforma' },
      { ok: teamOK, label: 'Grupo destino selecionado' },
      ...(isHub
        ? [
            {
              ok: lead.contract_status === 'signed' || skipContract,
              label: skipContract ? 'Contrato ignorado (motivo obrigatório)' : 'Contrato assinado',
            },
            {
              ok: lead.payment_status === 'paid' || skipPayment,
              label: skipPayment ? 'Pagamento ignorado (motivo obrigatório)' : 'Pagamento confirmado',
            },
          ]
        : []),
    ],
    [needsAccount, teamOK, isHub, lead.contract_status, lead.payment_status, skipContract, skipPayment],
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Promover para membro</AlertDialogTitle>
          <AlertDialogDescription>
            Ao confirmar, o lead vira membro do grupo escolhido e o card vai para "Fechado".
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {needsAccount && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este lead ainda não criou conta. Peça para completar o cadastro pelo convite antes de promover.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Grupo destino</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                {(teams ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isHub && (
            <div className="space-y-2 rounded-md border p-3 bg-muted/40">
              <p className="text-xs font-medium">Lead Gente HUB — exige contrato e pagamento</p>
              {lead.contract_status !== 'signed' && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={skipContract}
                    onCheckedChange={(v) => setSkipContract(!!v)}
                  />
                  Ignorar contrato pendente
                </label>
              )}
              {lead.payment_status !== 'paid' && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={skipPayment}
                    onCheckedChange={(v) => setSkipPayment(!!v)}
                  />
                  Ignorar pagamento pendente
                </label>
              )}
              {(skipContract || skipPayment) && (
                <div className="space-y-1">
                  <Label className="text-xs">Motivo (obrigatório)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex.: contrato físico já assinado fora da plataforma."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <ul className="space-y-1 text-sm">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                {c.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500" />
                )}
                <span className={c.ok ? '' : 'text-muted-foreground'}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={promote.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              promote.mutate(
                {
                  leadId: lead.id,
                  teamId,
                  skipContract,
                  skipPayment,
                  reason: skipContract || skipPayment ? reason.trim() : undefined,
                },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            {promote.isPending ? 'Promovendo...' : 'Confirmar promoção'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
