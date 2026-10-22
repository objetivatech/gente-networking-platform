/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { FileText, Image, History, Sparkles, ArrowUpRight } from 'lucide-react';
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAdmin();
  const { pathname } = useLocation();
  if (isLoading) return <div role="status">Carregando…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <div className="min-w-0 space-y-6">
    <nav aria-label="Gestão de páginas" className="flex flex-wrap gap-2 border-b pb-4">
      {[[FileText, 'Páginas', '/admin/lps'], [Sparkles, 'LPs avançadas', '/admin/lps/avancadas'], [Image, 'Mídia', '/admin/lps/midia'], [History, 'Auditoria', '/admin/lps/auditoria']] .map(([Icon, label, path]) => {
        const Symbol = Icon as typeof FileText;
        return <Button key={String(path)} variant={pathname === path ? 'default' : 'outline'} size="sm" asChild><Link to={String(path)}><Symbol className="mr-2 h-4 w-4" />{String(label)}</Link></Button>;
      })}
      <Button variant="ghost" size="sm" asChild><a href="/auth" target="_blank" rel="noreferrer"><ArrowUpRight className="mr-2 h-4 w-4" />Entrada da plataforma</a></Button>
    </nav>
    {children}
  </div>;
}