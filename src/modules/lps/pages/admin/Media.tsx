/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { AdminLayout } from '@/modules/lps/components/admin/AdminLayout';
import { MediaLibrary } from '@/modules/lps/components/admin/MediaLibrary';

export default function AdminMedia() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biblioteca de Mídia</h1>
          <p className="text-muted-foreground">
            Gerencie suas imagens. As imagens são automaticamente comprimidas para otimizar o carregamento.
          </p>
        </div>

        <MediaLibrary />
      </div>
    </AdminLayout>
  );
}
