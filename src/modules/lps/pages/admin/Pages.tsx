/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { AdminLayout } from '@/modules/lps/components/admin/AdminLayout';
import { useLandingPages, useCreateLandingPage, useDuplicateLandingPage, useDeleteLandingPage } from '@/modules/lps/hooks/useLandingPage';
import { PageSettings } from '@/modules/lps/components/admin/PageSettings';
import { BlockEditor } from '@/modules/lps/components/admin/BlockEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Loader2, ExternalLink, Plus, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { previewForPage } from '../../lib/rules';

export default function AdminPages() {
  const [params] = useSearchParams();
  const { data: pages, isLoading } = useLandingPages();
  const createPage = useCreateLandingPage();
  const duplicatePage = useDuplicateLandingPage();
  const deletePage = useDeleteLandingPage();
  
  const [selectedPage, setSelectedPage] = useState<string | null>(params.get('page'));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  
  const [newPageData, setNewPageData] = useState({
    name: '',
    slug: '',
  });

  const handleCreatePage = async () => {
    if (!newPageData.name || !newPageData.slug) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(newPageData.slug)) {
      toast.error('Slug deve conter apenas letras minúsculas, números e hífens');
      return;
    }

    try {
      await createPage.mutateAsync({
        name: newPageData.name,
        slug: newPageData.slug,
        is_active: false,
      });
      toast.success('Página criada com sucesso!');
      setShowCreateDialog(false);
      setNewPageData({ name: '', slug: '' });
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe uma página com esse slug');
      } else {
        toast.error('Erro ao criar página');
      }
    }
  };

  const handleDuplicatePage = async () => {
    if (!duplicateSource || !newPageData.name || !newPageData.slug) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    try {
      await duplicatePage.mutateAsync({
        sourceId: duplicateSource.id,
        newName: newPageData.name,
        newSlug: newPageData.slug,
      });
      toast.success('Página duplicada com sucesso!');
      setShowDuplicateDialog(false);
      setDuplicateSource(null);
      setNewPageData({ name: '', slug: '' });
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe uma página com esse slug');
      } else {
        toast.error('Erro ao duplicar página');
      }
    }
  };

  const handleDeletePage = async () => {
    if (!deleteTarget) return;

    try {
      await deletePage.mutateAsync(deleteTarget.id);
      toast.success('Página excluída com sucesso!');
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Erro ao excluir página');
    }
  };

  const openDuplicateDialog = (page: { id: string; name: string }) => {
    setDuplicateSource(page);
    setNewPageData({ name: `${page.name} (cópia)`, slug: '' });
    setShowDuplicateDialog(true);
  };

  const openDeleteDialog = (page: { id: string; name: string }) => {
    setDeleteTarget(page);
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Landing Pages</h1>
            <p className="text-muted-foreground">Gerencie suas páginas de captura</p>
          </div>
          {!selectedPage && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Página
            </Button>
          )}
        </div>

        {!selectedPage ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pages?.filter(page => page.template === 'blocks').map((page) => (
              <Card
                key={page.id}
                className="bg-card border-border cursor-pointer hover:border-border transition-colors"
                onClick={() => setSelectedPage(page.slug)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{page.name}</h3>
                      <p className="text-sm text-muted-foreground">/{page.slug}</p>
                    </div>
                    <Badge
                      variant={page.is_active ? 'default' : 'secondary'}
                      className={page.is_active ? 'bg-success' : ''}
                    >
                      {page.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Cor: 
                      <span
                        className="inline-block w-4 h-4 rounded ml-2 align-middle"
                        style={{ backgroundColor: page.primary_color || 'hsl(var(--secondary))' }}
                      />
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDuplicateDialog({ id: page.id, name: page.name });
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Duplicar página"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog({ id: page.id, name: page.name });
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir página"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <a
                        href={previewForPage(page.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary hover:text-secondary flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visualizar
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <Button
              onClick={() => setSelectedPage(null)}
              className="text-secondary hover:text-secondary text-sm"
            >
              ← Voltar para lista
            </Button>

            <Tabs defaultValue="settings" className="space-y-4">
              <TabsList className="bg-card border-border">
                <TabsTrigger value="settings">Configurações</TabsTrigger>
                <TabsTrigger value="blocks">Blocos</TabsTrigger>
              </TabsList>
              <TabsContent value="settings">
                <PageSettings slug={selectedPage} />
              </TabsContent>
              <TabsContent value="blocks">
                {pages?.find((p) => p.slug === selectedPage) && (
                  <BlockEditor pageId={pages.find((p) => p.slug === selectedPage)?.id ?? ''} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Create Page Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Nova Landing Page</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Crie uma nova página de captura do zero.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Nome da Página</Label>
              <Input
                value={newPageData.name}
                onChange={(e) => setNewPageData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Ex: Evento de Março"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Slug (URL)</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">/</span>
                <Input
                  value={newPageData.slug}
                  onChange={(e) => setNewPageData(prev => ({ 
                    ...prev, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                  }))}
                  className="bg-card border-border text-foreground"
                  placeholder="evento-marco"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use apenas letras minúsculas, números e hífens
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePage} disabled={createPage.isPending}>
              {createPage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Page Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Duplicar Landing Page</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Crie uma cópia de "{duplicateSource?.name}" com todas as configurações e blocos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Nome da Nova Página</Label>
              <Input
                value={newPageData.name}
                onChange={(e) => setNewPageData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Ex: Evento de Março (cópia)"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Novo Slug (URL)</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground">/</span>
                <Input
                  value={newPageData.slug}
                  onChange={(e) => setNewPageData(prev => ({ 
                    ...prev, 
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                  }))}
                  className="bg-card border-border text-foreground"
                  placeholder="evento-marco-copia"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicatePage} disabled={duplicatePage.isPending}>
              {duplicatePage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Duplicar Página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Página?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir a página "{deleteTarget?.name}"? 
              Esta ação não pode ser desfeita e todos os blocos serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card text-foreground border-border hover:bg-card">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePage}
              className="bg-destructive hover:bg-destructive"
            >
              {deletePage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
