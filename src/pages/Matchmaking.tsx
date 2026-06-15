import SEO from '@/components/SEO';
/**
 * @page Matchmaking
 * @route /matchmaking
 * @description MatchMaking — sugestões de conexão entre perfis para membros.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { useState, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useMatchmaking, MatchSuggestion } from '@/hooks/useMatchmaking';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { uploadGenteEmAcaoImage } from '@/lib/image-upload';
import { canUseMatchmaking } from '@/lib/access-control';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  HeartHandshake, Sparkles, CheckCircle2, AlertTriangle, Building2, Briefcase, Star, Loader2, ImagePlus, X,
} from 'lucide-react';

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export default function Matchmaking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { role, isLoading: roleLoading } = useAdmin();
  const { myProfile, suggestions, isLoading, connections, createCheck } = useMatchmaking();
  const [selected, setSelected] = useState<MatchSuggestion | null>(null);
  const [description, setDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!roleLoading && !canUseMatchmaking(role)) {
    return <Navigate to="/" replace />;
  }

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor, selecione uma imagem', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 10MB', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openCheck = (s: MatchSuggestion) => {
    setSelected(s);
    setDescription('');
    setMeetingDate(new Date().toISOString().slice(0, 10));
    removeImage();
  };

  const submitCheck = async () => {
    if (!selected) return;

    let imageUrl: string | undefined;
    if (imageFile && user?.id) {
      try {
        setUploading(true);
        imageUrl = (await uploadGenteEmAcaoImage(imageFile, user.id)) || undefined;
      } catch (err: any) {
        toast({ title: 'Erro', description: err?.message || 'Falha ao enviar a imagem', variant: 'destructive' });
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    createCheck.mutate(
      { targetId: selected.id, description: description.trim() || undefined, meetingDate, imageUrl },
      { onSuccess: () => { setSelected(null); removeImage(); } }
    );
  };


  const pending = suggestions.filter((s) => !s.alreadyConnected);

  return (
    <div className="space-y-6">
      <SEO
        title="MatchMaking — Conexões inteligentes"
        description="Descubra conexões estratégicas entre os membros e convidados da comunidade Gente Networking com base no perfil de cada pessoa."
      />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <HeartHandshake className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">MatchMaking</h1>
          <p className="text-muted-foreground">Conexões sugeridas a partir dos perfis da comunidade.</p>
        </div>
      </div>

      {myProfile && !myProfile.isComplete && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Complete seu perfil para um MatchMaking melhor</AlertTitle>
          <AlertDescription>
            Preencha {myProfile.missingFields.join(', ')} para receber e gerar conexões mais precisas.{' '}
            <Link to="/perfil" className="font-medium underline">Completar perfil</Link>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-2">
            <Sparkles className="h-4 w-4" /> Sugestões ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="connected" className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> Já conectados ({connections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : pending.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma sugestão de conexão no momento. Complete seu perfil e volte em breve.
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map((s) => (
                <Card key={s.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback>{initials(s.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{s.full_name}</CardTitle>
                        {s.position && <p className="text-sm text-muted-foreground truncate">{s.position}</p>}
                      </div>
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Star className="h-3 w-3" /> {s.score}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 flex-1">
                    <div className="space-y-1 text-sm">
                      {s.company && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{s.company}</span>
                        </div>
                      )}
                      {s.business_segment && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{s.business_segment}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {s.reasons.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs font-normal">{r}</Badge>
                      ))}
                    </div>
                    {s.role === 'convidado' && (
                      <Badge variant="secondary" className="w-fit text-xs">Convidado</Badge>
                    )}
                    <Button className="mt-auto w-full" onClick={() => openCheck(s)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Já conectei
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connected" className="mt-4">
          {connections.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">
              Você ainda não registrou nenhuma conexão.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {connections.map((c) => (
                <Card key={c.id}>
                  <CardContent className="py-4 flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={c.target?.avatar_url || undefined} />
                      <AvatarFallback>{initials(c.target?.full_name || '?')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.target?.full_name || 'Contato'}</p>
                      {c.target?.company && <p className="text-sm text-muted-foreground">{c.target.company}</p>}
                      {c.description && <p className="text-sm mt-1">{c.description}</p>}
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); removeImage(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar conexão com {selected?.full_name}</DialogTitle>
            <DialogDescription>
              Isso cria um registro de Gente em Ação (reunião 1x1) e soma +10 pontos de MatchMaking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2" data-rd-no-capture="true">
            {selected && (
              <div className="flex items-center gap-3 rounded-md border p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selected.avatar_url || undefined} />
                  <AvatarFallback>{initials(selected.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{selected.full_name}</p>
                  {selected.company && <p className="text-sm text-muted-foreground truncate">{selected.company}</p>}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mm-date">Data da Reunião</Label>
              <Input id="mm-date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mm-desc">Notas (opcional)</Label>
              <Textarea
                id="mm-desc"
                placeholder="Descreva brevemente a conversa, oportunidade ou próximo passo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label>Foto do Encontro (opcional)</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Pré-visualização" className="w-full max-h-48 object-cover rounded-md" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4 mr-2" /> Adicionar foto
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); removeImage(); }}>Cancelar</Button>
            <Button onClick={submitCheck} disabled={createCheck.isPending || uploading}>
              {(createCheck.isPending || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar conexão
            </Button>
          </DialogFooter>
        </DialogContent>

      </Dialog>
    </div>
  );
}
