import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import GenteEmAcao from "./pages/GenteEmAcao";
import Depoimentos from "./pages/Depoimentos";
import Negocios from "./pages/Negocios";
import Indicacoes from "./pages/Indicacoes";
import Equipes from "./pages/Equipes";
import Encontros from "./pages/Encontros";
import Estatisticas from "./pages/Estatisticas";
import Admin from "./pages/Admin";
import Conteudos from "./pages/Conteudos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/estatisticas" element={<Estatisticas />} />
              <Route path="/gente-em-acao" element={<GenteEmAcao />} />
              <Route path="/depoimentos" element={<Depoimentos />} />
              <Route path="/negocios" element={<Negocios />} />
              <Route path="/indicacoes" element={<Indicacoes />} />
              <Route path="/equipes" element={<Equipes />} />
              <Route path="/encontros" element={<Encontros />} />
              <Route path="/conteudos" element={<Conteudos />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
