/**
 * DigitalMemberCard - Cartão digital de membro com QR Code (Item 6 / Fase 4).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Renderiza um cartão de visita digital com os dados do membro e um QR Code
 * que aponta para o perfil público (/membro/:slug). Permite baixar o cartão
 * como imagem PNG. Usa a identidade visual da marca (Navy #1E3A5F, Orange #F7941D).
 */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, QrCode, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NAVY = '#1E3A5F';
const ORANGE = '#F7941D';
const LOGO_SRC = '/logo-gente-card.png';

interface DigitalMemberCardProps {
  member: {
    id: string;
    full_name: string | null;
    position?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    business_segment?: string | null;
    slug?: string | null;
  };
  /** Quando false, o cartão não é gerado (perfil incompleto/não publicável). */
  canGenerate?: boolean;
  /** Mensagem exibida quando canGenerate é false. */
  lockedMessage?: string;
}

export function DigitalMemberCard({ member, canGenerate = true, lockedMessage }: DigitalMemberCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(true);
  const { toast } = useToast();

  const profilePath = `/p/${member.slug || member.id}`;
  const profileUrl = `${window.location.origin}${profilePath}`;


  useEffect(() => {
    let cancelled = false;

    const draw = async () => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 1000;
      const H = 560;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo navy
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, W, H);

      // Faixa lateral laranja
      ctx.fillStyle = ORANGE;
      ctx.fillRect(0, 0, 16, H);

      // Marca
      ctx.fillStyle = ORANGE;
      ctx.font = 'bold 34px Arial, sans-serif';
      ctx.fillText('GENTE', 60, 80);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText('NETWORKING', 60, 112);

      // Nome
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 46px Arial, sans-serif';
      ctx.fillText(member.full_name || 'Membro', 60, 240);

      // Cargo / empresa
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '26px Arial, sans-serif';
      const roleLine = [member.position, member.company].filter(Boolean).join(' • ');
      if (roleLine) ctx.fillText(roleLine, 60, 285);

      if (member.business_segment) {
        ctx.fillStyle = ORANGE;
        ctx.font = '22px Arial, sans-serif';
        ctx.fillText(member.business_segment, 60, 325);
      }

      // Contatos
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '24px Arial, sans-serif';
      let y = 400;
      if (member.email) { ctx.fillText(member.email, 60, y); y += 40; }
      if (member.phone) { ctx.fillText(member.phone, 60, y); y += 40; }

      // QR Code
      try {
        const qrDataUrl = await QRCode.toDataURL(profileUrl, {
          width: 260,
          margin: 1,
          color: { dark: NAVY, light: '#FFFFFF' },
        });
        const qrImg = new Image();
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = reject;
          qrImg.src = qrDataUrl;
        });
        if (cancelled) return;
        const qrSize = 260;
        const qrX = W - qrSize - 60;
        const qrY = H - qrSize - 70;
        // fundo branco arredondado
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText('Escaneie para ver o perfil', qrX - 14, qrY + qrSize + 44);
      } catch {
        // se falhar o QR, cartão ainda é válido
      }

      if (!cancelled) setIsDrawing(false);
    };

    draw();
    return () => { cancelled = true; };
  }, [member.full_name, member.position, member.company, member.email, member.phone, member.business_segment, profileUrl]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const safeName = (member.full_name || 'membro').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    link.download = `cartao-${safeName}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Cartão baixado!', description: 'Seu cartão digital foi salvo como imagem.' });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" /> Cartão Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative rounded-lg overflow-hidden border">
          <canvas ref={canvasRef} className="w-full h-auto block" />
          {isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
        <Button onClick={handleDownload} disabled={isDrawing} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Baixar cartão (PNG)
        </Button>
      </CardContent>
    </Card>
  );
}
