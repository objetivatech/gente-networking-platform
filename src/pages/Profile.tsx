/**
 * Profile - Meu Perfil (com abas, novos campos e cases)
 */

import { useState, useRef } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useStats } from '@/hooks/useStats';
import { useBusinessCases } from '@/hooks/useBusinessCases';
import { useBusinessDeals } from '@/hooks/useBusinessDeals';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import RankBadge from '@/components/RankBadge';
import { MonthlyPointsSummary } from '@/components/MonthlyPointsSummary';
import { MonthlyPointsEvolutionChart } from '@/components/MonthlyPointsEvolutionChart';
import { Loader2, Save, User, Building, Phone, Mail, Globe, Linkedin, Instagram, Camera, ImagePlus, Cake, Tag, Target, UserCheck, Megaphone, Plus, Trash2, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Profile() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { data: stats } = useStats();
  const { cases, createCase, deleteCase } = useBusinessCases();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', description: '', client_name: '', result: '' });
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    position: '',
    business_segment: '',
    phone: '',
    bio: '',
    linkedin_url: '',
    instagram_url: '',
    website_url: '',
    birthday: '',
    what_i_do: '',
    ideal_client: '',
    how_to_refer_me: '',
    tags: [] as string[],
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company: profile.company || '',
        position: profile.position || '',
        business_segment: profile.business_segment || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        linkedin_url: profile.linkedin_url || '',
        instagram_url: profile.instagram_url || '',
        website_url: profile.website_url || '',
        birthday: profile.birthday || '',
        what_i_do: (profile as any).what_i_do || '',
        ideal_client: (profile as any).ideal_client || '',
        how_to_refer_me: (profile as any).how_to_refer_me || '',
        tags: (profile as any).tags || [],
      });
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfile(formData as any);
    setIsEditing(false);
  };

  const handleCancel = () => setIsEditing(false);
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleBannerClick = () => bannerInputRef.current?.click();

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Erro', description: 'Selecione uma imagem válida', variant: 'destructive' }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Erro', description: 'Máximo 5MB', variant: 'destructive' }); return; }
    setIsUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/banner.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
      updateProfile({ banner_url: `${publicUrl}?t=${Date.now()}` } as any);
      toast({ title: 'Sucesso!', description: 'Foto de capa atualizada' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao fazer upload da capa', variant: 'destructive' });
    } finally { setIsUploadingBanner(false); }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Erro', description: 'Selecione uma imagem válida', variant: 'destructive' }); return; }
    if (file.size > 2 * 1024 * 1024) { toast({ title: 'Erro', description: 'Máximo 2MB', variant: 'destructive' }); return; }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` } as any);
      toast({ title: 'Sucesso!', description: 'Avatar atualizado' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao fazer upload do avatar', variant: 'destructive' });
    } finally { setIsUploading(false); }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleCreateCase = () => {
    if (!newCase.title.trim()) return;
    createCase.mutate(newCase);
    setShowNewCase(false);
    setNewCase({ title: '', description: '', client_name: '', result: '' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
        </div>
        {!isEditing ? (
          <Button onClick={handleEdit}>Editar Perfil</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><Save className="mr-2 h-4 w-4" /> Salvar</>}
            </Button>
          </div>
        )}
      </div>

      {/* Card do Perfil com Banner */}
      <Card className="overflow-hidden">
        <div 
          className="relative h-32 md:h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20"
          style={profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          <button onClick={handleBannerClick} disabled={isUploadingBanner} className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            {isUploadingBanner ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <div className="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-lg"><ImagePlus className="h-5 w-5" /><span>Alterar capa</span></div>}
          </button>
          <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
        </div>

        <CardContent className="relative pt-6">
          <div className="absolute -top-16 left-6">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">{getInitials(profile?.full_name)}</AvatarFallback>
              </Avatar>
              <button onClick={handleAvatarClick} disabled={isUploading} className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {isUploading ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <Camera className="h-8 w-8 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 pt-24 md:pt-6 md:pl-40">
            <div className="hidden md:block min-w-[180px]">
              {user?.id && <MonthlyPointsSummary userId={user.id} compact />}
            </div>

            <div className="flex-1 space-y-4">
              {isEditing ? (
                <div className="space-y-6">
                  {/* Basic info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nome Completo</Label><Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>WhatsApp</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
                    <div className="space-y-2"><Label>Empresa</Label><Input value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Segmento</Label><Input value={formData.business_segment} onChange={e => setFormData({ ...formData, business_segment: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Cargo</Label><Input value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Aniversário</Label><Input type="date" value={formData.birthday} onChange={e => setFormData({ ...formData, birthday: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Bio</Label><Textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Conte um pouco sobre você..." rows={3} /></div>

                  {/* New fields */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Informações Profissionais</h3>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> O que eu faço</Label><Textarea value={formData.what_i_do} onChange={e => setFormData({ ...formData, what_i_do: e.target.value })} placeholder="Descreva seus serviços e especialidades..." rows={2} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Target className="h-4 w-4" /> Meu Cliente Ideal</Label><Textarea value={formData.ideal_client} onChange={e => setFormData({ ...formData, ideal_client: e.target.value })} placeholder="Qual perfil de cliente você busca?" rows={2} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Como me indicar</Label><Textarea value={formData.how_to_refer_me} onChange={e => setFormData({ ...formData, how_to_refer_me: e.target.value })} placeholder="Diga como os membros podem indicar você..." rows={2} /></div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Tag className="h-4 w-4" /> Tags / Habilidades</Label>
                      <div className="flex gap-2">
                        <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Ex: Marketing Digital" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                        <Button type="button" variant="outline" size="sm" onClick={addTag}>Adicionar</Button>
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                              {tag}
                              <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Social links */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>LinkedIn</Label><Input value={formData.linkedin_url} onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
                    <div className="space-y-2"><Label>Instagram</Label><Input value={formData.instagram_url} onChange={e => setFormData({ ...formData, instagram_url: e.target.value })} placeholder="@usuario" /></div>
                    <div className="space-y-2"><Label>Website</Label><Input value={formData.website_url} onChange={e => setFormData({ ...formData, website_url: e.target.value })} placeholder="https://..." /></div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
                    {profile?.position && profile?.company && <p className="text-muted-foreground">{profile.position} na {profile.company}</p>}
                  </div>
                  {(profile as any)?.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(profile as any).tags.map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  )}
                  {profile?.bio && <p className="text-foreground/80">{profile.bio}</p>}
                  <div className="flex flex-wrap gap-4 pt-2">
                    {profile?.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4" /><span>{profile.email}</span></div>}
                    {profile?.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-4 h-4" /><span>{profile.phone}</span></div>}
                    {profile?.company && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building className="w-4 h-4" /><span>{profile.company}</span></div>}
                  </div>
                  <div className="flex gap-3 pt-2">
                    {profile?.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Linkedin className="w-5 h-5" /></a>}
                    {profile?.instagram_url && <a href={`https://instagram.com/${profile.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Instagram className="w-5 h-5" /></a>}
                    {profile?.website_url && <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"><Globe className="w-5 h-5" /></a>}
                  </div>
                  <div className="md:hidden pt-4">{user?.id && <MonthlyPointsSummary userId={user.id} compact />}</div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Sobre, Estatísticas, Cases */}
      {!isEditing && (
        <Tabs defaultValue="about" className="space-y-4">
          <TabsList>
            <TabsTrigger value="about">Sobre</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="cases">Cases ({cases?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-4">
            {/* Professional info cards */}
            {((profile as any)?.what_i_do || (profile as any)?.ideal_client || (profile as any)?.how_to_refer_me) ? (
              <div className="grid md:grid-cols-3 gap-4">
                {(profile as any)?.what_i_do && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> O que eu faço</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{(profile as any).what_i_do}</p></CardContent>
                  </Card>
                )}
                {(profile as any)?.ideal_client && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Cliente Ideal</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{(profile as any).ideal_client}</p></CardContent>
                  </Card>
                )}
                {(profile as any)?.how_to_refer_me && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Como me indicar</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{(profile as any).how_to_refer_me}</p></CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Complete seu perfil com informações profissionais</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleEdit}>Editar Perfil</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Minhas Estatísticas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold text-primary">{stats?.attendances || 0}</p><p className="text-sm text-muted-foreground">Presenças</p></div>
                  <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold text-primary">{stats?.genteEmAcao?.total || 0}</p><p className="text-sm text-muted-foreground">Gente em Ação</p></div>
                  <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold text-primary">{stats?.testimonials?.sent || 0}</p><p className="text-sm text-muted-foreground">Depoimentos</p></div>
                  <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold text-primary">R$ {((stats?.businessDeals?.value || 0) / 1000).toFixed(1)}k</p><p className="text-sm text-muted-foreground">Em Negócios</p></div>
                  <div className="text-center p-4 rounded-lg bg-muted"><p className="text-2xl font-bold text-primary">{stats?.referrals?.sent || 0}</p><p className="text-sm text-muted-foreground">Indicações</p></div>
                </div>
              </CardContent>
            </Card>
            {user?.id && <MonthlyPointsSummary userId={user.id} />}
            {user?.id && <MonthlyPointsEvolutionChart userId={user.id} />}
          </TabsContent>

          <TabsContent value="cases" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Meus Cases de Negócio</h3>
              <Button size="sm" onClick={() => setShowNewCase(true)}><Plus className="h-4 w-4 mr-1" /> Novo Case</Button>
            </div>
            {cases?.length ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cases.map(c => (
                  <Card key={c.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteCase.mutate(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {c.client_name && <CardDescription>{c.client_name}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      {c.description && <p className="text-sm text-muted-foreground mb-2">{c.description}</p>}
                      {c.result && <p className="text-sm font-medium text-primary">{c.result}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum case registrado</p>
                  <p className="text-sm mt-1">Registre seus cases de sucesso para compartilhar com a comunidade</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog Novo Case */}
      <Dialog open={showNewCase} onOpenChange={setShowNewCase}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Case de Negócio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input value={newCase.title} onChange={e => setNewCase({ ...newCase, title: e.target.value })} placeholder="Ex: Projeto de Marketing Digital" /></div>
            <div className="space-y-2"><Label>Cliente</Label><Input value={newCase.client_name} onChange={e => setNewCase({ ...newCase, client_name: e.target.value })} placeholder="Nome do cliente" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={newCase.description} onChange={e => setNewCase({ ...newCase, description: e.target.value })} placeholder="Descreva o projeto..." rows={3} /></div>
            <div className="space-y-2"><Label>Resultado</Label><Input value={newCase.result} onChange={e => setNewCase({ ...newCase, result: e.target.value })} placeholder="Ex: Aumento de 200% nas vendas" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCase(false)}>Cancelar</Button>
            <Button onClick={handleCreateCase} disabled={createCase.isPending || !newCase.title.trim()}>
              {createCase.isPending ? 'Criando...' : 'Criar Case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
