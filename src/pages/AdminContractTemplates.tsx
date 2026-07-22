/**
 * AdminContractTemplates - Gestão de modelos de contrato Autentique (v3.26.0).
 * Admin-only. Editor + versionamento + preview.
 *
 * @author Diogo Devitte / Ranktop SEO Inteligente
 * © 2026 Ranktop SEO Inteligente.
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Star, Pencil } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import {
  useContractTemplates,
  useDeleteContractTemplate,
  type ContractTemplate,
} from '@/hooks/useContractTemplates';
import { ContractTemplateEditor } from '@/components/contracts/ContractTemplateEditor';
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

export default function AdminContractTemplates() {
  const { isAdmin, isLoading: loadingRole } = useAdmin();
  const { data: templates, isLoading } = useContractTemplates();
  const del = useDeleteContractTemplate();
  const [editing, setEditing] = useState<ContractTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContractTemplate | null>(null);

  if (!loadingRole && !isAdmin) return <Navigate to="/" replace />;

  if (editing || creating) {
    return (
      <ContractTemplateEditor
        template={editing}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary shrink-0" />
            <span className="text-wrap-anywhere">Modelos de Contrato</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Edite os contratos que serão enviados via Autentique. Cada alteração gera uma nova versão.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo modelo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : (templates ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Nenhum modelo cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(templates ?? []).map((t) => (
            <Card key={t.id} className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-start justify-between gap-2 min-w-0">
                  <span className="text-wrap-anywhere">{t.name}</span>
                  <div className="flex gap-1 shrink-0">
                    {t.is_default && (
                      <Badge className="bg-amber-500 text-white gap-1">
                        <Star className="h-3 w-3" /> Padrão
                      </Badge>
                    )}
                    {t.is_active ? (
                      <Badge variant="outline">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {t.description && (
                  <p className="text-sm text-muted-foreground text-wrap-anywhere">{t.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Versão {t.version} · Atualizado em {format(parseISO(t.updated_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                </p>
                <p className="text-xs">
                  {t.variables_schema?.length ?? 0} campo(s) dinâmico(s)
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleteTarget(t)}
                    disabled={t.is_default}
                    title={t.is_default ? 'Não é possível remover o modelo padrão' : ''}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O modelo "{deleteTarget?.name}" será removido. Contratos já enviados não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) await del.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
