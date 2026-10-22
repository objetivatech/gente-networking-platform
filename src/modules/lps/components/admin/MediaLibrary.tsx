/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState, useCallback } from 'react';
import { useMediaLibrary, useUploadMedia, useDeleteMedia } from '@/modules/lps/hooks/useMediaLibrary';
import { compressImage, formatFileSize } from '@/modules/lps/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Upload, Trash2, Copy, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface MediaLibraryProps {
  onSelect?: (url: string) => void;
  selectable?: boolean;
}

export function MediaLibrary({ onSelect, selectable = false }: MediaLibraryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: media, isLoading } = useMediaLibrary();
  const uploadMedia = useUploadMedia();
  const deleteMedia = useDeleteMedia();

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploading(true);
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Processando ${i + 1}/${fileArray.length}: ${file.name}`);

      try {
        // Compress image
        setUploadProgress(`Comprimindo ${file.name}...`);
        const compressedFile = await compressImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });

        const originalSize = formatFileSize(file.size);
        const compressedSize = formatFileSize(compressedFile.size);
        console.log(`Compressed ${file.name}: ${originalSize} → ${compressedSize}`);

        // Upload to Supabase Storage
        setUploadProgress(`Enviando ${file.name}...`);
        await uploadMedia.mutateAsync({ file: compressedFile });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }

    setIsUploading(false);
    setUploadProgress('');
    toast.success('Upload concluído!');
  }, [uploadMedia]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMedia.mutateAsync(deleteConfirm);
      toast.success('Imagem excluída!');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Erro ao excluir imagem');
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-border bg-secondary/10'
            : 'border-border hover:border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />
        {isUploading ? (
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-secondary" />
            <p className="text-muted-foreground">{uploadProgress}</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Arraste imagens aqui ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground mt-1">
              As imagens serão automaticamente comprimidas para otimizar o carregamento
            </p>
          </>
        )}
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : !media?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma imagem na biblioteca</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.map((item) => (
            <Card
              key={item.id}
              className={`relative group overflow-hidden bg-card border-border ${
                selectable ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''
              }`}
              onClick={() => { if (selectable) { if (item.file_url.includes('/object/sign/')) { toast.error('Arquivo privado: aguarde a liberação de imagens públicas.'); return; } onSelect?.(item.file_url); } }}
            >
              <div className="aspect-square">
                <img
                  src={item.file_url}
                  alt={item.alt_text || item.file_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!selectable && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.file_url.includes('/object/sign/')) toast.error('Arquivo privado: links temporários não devem ser publicados.');
                        else handleCopyUrl(item.file_url);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs text-muted-foreground truncate">{item.file_name}</p>
                {item.file_size && (
                  <p className="text-xs text-muted-foreground">{formatFileSize(item.file_size)}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Excluir Imagem</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMedia.isPending}
            >
              {deleteMedia.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
