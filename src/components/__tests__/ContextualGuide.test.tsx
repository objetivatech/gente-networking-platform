// @vitest-environment jsdom
/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ContextualGuide } from '../ContextualGuide';
afterEach(() => { cleanup(); localStorage.clear(); });
it('guia manual permanece disponível com perfil incompleto e permite concluir/reabrir', async () => {
  const changed = vi.fn();
  render(<TooltipProvider><ContextualGuide userId="guide-test" role="assinante" pathname="/encontros" blocked={false} profileComplete={false} menuOpen={false} onOpenChange={changed} /></TooltipProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Guia desta página' }));
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(localStorage.getItem('gente-guide-v1:guide-test:assinante:/encontros')).toBe('seen');
  fireEvent.click(screen.getByRole('button', { name: 'Guia desta página' }));
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
});
it('vídeo bloqueante desabilita guia manual', () => {
  render(<TooltipProvider><ContextualGuide userId="guide-test" role="assinante" pathname="/" blocked profileComplete menuOpen={false} onOpenChange={vi.fn()} /></TooltipProvider>);
  expect((screen.getByRole('button', { name: 'Guia desta página' }) as HTMLButtonElement).disabled).toBe(true);
});
it('outro diálogo fecha o guia sem sobreposição', async () => {
  render(<TooltipProvider><ContextualGuide userId="guide-test" role="membro" pathname="/perfil" blocked={false} profileComplete={false} menuOpen={false} onOpenChange={vi.fn()} /></TooltipProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Guia desta página' }));
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  const other = document.createElement('div');
  other.setAttribute('role', 'dialog');
  other.getClientRects = () => [{ width: 100, height: 100 }] as unknown as DOMRectList;
  document.body.append(other);
  await waitFor(() => expect(document.querySelector('[data-contextual-guide]')).toBeNull());
  other.remove();
});
it('perfil completo inicia automaticamente e grava visita por página', async () => {
  render(<TooltipProvider><ContextualGuide userId="guide-test" role="membro" pathname="/perfil" blocked={false} profileComplete menuOpen={false} onOpenChange={vi.fn()} /></TooltipProvider>);
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy(), { timeout: 1500 });
  expect(localStorage.getItem('gente-guide-v1:guide-test:membro:/perfil')).toBe('seen');
});