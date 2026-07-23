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
 * que aponta para o perfil público (/p/:slug). Permite baixar o cartão
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
const LOGO_COMUNIDADE_SRC = '/logo-gente-comunidade-branco.png';
const LOGO_NETWORKING_SRC = '/logo-gente-networking-branco.png';

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Desenha texto com quebra automática por palavra, respeitando `maxWidth`.
 * Palavras individuais maiores que a largura são quebradas por caractere.
 * Retorna o Y da próxima linha (após o bloco desenhado).
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  if (!text) return y;
  const words = String(text).split(/\s+/).filter(Boolean);
  let line = '';
  let cursorY = y;
  const flush = (l: string) => {
    ctx.fillText(l, x, cursorY);
    cursorY += lineHeight;
  };
  const breakLong = (word: string): string[] => {
    const parts: string[] = [];
    let buf = '';
    for (const ch of word) {
      const test = buf + ch;
      if (ctx.measureText(test).width > maxWidth && buf) {
        parts.push(buf);
        buf = ch;
      } else {
        buf = test;
      }
    }
    if (buf) parts.push(buf);
    return parts;
  };
  for (const raw of words) {
    const pieces = ctx.measureText(raw).width > maxWidth ? breakLong(raw) : [raw];
    for (const w of pieces) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        flush(line);
        line = w;
      } else {
        line = test;
      }
    }
  }
  if (line) flush(line);
  return cursorY;
}

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

  const profilePath = `/m/${member.slug || member.id}`;
  const profileUrl = `${window.location.origin}${profilePath}`;

  useEffect(() => {
    let cancelled = false;

    const draw = async () => {
      if (!canGenerate) return;
      setIsDrawing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 1000;
      const H = 620;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo navy + faixa lateral laranja
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = ORANGE;
      ctx.fillRect(0, 0, 16, H);

      // Logo Comunidade — destaque, canto superior esquerdo
      try {
        const comunidadeImg = await loadImage(LOGO_COMUNIDADE_SRC);
        if (cancelled) return;
        const logoH = 100;
        const logoW = (comunidadeImg.width / comunidadeImg.height) * logoH;
        ctx.drawImage(comunidadeImg, 60, 45, logoW, logoH);
      } catch {
        ctx.fillStyle = ORANGE;
        ctx.font = 'bold 34px Arial, sans-serif';
        ctx.fillText('GENTE', 60, 80);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText('COMUNIDADE', 60, 112);
      }

      // Logo Networking — secundário, canto superior direito
      try {
        const networkingImg = await loadImage(LOGO_NETWORKING_SRC);
        if (cancelled) return;
        const nH = 56;
        const nW = (networkingImg.width / networkingImg.height) * nH;
        ctx.drawImage(networkingImg, W - nW - 60, 62, nW, nH);
      } catch {
        // fallback silencioso
      }

      // QR Code (canto inferior direito) — desenhado antes para calcular largura útil do texto
      const qrSize = 260;
      const qrX = W - qrSize - 60;
      const qrY = H - qrSize - 90;
      const TEXT_MAX_WIDTH = qrX - 60 - 20; // margem esquerda 60, gap 20 antes do QR

      // Nome
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 46px Arial, sans-serif';
      let y = wrapText(ctx, member.full_name || 'Membro', 60, 210, TEXT_MAX_WIDTH, 52);

      // Cargo / empresa
      const roleLine = [member.position, member.company].filter(Boolean).join(' • ');
      if (roleLine) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '26px Arial, sans-serif';
        y = wrapText(ctx, roleLine, 60, y + 10, TEXT_MAX_WIDTH, 32);
      }

      // Segmento
      if (member.business_segment) {
        ctx.fillStyle = ORANGE;
        ctx.font = '22px Arial, sans-serif';
        y = wrapText(ctx, member.business_segment, 60, y + 8, TEXT_MAX_WIDTH, 28);
      }

      // Contatos
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '24px Arial, sans-serif';
      y += 20;
      if (member.email) y = wrapText(ctx, member.email, 60, y, TEXT_MAX_WIDTH, 30) + 6;
      if (member.phone) y = wrapText(ctx, member.phone, 60, y, TEXT_MAX_WIDTH, 30);

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
  }, [member.full_name, member.position, member.company, member.email, member.phone, member.business_segment, profileUrl, canGenerate]);



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
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary shrink-0" /> Cartão Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canGenerate ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <Lock className="h-6 w-6" />
            <p className="text-sm text-wrap-anywhere">
              {lockedMessage || 'Complete e publique seu perfil para gerar o cartão digital.'}
            </p>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-full overflow-hidden rounded-lg border">
              <canvas ref={canvasRef} className="block w-full h-auto max-w-full" />
              {isDrawing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <Button onClick={handleDownload} disabled={isDrawing} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Baixar cartão (PNG)
            </Button>
          </>
        )}
      </CardContent>

    </Card>
  );
}
