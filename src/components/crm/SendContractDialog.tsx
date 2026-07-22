/**
 * SendContractDialog - Envio de contrato com modelo + variáveis dinâmicas (v3.26.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  renderTemplatePreview,
  useContractTemplates,
  useDefaultContractTemplate,
  type ContractTemplate,
} from '@/hooks/useContractTemplates';
import type { CrmLead } from '@/hooks/useCrmLeads';

interface Props {
  lead: CrmLead;
  teamName?: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function SendContractDialog({ lead, teamName, open, onOpenChange }: Props) {
  const { data: templates } = useContractTemplates();
  const { data: defaultTemplate } = useDefaultContractTemplate();
  const [templateId, setTemplateId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open && !templateId && defaultTemplate) setTemplateId(defaultTemplate.id);
  }, [open, defaultTemplate, templateId]);

  const template: ContractTemplate | undefined = useMemo(
    () => (templates ?? []).find((t) => t.id === templateId),
    [templates, templateId],
  );

  const builtInVars = useMemo(
    () => ({
      nome: lead.name,
      email: lead.email,
      empresa: lead.company ?? '',
      telefone: lead.phone ?? '',
      segmento: lead.business_segment ?? '',
      grupo: teamName ?? '',
      data_hoje: new Date().toLocaleDateString('pt-BR'),
    }),
    [lead, teamName],
  );

  const allVars = useMemo(() => ({ ...builtInVars, ...values }), [builtInVars, values]);
  const previewHtml = useMemo(
    () => (template ? renderTemplatePreview(template.body_html, allVars) : ''),
    [template, allVars],
  );

  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-contract', {
        body: {
          lead_id: lead.id,
          template_id: templateId,
          variables: values,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      qc.invalidateQueries({ queryKey: ['crm-lead-history'] });
      toast({ title: 'Contrato enviado', description: 'Documento criado no Autentique.' });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      toast({
        title: 'Falha ao enviar contrato',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const missingRequired = (template?.variables_schema ?? []).some(
    (v) => v.required && !(values[v.key] ?? '').trim(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar contrato para {lead.name}</DialogTitle>
          <DialogDescription>
            Escolha um modelo, preencha os campos dinâmicos e revise a prévia antes de enviar via Autentique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Modelo de contrato</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {(templates ?? [])
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.is_default && '★'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {template && (
            <Tabs defaultValue="fields">
              <TabsList>
                <TabsTrigger value="fields">
                  Campos ({template.variables_schema?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="preview">Prévia</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="space-y-3">
                {(template.variables_schema ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Este modelo não pede campos adicionais. Os dados do lead já estão preenchidos automaticamente.
                  </p>
                )}
                {(template.variables_schema ?? []).map((v) => (
                  <div key={v.key}>
                    <Label className="text-xs">
                      {v.label}
                      {v.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {v.type === 'textarea' ? (
                      <Textarea
                        value={values[v.key] ?? ''}
                        onChange={(e) => setValues((s) => ({ ...s, [v.key]: e.target.value }))}
                        placeholder={v.placeholder}
                        rows={3}
                      />
                    ) : (
                      <Input
                        type={v.type === 'number' ? 'number' : 'text'}
                        value={values[v.key] ?? ''}
                        onChange={(e) => setValues((s) => ({ ...s, [v.key]: e.target.value }))}
                        placeholder={v.placeholder}
                      />
                    )}
                  </div>
                ))}
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="font-medium mb-1">Dados do lead pré-preenchidos:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>Nome: {builtInVars.nome}</li>
                    <li>Email: {builtInVars.email}</li>
                    {builtInVars.empresa && <li>Empresa: {builtInVars.empresa}</li>}
                    {builtInVars.grupo && <li>Grupo: {builtInVars.grupo}</li>}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="preview">
                <div
                  className="rounded-md border p-4 max-h-[400px] overflow-y-auto prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => send.mutate()} disabled={!template || missingRequired || send.isPending}>
            <Send className="h-4 w-4 mr-1" />
            {send.isPending ? 'Enviando...' : 'Enviar via Autentique'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
