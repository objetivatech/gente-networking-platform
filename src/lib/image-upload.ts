/**
 * @copyright Ranktop
 *
 * Utilitários de imagem compartilhados (compressão + upload) usados pelo
 * Gente em Ação e pelo MatchMaking, que gravam fotos no mesmo bucket
 * `gente-em-acao`. Centralizar evita duplicação e garante comportamento idêntico.
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { supabase } from '@/integrations/supabase/client';

/** Comprime uma imagem para JPEG, limitando a largura máxima. */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Falha ao comprimir imagem'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime e envia uma imagem ao bucket `gente-em-acao`.
 * O caminho começa com o id do usuário para satisfazer a RLS do bucket.
 * Retorna a URL pública ou `null` em caso de falha.
 */
export async function uploadGenteEmAcaoImage(file: File, userId: string): Promise<string | null> {
  const compressedBlob = await compressImage(file);
  const objectPath = `${userId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('gente-em-acao')
    .upload(objectPath, compressedBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('gente-em-acao').getPublicUrl(objectPath);
  return data.publicUrl;
}
