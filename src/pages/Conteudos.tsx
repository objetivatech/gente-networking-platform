import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useContents, Content } from '@/hooks/useContents';
import { useAdmin } from '@/hooks/useAdmin';
import { Plus, Video, FileText, Link as LinkIcon, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const contentSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  content_type: z.enum(['video', 'documento', 'artigo', 'link']),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  thumbnail_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ContentFormData = z.infer<typeof contentSchema>;

const contentTypeConfig: Record<Content['content_type'], { label: string; icon: React.ElementType; color: string }> = {
  video: { label: 'Vídeo', icon: Video, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
  documento: { label: 'Documento', icon: FileText, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
  artigo: { label: 'Artigo', icon: BookOpen, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
  link: { label: 'Link', icon: LinkIcon, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
};

export default function Conteudos() {
  const { contents, isLoading, createContent, deleteContent, isCreating } = useContents();
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Content['content_type'] | 'all'>('all');

  const form = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: '',
      description: '',
      content_type: 'artigo',
      url: '',
      thumbnail_url: '',
    },
  });

  const onSubmit = (data: ContentFormData) => {
    createContent({
      title: data.title,
      description: data.description || undefined,
      content_type: data.content_type,
      url: data.url || undefined,
      thumbnail_url: data.thumbnail_url || undefined,
    }, {
      onSuccess: () => {
        form.reset();
        setOpen(false);
      },
    });
  };

  const filteredContents = filter === 'all' 
    ? contents 
    : contents?.filter(c => c.content_type === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conteúdos</h1>
          <p className="text-muted-foreground">Materiais educativos e recursos para membros</p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Conteúdo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Novo Conteúdo</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do conteúdo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="documento">Documento</SelectItem>
                            <SelectItem value="artigo">Artigo</SelectItem>
                            <SelectItem value="link">Link</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Breve descrição do conteúdo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL do Conteúdo</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="thumbnail_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da Imagem (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating ? 'Salvando...' : 'Salvar Conteúdo'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
        {Object.entries(contentTypeConfig).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type as Content['content_type'])}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContents?.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum conteúdo encontrado</h3>
          <p className="text-muted-foreground">
            {isAdmin ? 'Adicione conteúdos educativos para os membros.' : 'Aguarde novos conteúdos serem publicados.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContents?.map((content) => {
            const typeConfig = contentTypeConfig[content.content_type];
            const Icon = typeConfig.icon;
            
            return (
              <Card key={content.id} className="group hover:shadow-lg transition-shadow">
                {content.thumbnail_url && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img 
                      src={content.thumbnail_url} 
                      alt={content.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge className={typeConfig.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {typeConfig.label}
                      </Badge>
                      <CardTitle className="text-lg mt-2">{content.title}</CardTitle>
                    </div>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteContent(content.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {content.creator?.full_name} • {format(new Date(content.created_at), "dd 'de' MMM", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {content.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {content.description}
                    </p>
                  )}
                  {content.url && (
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={content.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Acessar
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
