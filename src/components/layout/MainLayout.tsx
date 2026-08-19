/**
 * MainLayout Component
 * 
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 * 
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import { Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Scroll to top on route change
  useScrollToTop();

  // v3.43.0: contas desativadas perdem o acesso à plataforma.
  const { data: accountActive, isLoading: loadingAccount } = useQuery({
    queryKey: ['account-active', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) return true; // falha de rede não deve derrubar o usuário
      return data?.is_active !== false;
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Visitante acessando o perfil interno de um membro (/membro/:slug):
    // redireciona para a página pública equivalente (/m/:slug) em vez do login.
    const memberMatch = location.pathname.match(/^\/membro\/([^/]+)\/?$/);
    if (memberMatch) {
      return <Navigate to={`/m/${memberMatch[1]}`} replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  if (loadingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accountActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 rounded-xl border bg-card p-8">
          <ShieldOff className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Acesso desativado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta no Gente Comunidade está desativada. Seu histórico foi preservado —
            fale com a organização para reativar sua participação.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <a href="https://wa.me/555121652325" target="_blank" rel="noreferrer">
                Falar com o Gente
              </a>
            </Button>
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-h-screen min-w-0 lg:ml-0">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main
            className="flex-1 min-w-0 p-4 lg:p-6"
            style={{
              paddingBottom: 'max(5rem, calc(env(safe-area-inset-bottom) + 5rem))',
            }}
          >
            <div className="w-full min-w-0 max-w-full">
              <ErrorBoundary
                resetKey={location.pathname}
                fallbackMessage="Ocorreu um erro ao carregar esta página. Tente recarregar."
              >
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
          <Footer />
        </div>
      </div>
      <BottomNav hidden={sidebarOpen} />
    </div>
  );
}
