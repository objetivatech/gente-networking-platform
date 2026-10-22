/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useBlocks, useCreateBlock, useUpdateBlock, useDeleteBlock, PageBlock } from '@/modules/lps/hooks/useBlocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type Block = PageBlock;
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Loader2,
  Image as ImageIcon,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { BLOCK_TYPES } from '@/modules/lps/lib/constants';
import { MediaLibrary } from './MediaLibrary';

interface BlockEditorProps {
  pageId: string;
}

// Component for editing a single block with local state and debounced save
function BlockEditorItem({ 
  block, 
  index, 
  totalBlocks,
  onUpdate, 
  onDelete, 
  onDuplicate, 
  onMove,
  onOpenMediaDialog,
}: {
  block: Block;
  index: number;
  totalBlocks: number;
  onUpdate: (block: Block, updates: Partial<Block>) => Promise<void>;
  onDelete: (id: string) => void;
  onDuplicate: (block: Block) => void;
  onMove: (block: Block, direction: 'up' | 'down') => void;
  onOpenMediaDialog: (blockId: string) => void;
}) {
  // Local state for form fields
  const [localValues, setLocalValues] = useState({
    title: block.title || '',
    subtitle: block.subtitle || '',
    content: block.content || '',
    image_url: block.image_url || '',
    background_color: block.background_color || '',
    text_color: block.text_color || '',
    font_size: block.font_size || '',
    title_color: block.title_color || '',
    title_font_size: block.title_font_size || '',
    subtitle_color: block.subtitle_color || '',
    subtitle_font_size: block.subtitle_font_size || '',
    content_color: block.content_color || '',
    content_font_size: block.content_font_size || '',
    button_text: block.button_text || '',
    button_link: block.button_link || '',
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Partial<Block>>({});

  // Sync local state when block changes from server
  useEffect(() => {
    setLocalValues({
      title: block.title || '',
      subtitle: block.subtitle || '',
      content: block.content || '',
      image_url: block.image_url || '',
      background_color: block.background_color || '',
      text_color: block.text_color || '',
      font_size: block.font_size || '',
      title_color: block.title_color || '',
      title_font_size: block.title_font_size || '',
      subtitle_color: block.subtitle_color || '',
      subtitle_font_size: block.subtitle_font_size || '',
      content_color: block.content_color || '',
      content_font_size: block.content_font_size || '',
      button_text: block.button_text || '',
      button_link: block.button_link || '',
    });
  }, [block.id]); // Only reset when block ID changes, not on every update

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        onUpdate(block, pendingUpdatesRef.current);
        pendingUpdatesRef.current = {};
      }
    }, 500); // 500ms debounce
  }, [block, onUpdate]);

  // Handle field change with debouncing
  const handleFieldChange = useCallback((field: keyof typeof localValues, value: string) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
    pendingUpdatesRef.current[field] = value || null;
    debouncedSave();
  }, [debouncedSave]);

  // Save on blur for immediate feedback
  const handleBlur = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      onUpdate(block, pendingUpdatesRef.current);
      pendingUpdatesRef.current = {};
    }
  }, [block, onUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const getBlockTypeName = (type: string) => {
    return BLOCK_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <AccordionItem
      value={block.id}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-card/50">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 font-medium text-foreground">
          {getBlockTypeName(block.block_type)}
          {localValues.title && `: ${localValues.title}`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onMove(block, 'up')}
            disabled={index === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onMove(block, 'down')}
            disabled={index === totalBlocks - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onUpdate(block, { is_visible: !block.is_visible })}
            title={block.is_visible ? 'Ocultar' : 'Mostrar'}
          >
            {block.is_visible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onDuplicate(block)}
            title="Duplicar bloco"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(block.id)}
            title="Excluir bloco"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <AccordionTrigger className="py-0" />
      </div>
      <AccordionContent className="px-4 pb-4 pt-2">
        <div className="grid gap-6">
          <div className="space-y-3 p-3 bg-card/50 rounded-lg">
            <h4 className="text-sm font-semibold text-border">Título</h4>
            <div>
              <Input
                value={localValues.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                onBlur={handleBlur}
                className="bg-card border-border text-foreground"
                placeholder="Título do bloco"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Cor</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={localValues.title_color || '#ffffff'}
                    onChange={(e) => handleFieldChange('title_color', e.target.value)}
                    onBlur={handleBlur}
                    className="w-12 h-9 p-1 bg-card border-border"
                  />
                  <Input
                    value={localValues.title_color}
                    onChange={(e) => handleFieldChange('title_color', e.target.value)}
                    onBlur={handleBlur}
                    className="flex-1 bg-card border-border text-foreground text-sm"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tamanho</label>
                <Input
                  value={localValues.title_font_size}
                  onChange={(e) => handleFieldChange('title_font_size', e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 bg-card border-border text-foreground text-sm"
                  placeholder="Ex: 32px, 2rem"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3 bg-card/50 rounded-lg">
            <h4 className="text-sm font-semibold text-border">Subtítulo</h4>
            <div>
              <Input
                value={localValues.subtitle}
                onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                onBlur={handleBlur}
                className="bg-card border-border text-foreground"
                placeholder="Subtítulo do bloco"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Cor</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={localValues.subtitle_color || '#ffffff'}
                    onChange={(e) => handleFieldChange('subtitle_color', e.target.value)}
                    onBlur={handleBlur}
                    className="w-12 h-9 p-1 bg-card border-border"
                  />
                  <Input
                    value={localValues.subtitle_color}
                    onChange={(e) => handleFieldChange('subtitle_color', e.target.value)}
                    onBlur={handleBlur}
                    className="flex-1 bg-card border-border text-foreground text-sm"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tamanho</label>
                <Input
                  value={localValues.subtitle_font_size}
                  onChange={(e) => handleFieldChange('subtitle_font_size', e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 bg-card border-border text-foreground text-sm"
                  placeholder="Ex: 20px, 1.25rem"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3 bg-card/50 rounded-lg">
            <h4 className="text-sm font-semibold text-border">Conteúdo</h4>
            <div>
              <Textarea
                value={localValues.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}
                onBlur={handleBlur}
                className="bg-card border-border text-foreground"
                placeholder="Conteúdo do bloco"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Cor</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={localValues.content_color || '#ffffff'}
                    onChange={(e) => handleFieldChange('content_color', e.target.value)}
                    onBlur={handleBlur}
                    className="w-12 h-9 p-1 bg-card border-border"
                  />
                  <Input
                    value={localValues.content_color}
                    onChange={(e) => handleFieldChange('content_color', e.target.value)}
                    onBlur={handleBlur}
                    className="flex-1 bg-card border-border text-foreground text-sm"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tamanho</label>
                <Input
                  value={localValues.content_font_size}
                  onChange={(e) => handleFieldChange('content_font_size', e.target.value)}
                  onBlur={handleBlur}
                  className="mt-1 bg-card border-border text-foreground text-sm"
                  placeholder="Ex: 16px, 1rem"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Imagem</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={localValues.image_url}
                  onChange={(e) => handleFieldChange('image_url', e.target.value)}
                  onBlur={handleBlur}
                  className="bg-card border-border text-foreground"
                  placeholder="URL da imagem"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onOpenMediaDialog(block.id)}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Cor de Fundo</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={localValues.background_color || '#1e293b'}
                  onChange={(e) => handleFieldChange('background_color', e.target.value)}
                  onBlur={handleBlur}
                  className="w-12 h-10 p-1 bg-card border-border"
                />
                <Input
                  value={localValues.background_color}
                  onChange={(e) => handleFieldChange('background_color', e.target.value)}
                  onBlur={handleBlur}
                  className="flex-1 bg-card border-border text-foreground"
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Cor do Texto</label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={localValues.text_color || '#ffffff'}
                  onChange={(e) => handleFieldChange('text_color', e.target.value)}
                  onBlur={handleBlur}
                  className="w-12 h-10 p-1 bg-card border-border"
                />
                <Input
                  value={localValues.text_color}
                  onChange={(e) => handleFieldChange('text_color', e.target.value)}
                  onBlur={handleBlur}
                  className="flex-1 bg-card border-border text-foreground"
                  placeholder="#RRGGBB ou vazio p/ padrão"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tamanho da Fonte</label>
              <Input
                value={localValues.font_size}
                onChange={(e) => handleFieldChange('font_size', e.target.value)}
                onBlur={handleBlur}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Ex: 18px, 1.5rem, large"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Texto do Botão</label>
              <Input
                value={localValues.button_text}
                onChange={(e) => handleFieldChange('button_text', e.target.value)}
                onBlur={handleBlur}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Ex: Inscreva-se"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Link do Botão</label>
              <Input
                value={localValues.button_link}
                onChange={(e) => handleFieldChange('button_link', e.target.value)}
                onBlur={handleBlur}
                className="mt-1 bg-card border-border text-foreground"
                placeholder="Ex: #form"
              />
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function BlockEditor({ pageId }: BlockEditorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newBlockType, setNewBlockType] = useState('');

  const { data: blocks, isLoading } = useBlocks(pageId);
  const createBlock = useCreateBlock();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();

  const handleAddBlock = async () => {
    if (!newBlockType) return;
    try {
      await createBlock.mutateAsync({
        landing_page_id: pageId,
        block_type: newBlockType,
        order_index: (blocks?.length || 0) + 1,
        is_visible: true,
      });
      setShowAddDialog(false);
      setNewBlockType('');
      toast.success('Bloco adicionado!');
    } catch (error) {
      toast.error('Erro ao adicionar bloco');
    }
  };

  const handleUpdateBlock = useCallback(async (block: Block, updates: Partial<Block>) => {
    try {
      console.log('Atualizando bloco:', block.id, 'com updates:', updates);
      await updateBlock.mutateAsync({ id: block.id, landing_page_id: pageId, ...updates });
    } catch (error) {
      console.error('Erro completo ao atualizar bloco:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
      console.error('Updates tentados:', updates);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      if (errorMessage.includes('row-level security') || errorMessage.includes('permission') || errorMessage.includes('policy')) {
        toast.error('Erro de permissão. Faça logout e login novamente.');
      } else {
        toast.error(`Erro ao salvar o bloco: ${errorMessage}`);
      }
    }
  }, [updateBlock, pageId]);

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await deleteBlock.mutateAsync({ id: blockId, landingPageId: pageId });
      toast.success('Bloco excluído!');
    } catch (error) {
      toast.error('Erro ao excluir bloco');
    }
  };

  const handleDuplicateBlock = async (block: Block) => {
    try {
      await createBlock.mutateAsync({
        landing_page_id: pageId,
        block_type: block.block_type,
        title: block.title ? `${block.title} (cópia)` : null,
        subtitle: block.subtitle,
        content: block.content,
        image_url: block.image_url,
        background_color: block.background_color,
        text_color: block.text_color,
        button_text: block.button_text,
        button_link: block.button_link,
        settings: block.settings,
        order_index: (blocks?.length || 0) + 1,
        is_visible: true,
      });
      toast.success('Bloco duplicado!');
    } catch (error) {
      toast.error('Erro ao duplicar bloco');
    }
  };

  const handleMoveBlock = useCallback(async (block: Block, direction: 'up' | 'down') => {
    if (!blocks) return;
    const currentIndex = blocks.findIndex((b) => b.id === block.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const otherBlock = blocks[newIndex];
    
    try {
      await updateBlock.mutateAsync({ id: block.id, landing_page_id: pageId, order_index: otherBlock.order_index });
      await updateBlock.mutateAsync({ id: otherBlock.id, landing_page_id: pageId, order_index: block.order_index });
    } catch (error) {
      toast.error('Erro ao reordenar blocos');
    }
  }, [blocks, updateBlock, pageId]);

  const handleSelectImage = (url: string) => {
    if (selectedBlockId) {
      const block = blocks?.find((b) => b.id === selectedBlockId);
      if (block) {
        handleUpdateBlock(block, { image_url: url });
      }
    }
    setShowMediaDialog(false);
    setSelectedBlockId(null);
  };

  const handleOpenMediaDialog = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    setShowMediaDialog(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Block List */}
      {blocks?.length === 0 ? (
        <Card className="bg-card border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">Nenhum bloco adicionado ainda</p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Bloco
          </Button>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {blocks?.map((block, index) => (
            <BlockEditorItem
              key={block.id}
              block={block}
              index={index}
              totalBlocks={blocks.length}
              onUpdate={handleUpdateBlock}
              onDelete={handleDeleteBlock}
              onDuplicate={handleDuplicateBlock}
              onMove={handleMoveBlock}
              onOpenMediaDialog={handleOpenMediaDialog}
            />
          ))}
        </Accordion>
      )}

      {/* Add Block Button */}
      <Button onClick={() => setShowAddDialog(true)} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Bloco
      </Button>

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Bloco</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={newBlockType} onValueChange={setNewBlockType}>
              <SelectTrigger className="bg-card border-border text-foreground">
                <SelectValue placeholder="Selecione o tipo de bloco" />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddBlock} disabled={!newBlockType || createBlock.isPending}>
              {createBlock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Library Dialog */}
      <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Imagem</DialogTitle>
          </DialogHeader>
          <MediaLibrary onSelect={handleSelectImage} selectable />
        </DialogContent>
      </Dialog>
    </div>
  );
}
