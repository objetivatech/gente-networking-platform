import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useMeetingRequests', () => ({ useMeetingRequests: () => ({
 createRequest: { isPending: false, mutate: (input: any, options: any) => options.onSuccess({ request: { id: 'r', proposed_start: input.proposed_start, duration_minutes: 60, location: input.location }, recipientName: 'Destinatário', requesterName: 'Convidador', recipientPhone: '51999999999' }) },
 registerWhatsAppOpen: { mutate: vi.fn() },
}) }));
import { ScheduleMeetingDialog } from '../ScheduleMeetingDialog';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('WhatsApp scheduling confirmation', () => {
 it('opens WhatsApp with the edited message and contains responsive sizing', () => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  render(<ScheduleMeetingDialog recipientId="p" memberName="Destinatário" />);
  fireEvent.click(screen.getByRole('button', { name: 'Agendar Gente em Ação' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitação' }));
  const textarea = screen.getByLabelText('Mensagem sugerida') as HTMLTextAreaElement;
  expect(textarea.readOnly).toBe(false);
  expect(textarea.value).toContain('https://comunidade.gentenetworking.com.br/perfil?tab=agendamentos');
  fireEvent.change(textarea, { target: { value: 'Convite personalizado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir WhatsApp e enviar' }));
  expect(open).toHaveBeenCalledWith('https://wa.me/5551999999999?text=Convite%20personalizado', '_blank', 'noopener,noreferrer');
  expect(screen.getByRole('dialog').className).toContain('max-h-[90dvh]');
 });
});
