/**
 * @page Changelog
 * @route /changelog
 * @description Histórico de alterações e versões do sistema
 * 
 * @features
 * - Lista de versões com alterações
 * - Categorização por tipo (release, feature, fix)
 * - Ícones visuais por categoria
 * - Ordem cronológica reversa
 * 
 * @access Membros autenticados (não convidados)
 * @since 2024-12-08
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  History, 
  Rocket, 
  Sparkles, 
  Bug, 
  Wrench,
  CheckCircle2,
  Plus,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description: string | null;
  changes: string[];
  category: string;
  created_at: string;
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  release: { icon: <Rocket className="h-4 w-4" />, color: 'bg-primary text-primary-foreground', label: 'Release' },
  feature: { icon: <Sparkles className="h-4 w-4" />, color: 'bg-green-500 text-white', label: 'Novidade' },
  fix: { icon: <Bug className="h-4 w-4" />, color: 'bg-orange-500 text-white', label: 'Correção' },
  improvement: { icon: <Wrench className="h-4 w-4" />, color: 'bg-blue-500 text-white', label: 'Melhoria' },
};

function ChangelogCard({ entry }: { entry: ChangelogEntry }) {
  const config = categoryConfig[entry.category] || categoryConfig.feature;
  const changes = Array.isArray(entry.changes) ? entry.changes : [];

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color.split(' ')[0]}`} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge className={config.color}>
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
            <Badge variant="outline">v{entry.version}</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(entry.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
          </div>
        </div>
        <CardTitle className="text-lg">{entry.title}</CardTitle>
        {entry.description && (
          <CardDescription>{entry.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {changes.length > 0 && (
          <ul className="space-y-2">
            {changes.map((change, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>{change}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AddChangelogDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('feature');
  const [changesText, setChangesText] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!version.trim() || !title.trim()) {
      toast({
        title: 'Erro',
        description: 'Versão e título são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    const changes = changesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const { error } = await supabase
      .from('system_changelog')
      .insert({
        version,
        title,
        description: description || null,
        category,
        changes: changes as any,
      });

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a entrada',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'Entrada adicionada ao changelog',
    });

    setOpen(false);
    setVersion('');
    setTitle('');
    setDescription('');
    setCategory('feature');
    setChangesText('');
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Entrada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar ao Changelog</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Versão *</Label>
              <Input
                id="version"
                placeholder="1.3.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="release">Release</SelectItem>
                  <SelectItem value="feature">Novidade</SelectItem>
                  <SelectItem value="fix">Correção</SelectItem>
                  <SelectItem value="improvement">Melhoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Nome da atualização"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Breve descrição da atualização"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="changes">Alterações (uma por linha)</Label>
            <Textarea
              id="changes"
              placeholder="Nova funcionalidade X&#10;Correção do bug Y&#10;Melhoria na performance"
              value={changesText}
              onChange={(e) => setChangesText(e.target.value)}
              rows={5}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Adicionar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Changelog() {
  const { isGuest, isAdmin, isLoading: isLoadingRole } = useAdmin();
  const { toast } = useToast();

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ['changelog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_changelog')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(entry => ({
        ...entry,
        changes: Array.isArray(entry.changes) 
          ? entry.changes as string[]
          : typeof entry.changes === 'string' 
            ? JSON.parse(entry.changes)
            : [],
      })) as ChangelogEntry[];
    },
  });

  // Convidados não têm acesso
  if (!isLoadingRole && isGuest) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Changelog</h1>
            <p className="text-muted-foreground">Histórico de alterações do sistema</p>
          </div>
        </div>
        
        {isAdmin && <AddChangelogDialog onSuccess={() => refetch()} />}
      </div>

      {/* Lista de Entradas */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : entries?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma entrada no changelog</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries?.map(entry => (
            <ChangelogCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
