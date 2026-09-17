/**
 * Main Entry Point
 * 
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 * 
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from '@/components/ErrorBoundary';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => void registration.unregister());
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento principal não encontrado");

createRoot(rootElement).render(
  <ErrorBoundary fallbackMessage="Ocorreu um erro inesperado ao carregar o aplicativo. Por favor, recarregue a página.">
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </ErrorBoundary>
);
