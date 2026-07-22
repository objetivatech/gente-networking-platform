/**
 * ContractTemplateEditor - Editor de modelo de contrato com preview (v3.26.0).
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Save, X } from 'lucide-react';
import {
  CONTRACT_BUILTIN_PLACEHOLDERS,
  renderTemplatePreview,
  useSaveContractTemplate,
  type ContractTemplate,
  type ContractVariableField,
} from '@/hooks/useContractTemplates';

interface Props {
  template: ContractTemplate | null;
  onClose: () => void;
}

export function ContractTemplateEditor({ template, onClose }: Props) {
  const save = useSaveContractTemplate();
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [bodyHtml, setBodyHtml] = useState(template?.body_html ?? '<h1>Novo contrato</h1><p>Contratante: {{nome}}</p>');
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [variables, setVariables] = useState<ContractVariableField[]>(
    template?.variables_schema ?? [],
  );

  const previewVars = useMemo(() => {
    const base: Record<string, string> = {
      nome: 'João Exemplo',
      email: 'joao@empresa.com',
      empresa: 'Empresa Exemplo LTDA',
      telefone: '(11) 99999-0000',
      segmento: 'Tecnologia',
      grupo: 'Grupo Alpha',
      data_hoje: new Date().toLocaleDateString('pt-BR'),
    };
    variables.forEach((v) => {
      base[v.key] = v.default || `[${v.label}]`;
    });
    return base;
  }, [variables]);

  const previewHtml = useMemo(() => renderTemplatePreview(bodyHtml, previewVars), [bodyHtml, previewVars]);

  const insertPlaceholder = (key: string) => {
    setBodyHtml((prev) => `${prev}{{${key}}}`);
  };

  const addVariable = () => {
    setVariables((v) => [...v, { key: `campo_${v.length + 1}`, label: 'Novo campo', type: 'text', required: false }]);
  };

  const updateVariable = (i: number, patch: Partial<ContractVariableField>) => {
    setVariables((v) => v.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };

  const removeVariable = (i: number) => {
    setVariables((v) => v.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!name.trim() || !bodyHtml.trim()) return;
    await save.mutateAsync({
      id: template?.id,
      name: name.trim(),
      description: description?.trim() || null,
      body_html: bodyHtml,
      variables_schema: variables,
      is_default: isDefault,
      is_active: isActive,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-wrap-anywhere">
          {template ? `Editar: ${template.name}` : 'Novo modelo de contrato'}
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Input value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
          <Label htmlFor="active">Ativo</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} id="default" />
          <Label htmlFor="default">Definir como modelo padrão</Label>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Placeholders disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {CONTRACT_BUILTIN_PLACEHOLDERS.map((p) => (
              <Badge
                key={p.key}
                variant="secondary"
                className="cursor-pointer text-[11px]"
                onClick={() => insertPlaceholder(p.key)}
                title={p.label}
              >
                {`{{${p.key}}}`}
              </Badge>
            ))}
            {variables.map((v) => (
              <Badge
                key={v.key}
                className="cursor-pointer bg-amber-500 text-white text-[11px]"
                onClick={() => insertPlaceholder(v.key)}
                title={v.label}
              >
                {`{{${v.key}}}`}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Clique para inserir. Placeholders em laranja são campos que o admin preenche antes de enviar.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Prévia</TabsTrigger>
          <TabsTrigger value="fields">Campos dinâmicos ({variables.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-2">
          <Label className="text-xs">HTML do contrato</Label>
          <Textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent
              className="pt-6 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-3">
          <Button size="sm" variant="outline" onClick={addVariable}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar campo
          </Button>
          {variables.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum campo dinâmico. Adicione campos que o admin preencherá ao enviar o contrato.</p>
          )}
          {variables.map((v, i) => (
            <Card key={i}>
              <CardContent className="pt-4 grid gap-2 sm:grid-cols-5">
                <div className="sm:col-span-1">
                  <Label className="text-[11px]">Chave</Label>
                  <Input
                    value={v.key}
                    onChange={(e) => updateVariable(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_') })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[11px]">Rótulo</Label>
                  <Input value={v.label} onChange={(e) => updateVariable(i, { label: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">Tipo</Label>
                  <select
                    className="w-full h-9 rounded-md border bg-background text-sm px-2"
                    value={v.type}
                    onChange={(e) => updateVariable(i, { type: e.target.value as ContractVariableField['type'] })}
                  >
                    <option value="text">Texto</option>
                    <option value="textarea">Texto longo</option>
                    <option value="number">Número</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={v.required ?? false}
                      onCheckedChange={(c) => updateVariable(i, { required: c })}
                      id={`req-${i}`}
                    />
                    <Label htmlFor={`req-${i}`} className="text-xs">Obrigatório</Label>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeVariable(i)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remover
                  </Button>
                </div>
                <div className="sm:col-span-5">
                  <Label className="text-[11px]">Placeholder / dica</Label>
                  <Input
                    value={v.placeholder ?? ''}
                    onChange={(e) => updateVariable(i, { placeholder: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
