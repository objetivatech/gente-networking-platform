/**
 * @file ShareOrNudgeProfile.tsx
 * @description Botão de destaque no topo do perfil de um membro. Quando o membro
 * possui página pública publicada (/m/:slug), permite compartilhar o link público.
 * Quando ainda não há página (perfil incompleto ou despublicado), transforma-se em
 * um convite para que outro membro peça o preenchimento dos dados — reforçando o
 * cuidado entre membros. No próprio perfil, leva para "Meu Perfil".
 * @copyright Ranktop / Gente Networking
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Share2, HeartHandshake, Loader2, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getProfileCompleteness } from '@/lib/profile-completeness';

interface Props {
  member: Record<string, any>;
  currentUserId?: string | null;
}

/** URL canônica da página pública do membro. */
export function getPublicProfileUrl(member: Record<string, any>): string {
  return `${window.location.origin}/m/${member?.slug || member?.id || ''}`;
}

export default function ShareOrNudgeProfile({ member, currentUserId }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { missing, isComplete } = getProfileCompleteness(member);
  const isPublished = !!member?.public_profile_enabled && isComplete;
  const isSelf = !!currentUserId && currentUserId === member?.id;
  const firstName = (member?.full_name || 'o membro').split(' ')[0];

  const handleShare = async () => {
    const url = getPublicProfileUrl(member);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Perfil público de ${member.full_name}`, url });
        return;
      } catch {
        /* usuário cancelou — cai para a cópia */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link do perfil público copiado!', description: url });
    } catch {
      toast({ title: 'Não foi possível copiar', description: url, variant: 'destructive' });
    }
  };

  const sendNudge = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'profile_completion_request',
          to_user_id: member.id,
          from_user_id: currentUserId || undefined,
          missing_fields: missing.map((m) => m.label),
          content: message.trim() || undefined,
        },
      });
      if (error) throw error;
      toast({
        title: 'Pedido enviado!',
        description: `${firstName} vai receber um aviso para completar o perfil.`,
      });
      setOpen(false);
      setMessage('');
    } catch (err) {
      console.error('[ShareOrNudgeProfile] erro ao enviar pedido:', err);
      toast({
        title: 'Não foi possível enviar o pedido',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Próprio perfil sem página pública: leva para publicar
  if (isSelf && !isPublished) {
    return (
      <Button
        className="w-full min-w-0 bg-[#F7941D] font-semibold text-white hover:bg-[#e0850f] sm:w-auto"
        onClick={() => navigate('/perfil')}
      >
        <Globe className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate">Publicar minha página</span>
      </Button>
    );
  }

  if (isPublished) {
    return (
      <Button
        className="w-full min-w-0 bg-[#F7941D] font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-[#e0850f] sm:w-auto"
        onClick={handleShare}
      >
        <Share2 className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate">
          <span className="sm:hidden">Compartilhar perfil</span>
          <span className="hidden sm:inline">Compartilhar perfil público</span>
        </span>
      </Button>
    );
  }

  return (
    <>
      <Button
        className="w-full min-w-0 bg-[#F7941D] font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-[#e0850f] sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <HeartHandshake className="mr-2 h-4 w-4 shrink-0" />
        <span className="truncate">Pedir para completar o perfil</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pedir para {firstName} completar o perfil</DialogTitle>
            <DialogDescription>
              {firstName} ainda não tem uma página pública ativa. Sem ela, fica mais difícil
              indicar e apresentar esse trabalho para fora da comunidade.
            </DialogDescription>
          </DialogHeader>

          {missing.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Faltam preencher
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((m) => (
                  <span
                    key={m.key}
                    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-600 text-wrap-anywhere"
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder={`Mensagem opcional para ${firstName}...`}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{message.length}/500</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={sendNudge} disabled={sending} className="bg-[#F7941D] hover:bg-[#e0850f]">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HeartHandshake className="mr-2 h-4 w-4" />}
              Enviar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
