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

import { Suspense } from 'react';
import { lazyWithRetry } from '@/lib/lazy-retry';
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
import Index from './pages/Index';

// Lazy-loaded pages
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const RedefinirSenha = lazyWithRetry(() => import("./pages/RedefinirSenha"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const GenteEmAcao = lazyWithRetry(() => import("./pages/GenteEmAcao"));
const Depoimentos = lazyWithRetry(() => import("./pages/Depoimentos"));
const Negocios = lazyWithRetry(() => import("./pages/Negocios"));
const Indicacoes = lazyWithRetry(() => import("./pages/Indicacoes"));
const Equipes = lazyWithRetry(() => import("./pages/Equipes"));
const Encontros = lazyWithRetry(() => import("./pages/Encontros"));
const Estatisticas = lazyWithRetry(() => import("./pages/Estatisticas"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const Conteudos = lazyWithRetry(() => import("./pages/Conteudos"));
const Ranking = lazyWithRetry(() => import("./pages/Ranking"));
const Convites = lazyWithRetry(() => import("./pages/Convites"));
const ConvitePublico = lazyWithRetry(() => import("./pages/ConvitePublico"));
const CadastroConvidado = lazyWithRetry(() => import("./pages/CadastroConvidado"));
const Documentacao = lazyWithRetry(() => import("./pages/Documentacao"));
const Configuracoes = lazyWithRetry(() => import("./pages/Configuracoes"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const Instalar = lazyWithRetry(() => import("./pages/Instalar"));
const Membros = lazyWithRetry(() => import("./pages/Membros"));
const MemberProfile = lazyWithRetry(() => import("./pages/MemberProfile"));
const Aniversarios = lazyWithRetry(() => import("./pages/Aniversarios"));
const GerenciarMembros = lazyWithRetry(() => import("./pages/GerenciarMembros"));
const GestaoConvidados = lazyWithRetry(() => import("./pages/GestaoConvidados"));
const GestaoPessoas = lazyWithRetry(() => import("./pages/GestaoPessoas"));
const Changelog = lazyWithRetry(() => import("./pages/Changelog"));
const AdminRegistros = lazyWithRetry(() => import("./pages/AdminRegistros"));
const Feed = lazyWithRetry(() => import("./pages/Feed"));
const Conselho = lazyWithRetry(() => import("./pages/Conselho"));
const AuthConfirm = lazyWithRetry(() => import("./pages/AuthConfirm"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

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
