import { useState } from 'react';
import { useCouncilPosts, useCouncilReplies, useCouncilMutations, CouncilPost } from '@/hooks/useCouncil';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, MessageCircle, CheckCircle2, Clock, ArrowRight, Star, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  aberto: { label: 'Aberto', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: ArrowRight },
  resolvido: { label: 'Resolvido', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
};

function PostCard({ post, onClick }: { post: CouncilPost; onClick: () => void }) {
  const config = STATUS_CONFIG[post.status];
  const StatusIcon = config.icon;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.author_avatar || ''} />
            <AvatarFallback>{post.author_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2">{post.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {post.author_name} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`text-xs ${config.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {post.replies_count}
              </span>
              {post.has_best_answer && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PostDetail({ post, onClose }: { post: CouncilPost; onClose: () => void }) {
  const { user } = useAuth();
  const { data: replies, isLoading } = useCouncilReplies(post.id);
  const { createReply, markBestAnswer, updatePostStatus, deletePost } = useCouncilMutations();
  const [replyContent, setReplyContent] = useState('');
  const isAuthor = user?.id === post.user_id;

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createReply.mutate({ postId: post.id, content: replyContent }, {
      onSuccess: () => setReplyContent(''),
    });
  };

  const config = STATUS_CONFIG[post.status];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">{post.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author_avatar || ''} />
              <AvatarFallback>{post.author_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{post.author_name}</span>
            <Badge variant="outline" className={`text-xs ${config.color}`}>{config.label}</Badge>
          </div>
        </div>
        {isAuthor && (
          <div className="flex gap-1">
            {post.status === 'aberto' && (
              <Button size="sm" variant="outline" onClick={() => updatePostStatus.mutate({ postId: post.id, status: 'em_andamento' })}>
                Em Andamento
              </Button>
            )}
            {post.status !== 'resolvido' && (
              <Button size="sm" variant="outline" onClick={() => updatePostStatus.mutate({ postId: post.id, status: 'resolvido' })}>
                Resolvido
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { deletePost.mutate(post.id); onClose(); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {post.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.description}</p>
      )}

      <div className="border-t pt-4">
        <h3 className="font-semibold text-sm mb-3">Respostas ({replies?.length || 0})</h3>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        ) : (
          <div className="space-y-3">
            {replies?.map(reply => (
              <div key={reply.id} className={`p-3 rounded-lg border ${reply.is_best_answer ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : 'bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={reply.author_avatar || ''} />
                      <AvatarFallback>{reply.author_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{reply.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    {reply.is_best_answer && (
                      <Badge className="bg-yellow-500 text-white text-xs">
                        <Star className="w-3 h-3 mr-1" /> Melhor resposta
                      </Badge>
                    )}
                  </div>
                  {isAuthor && !reply.is_best_answer && reply.user_id !== user?.id && (
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => markBestAnswer.mutate({ replyId: reply.id, postId: post.id })}>
                      <Star className="w-3 h-3 mr-1" /> Marcar melhor
                    </Button>
                  )}
                </div>
                <p className="text-sm mt-2 whitespace-pre-wrap">{reply.content}</p>
              </div>
            ))}
          </div>
        )}

        {post.status !== 'resolvido' && (
          <div className="mt-4 flex gap-2">
            <Textarea
              placeholder="Escreva sua resposta..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px]"
            />
            <Button onClick={handleReply} disabled={createReply.isPending || !replyContent.trim()}>
              {createReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Conselho() {
  const { data: posts, isLoading } = useCouncilPosts();
  const { createPost } = useCouncilMutations();
  const [selectedPost, setSelectedPost] = useState<CouncilPost | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createPost.mutate({ title: newTitle, description: newDescription || undefined }, {
      onSuccess: () => { setNewTitle(''); setNewDescription(''); setDialogOpen(false); },
    });
  };

  const columns = {
    aberto: (posts || []).filter(p => p.status === 'aberto'),
    em_andamento: (posts || []).filter(p => p.status === 'em_andamento'),
    resolvido: (posts || []).filter(p => p.status === 'resolvido'),
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Conselho 24/7
          </h1>
          <p className="text-muted-foreground">Tire dúvidas e ajude outros membros</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Nova Dúvida</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publicar dúvida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Título da dúvida" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <Textarea placeholder="Descreva sua dúvida em detalhes..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              <Button onClick={handleCreate} disabled={createPost.isPending || !newTitle.trim()} className="w-full">
                {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Publicar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile: tabs view */}
      <div className="md:hidden">
        <Tabs defaultValue="aberto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="aberto">Abertos ({columns.aberto.length})</TabsTrigger>
            <TabsTrigger value="em_andamento">Andamento ({columns.em_andamento.length})</TabsTrigger>
            <TabsTrigger value="resolvido">Resolvidos ({columns.resolvido.length})</TabsTrigger>
          </TabsList>
          {Object.entries(columns).map(([status, items]) => (
            <TabsContent key={status} value={status} className="space-y-3 mt-4">
              {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum tópico</p>}
              {items.map(post => (
                <PostCard key={post.id} post={post} onClick={() => { setSelectedPost(post); setDetailOpen(true); }} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Desktop: Kanban board */}
      <div className="hidden md:grid grid-cols-3 gap-4">
        {Object.entries(columns).map(([status, items]) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const StatusIcon = config.icon;
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b">
                <StatusIcon className="w-4 h-4" />
                <h2 className="font-semibold text-sm">{config.label}</h2>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhum tópico</p>}
                {items.map(post => (
                  <PostCard key={post.id} post={post} onClick={() => { setSelectedPost(post); setDetailOpen(true); }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Post detail dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedPost(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedPost && <PostDetail post={selectedPost} onClose={() => setDetailOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
