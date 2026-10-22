/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState } from 'react';
import { AdminLayout } from '@/modules/lps/components/admin/AdminLayout';
import { useAuditLogs } from '@/modules/lps/hooks/useAuditLogs';
import { useLandingPages } from '@/modules/lps/hooks/useLandingPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, History, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminAuditLogs() {
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const { data: pages } = useLandingPages();
  const { data: logs, isLoading } = useAuditLogs(
    selectedPage === 'all' ? undefined : selectedPage
  );

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4 text-green-400" />;
      case 'update':
        return <Pencil className="h-4 w-4 text-primary" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, string> = {
      create: 'bg-success/20 text-green-400 border-border/30',
      update: 'bg-blue-500/20 text-primary border-border/30',
      delete: 'bg-destructive/20 text-destructive border-border/30',
    };
    const labels: Record<string, string> = {
      create: 'Criado',
      update: 'Atualizado',
      delete: 'Excluído',
    };
    return (
      <Badge className={`${variants[action]} border`}>
        {labels[action]}
      </Badge>
    );
  };

  const getPageName = (pageId: string) => {
    return pages?.find(p => p.id === pageId)?.name || 'Página desconhecida';
  };

  const formatFieldName = (field: string) => {
    const names: Record<string, string> = {
      title: 'Título',
      subtitle: 'Subtítulo',
      content: 'Conteúdo',
      image_url: 'Imagem',
      button_text: 'Texto do Botão',
      button_link: 'Link do Botão',
      background_color: 'Cor de Fundo',
      text_color: 'Cor do Texto',
      order_index: 'Ordem',
      is_visible: 'Visibilidade',
      settings: 'Configurações',
    };
    return names[field] || field;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <History className="h-6 w-6" />
              Histórico de Alterações
            </h1>
            <p className="text-muted-foreground">Acompanhe todas as mudanças nos blocos</p>
          </div>
          <Select value={selectedPage} onValueChange={setSelectedPage}>
            <SelectTrigger className="w-[200px] bg-card border-border text-foreground">
              <SelectValue placeholder="Filtrar por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as páginas</SelectItem>
              {pages?.map(page => (
                <SelectItem key={page.id} value={page.id}>
                  {page.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : logs?.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma alteração registrada ainda
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs?.map(log => (
              <Card key={log.id} className="bg-card border-border">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getActionIcon(log.action)}
                      <div>
                        <CardTitle className="text-foreground text-base">
                          Bloco {log.action === 'delete' ? 'excluído' : log.action === 'create' ? 'criado' : 'atualizado'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {getPageName(log.landing_page_id)} • {format(new Date(log.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {getActionBadge(log.action)}
                  </div>
                </CardHeader>
                {log.action === 'update' && log.changed_fields && log.changed_fields.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="bg-card rounded-lg p-4 space-y-2">
                      <p className="text-sm text-muted-foreground mb-2">Campos alterados:</p>
                      <div className="flex flex-wrap gap-2">
                        {log.changed_fields.map(field => (
                          <Badge key={field} variant="outline" className="border-border text-muted-foreground">
                            {formatFieldName(field)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
                {log.action === 'create' && log.new_values && (
                  <CardContent className="pt-0">
                    <div className="bg-card rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Tipo: <span className="text-foreground">{(log.new_values as any).block_type}</span>
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
