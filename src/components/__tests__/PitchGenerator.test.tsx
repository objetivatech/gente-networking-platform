/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PitchGenerator } from '../PitchGenerator';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useConnectionDoors', () => ({ useConnectionTaxonomies: () => ({ data: [{ id:'ceo', label:'CEOs', type:'decisor', is_active:true, sort_order:1 }] }) }));
const profile = { id:'p', ai_pitch:'Pitch salvo', what_i_do:'Consultoria', doors_open:['ceo'] };
beforeEach(() => { cleanup(); vi.clearAllMocks(); });
describe('pitch persistente', () => {
  it('abre o pitch salvo e alteração do perfil não regenera nem substitui', () => {
    const onSave = vi.fn();
    const { rerender } = render(<PitchGenerator profile={profile} onSave={onSave} />);
    rerender(<PitchGenerator profile={{ ...profile, what_i_do:'Outro serviço' }} onSave={onSave} />);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Pitch salvo');
    expect(invoke).not.toHaveBeenCalled(); expect(onSave).not.toHaveBeenCalled();
  });
  it('geração explícita envia portas e salva novo texto', async () => {
    invoke.mockResolvedValue({ data:{ pitch:'Novo pitch' }, error:null }); const onSave = vi.fn().mockResolvedValue({});
    render(<PitchGenerator profile={profile} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name:'Gerar Novo Pitch' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Novo pitch'));
    expect(invoke).toHaveBeenCalledWith('generate-pitch', expect.objectContaining({ body: { profile: expect.objectContaining({ doors_open:['CEOs'] }) } }));
  });
  it('edição manual só persiste ao salvar', async () => {
    const onSave = vi.fn().mockResolvedValue({}); render(<PitchGenerator profile={profile} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox'), { target:{ value:'Texto revisado' } }); expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name:'Salvar alterações' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Texto revisado')); expect(invoke).not.toHaveBeenCalled();
  });
  it('falha na geração não apaga texto salvo', async () => {
    invoke.mockResolvedValue({ data:{ error:'Serviço indisponível' }, error:null }); const onSave = vi.fn();
    render(<PitchGenerator profile={profile} onSave={onSave} />); fireEvent.click(screen.getByRole('button', { name:'Gerar Novo Pitch' }));
    await waitFor(() => expect(screen.getByRole('button', { name:'Gerar Novo Pitch' }).hasAttribute('disabled')).toBe(false));
    expect(onSave).not.toHaveBeenCalled(); expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Pitch salvo');
  });
});