/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
// Design System Colors (based on LP identity)
export const GENTE_HUB_COLORS = {
  primary: 'hsl(var(--secondary))',
  secondary: '#F5A623',
  background: 'hsl(var(--secondary))',
  text: 'hsl(var(--primary-foreground))',
};

export const GENTE_NETWORKING_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: '#3B82F6',
  accent: 'hsl(var(--secondary))',
  background: 'linear-gradient(135deg, #1E3A5F 0%, #3B82F6 100%)',
  text: 'hsl(var(--primary-foreground))',
};

// Block Types
export const BLOCK_TYPES = [
  { value: 'hero', label: 'Hero (Seção Principal)', icon: 'Layout' },
  { value: 'countdown', label: 'Contador Regressivo', icon: 'Clock' },
  { value: 'cta', label: 'Call-to-Action', icon: 'MousePointer' },
  { value: 'banner', label: 'Banner', icon: 'Image' },
  { value: 'info', label: 'Bloco de Informação', icon: 'Info' },
  { value: 'form', label: 'Formulário', icon: 'FileText' },
  { value: 'testimonials', label: 'Depoimentos', icon: 'MessageSquare' },
  { value: 'gallery', label: 'Galeria', icon: 'Images' },
  { value: 'video', label: 'Vídeo', icon: 'Video' },
  { value: 'faq', label: 'FAQ', icon: 'HelpCircle' },
] as const;

// Lead Status
export const LEAD_STATUS = [
  { value: 'new', label: 'Novo', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contatado', color: 'bg-yellow-500' },
  { value: 'converted', label: 'Convertido', color: 'bg-success' },
  { value: 'lost', label: 'Perdido', color: 'bg-destructive' },
] as const;

// RD Station Script
export const RD_STATION_SCRIPT_URL = 'https://d335luupugsy2.cloudfront.net/js/loader-scripts/53c5511f-7826-461e-9c96-304a83702a17-loader.js';
