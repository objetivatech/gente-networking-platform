/**
 * App - Main Application Component
 * 
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 * 
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const Profile = lazy(() => import("./pages/Profile"));
const GenteEmAcao = lazy(() => import("./pages/GenteEmAcao"));
const Depoimentos = lazy(() => import("./pages/Depoimentos"));
const Negocios = lazy(() => import("./pages/Negocios"));
const Indicacoes = lazy(() => import("./pages/Indicacoes"));
const Equipes = lazy(() => import("./pages/Equipes"));
const Encontros = lazy(() => import("./pages/Encontros"));
const Estatisticas = lazy(() => import("./pages/Estatisticas"));
const Admin = lazy(() => import("./pages/Admin"));
const Conteudos = lazy(() => import("./pages/Conteudos"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Convites = lazy(() => import("./pages/Convites"));
const ConvitePublico = lazy(() => import("./pages/ConvitePublico"));
const CadastroConvidado = lazy(() => import("./pages/CadastroConvidado"));
const Documentacao = lazy(() => import("./pages/Documentacao"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Instalar = lazy(() => import("./pages/Instalar"));
const Membros = lazy(() => import("./pages/Membros"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const Aniversarios = lazy(() => import("./pages/Aniversarios"));
const GerenciarMembros = lazy(() => import("./pages/GerenciarMembros"));
const GestaoConvidados = lazy(() => import("./pages/GestaoConvidados"));
const GestaoPessoas = lazy(() => import("./pages/GestaoPessoas"));
const Changelog = lazy(() => import("./pages/Changelog"));
const AdminRegistros = lazy(() => import("./pages/AdminRegistros"));
const Feed = lazy(() => import("./pages/Feed"));
const Conselho = lazy(() => import("./pages/Conselho"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min default
      gcTime: 10 * 60 * 1000,   // 10 min gc
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route path="/convite/:code" element={<ErrorBoundary fallbackMessage="Erro ao carregar o convite. Tente recarregar a página."><ConvitePublico /></ErrorBoundary>} />
              <Route path="/convite/:code/cadastrar" element={<ErrorBoundary fallbackMessage="Erro ao carregar o cadastro. Tente recarregar a página."><CadastroConvidado /></ErrorBoundary>} />
              <Route path="/instalar" element={<Instalar />} />
              <Route path="/auth/confirm" element={<ErrorBoundary fallbackMessage="Erro ao confirmar email. Tente recarregar a página."><AuthConfirm /></ErrorBoundary>} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/membros" element={<Membros />} />
                <Route path="/membro/:slug" element={<MemberProfile />} />
                <Route path="/aniversarios" element={<Aniversarios />} />
                <Route path="/estatisticas" element={<Estatisticas />} />
                <Route path="/gente-em-acao" element={<GenteEmAcao />} />
                <Route path="/depoimentos" element={<Depoimentos />} />
                <Route path="/negocios" element={<Negocios />} />
                <Route path="/indicacoes" element={<Indicacoes />} />
                <Route path="/equipes" element={<Membros />} />
                <Route path="/encontros" element={<Encontros />} />
                <Route path="/conteudos" element={<Conteudos />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/convites" element={<Convites />} />
                <Route path="/conselho" element={<Conselho />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/documentacao" element={<Documentacao />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/pessoas" element={<GestaoPessoas />} />
                <Route path="/admin/registros" element={<AdminRegistros />} />
                {/* Rotas antigas mantidas para compatibilidade */}
                <Route path="/admin/membros" element={<GerenciarMembros />} />
                <Route path="/admin/convidados" element={<GestaoConvidados />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
