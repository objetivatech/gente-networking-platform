/**
 * MatchmakingCheckDialog — v3.40.0
 *
 * Diálogo "Já conectei" do MatchMaking. Usa exatamente os mesmos campos do
 * Gente em Ação (data do encontro, notas e foto opcional), já que o registro
 * cria um Gente em Ação via RPC `create_matchmaking_check`.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { uploadGenteEmAcaoImage } from '@/lib/image-upload';
import type { useMatchmaking } from '@/hooks/useMatchmaking';

interface MatchmakingCheckDialogProps {
  targetId: string;
  targetName: string;
  createCheck: ReturnType<typeof useMatchmaking>['createCheck'];
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  label?: string;
}

export function MatchmakingCheckDialog({
  targetId, targetName, createCheck, className, variant = 'outline', label = 'Já conectei',
}: MatchmakingCheckDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) return;
    let imageUrl: string | undefined;
    if (file) {
      try {
        setUploading(true);
        imageUrl = (await uploadGenteEmAcaoImage(file, user.id)) || undefined;
      } catch {
        toast({ title: 'Erro no upload', description: 'Não foi possível enviar a foto.', variant: 'destructive' });
      } finally {
        setUploading(false);
      }
    }

    createCheck.mutate(
      { targetId, description: notes || undefined, meetingDate, imageUrl },
      {
        onSuccess: () => {
          setOpen(false);
          setNotes('');
          setFile(null);
        },
      },
    );
  };

  const busy = uploading || createCheck.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar conexão com {targetName}</DialogTitle>
          <DialogDescription>
            Isso cria um Gente em Ação e soma os pontos da mecânica. O contato entra em fila de
            espera de 60 dias antes de voltar às sugestões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="mm-date">Data do encontro</Label>
            <Input id="mm-date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mm-notes">Notas (opcional)</Label>
            <Textarea
              id="mm-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="O que foi conversado, oportunidades identificadas..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mm-photo">Foto do encontro (opcional)</Label>
            <Input
              id="mm-photo"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {busy ? 'Registrando...' : 'Registrar conexão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
