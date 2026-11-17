// @vitest-environment jsdom
/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ContextualGuide } from '../ContextualGuide';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { getProfileCompleteness } from '@/lib/profile-completeness';
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });
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
it.each(['assinante', 'convidado', 'membro', 'facilitador', 'admin'] as const)('perfil pendente precede guia para %s e permite adiamento', async role => {
  render(<MemoryRouter><TooltipProvider><ContextualGuide userId="profile-test" role={role} pathname="/" blocked={false} profileComplete={false} profile={{ full_name: 'Pessoa Teste' }} menuOpen={false} onOpenChange={vi.fn()} /></TooltipProvider></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Lembrar mais tarde' })).toBeTruthy());
  expect(localStorage.getItem(`gente-guide-v1:profile-test:${role}:/`)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Lembrar mais tarde' }));
  await waitFor(() => expect(localStorage.getItem(`gente-guide-v1:profile-test:${role}:/`)).toBe('seen'), { timeout: 1800 });
  expect(sessionStorage.getItem('gente-profile-prompt-v1:profile-test')).toBeNull();
});

const completeProfile = { avatar_url: '/foto.jpg', full_name: 'Pessoa Teste', company: 'Empresa', position: 'Diretor', business_segment: 'Consultoria', bio: 'Apresentação', what_i_do: 'Consultoria', ideal_client: 'Empresas', how_to_refer_me: 'Indicações', doors_open: ['decisor'], doors_seek: ['setor'], doors_notes: 'Acesso a empresas' };
const incompleteProfile = { ...completeProfile, doors_notes: '' };
const changed = vi.fn();
function NavigationHarness({ profile = incompleteProfile }: { profile?: Record<string, any> }) {
  const location = useLocation();
  const navigate = useNavigate();
  return <TooltipProvider>
    <button onClick={() => navigate('/encontros')}>Abrir encontros</button>
    <button onClick={() => navigate('/vitrine')}>Abrir vitrine</button>
    <button onClick={() => navigate(-1)}>Voltar página</button>
    <ContextualGuide key={`navigation-test:assinante:${location.key}`} userId="navigation-test" role="assinante" pathname={location.pathname} blocked={false} profileComplete={getProfileCompleteness(profile).isComplete} profile={profile} menuOpen={false} onOpenChange={changed} />
  </TooltipProvider>;
}
function markGuidesSeen() {
  for (const path of ['/encontros', '/vitrine', '/perfil']) localStorage.setItem(`gente-guide-v1:navigation-test:assinante:${path}`, 'seen');
}
async function expectProfilePrompt() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Lembrar mais tarde' })).toBeTruthy());
}
it('volta na próxima página e ao retornar à mesma página sem memorizar dispensa', async () => {
  markGuidesSeen();
  render(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness /></MemoryRouter>);
  await expectProfilePrompt();
  fireEvent.click(screen.getByRole('button', { name: 'Lembrar mais tarde' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Abrir vitrine' }));
  await expectProfilePrompt();
  fireEvent.click(screen.getByRole('button', { name: 'Lembrar mais tarde' }));
  fireEvent.click(screen.getByRole('button', { name: 'Voltar página' }));
  await expectProfilePrompt();
});
it('nova abertura da mesma URL reabre após fechar pelo X', async () => {
  markGuidesSeen();
  render(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness /></MemoryRouter>);
  await expectProfilePrompt();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Abrir encontros' }));
  await expectProfilePrompt();
});
it('recarregamento ignora dispensas antigas salvas na sessão', async () => {
  markGuidesSeen();
  sessionStorage.setItem('gente-profile-prompt-v1:navigation-test', 'doors_notes');
  const first = render(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness /></MemoryRouter>);
  await expectProfilePrompt();
  fireEvent.click(screen.getByRole('button', { name: 'Lembrar mais tarde' }));
  first.unmount();
  render(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness /></MemoryRouter>);
  await expectProfilePrompt();
});
it('completar os 12 campos encerra o aviso e remover um campo o reabre', async () => {
  markGuidesSeen();
  const view = render(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness /></MemoryRouter>);
  await expectProfilePrompt();
  fireEvent.click(screen.getByRole('button', { name: 'Lembrar mais tarde' }));
  view.rerender(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness profile={completeProfile} /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Abrir vitrine' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  view.rerender(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness profile={incompleteProfile} /></MemoryRouter>);
  await expectProfilePrompt();
});
it('completar perfil agora abre edição sem aviso e volta a cobrar ao sair', async () => {
  markGuidesSeen();
  render(<MemoryRouter initialEntries={['/encontros']}><NavigationHarness /></MemoryRouter>);
  await expectProfilePrompt();
  fireEvent.click(screen.getByRole('link', { name: 'Completar perfil agora' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: 'Abrir encontros' }));
  await expectProfilePrompt();
});
it('vídeo obrigatório impede perfil e guia até ser concluído', async () => {
  const props = { userId: 'video-profile', role: 'assinante' as const, pathname: '/encontros', profile: incompleteProfile, profileComplete: false, menuOpen: false, onOpenChange: changed };
  const view = render(<MemoryRouter><TooltipProvider><ContextualGuide {...props} blocked /></TooltipProvider></MemoryRouter>);
  expect(screen.queryByRole('dialog')).toBeNull();
  view.rerender(<MemoryRouter><TooltipProvider><ContextualGuide {...props} blocked={false} /></TooltipProvider></MemoryRouter>);
  await expectProfilePrompt();
});