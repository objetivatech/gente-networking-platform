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
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from '@/components/ErrorBoundary';

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fallbackMessage="Ocorreu um erro inesperado ao carregar o aplicativo. Por favor, recarregue a página.">
    <App />
  </ErrorBoundary>
);
