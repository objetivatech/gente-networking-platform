/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { describe, expect, it } from 'vitest';
import { validatePublicProfileInvite } from '../../../supabase/functions/_shared/public-profile-invite';
const input = { profile_slug: 'membro-exemplo', target_team_id: '11111111-1111-4111-8111-111111111111', name: 'Pessoa Teste', email: 'teste@example.com', phone: '(51) 99999-9999', consent: true };
describe('Convite pelo perfil público', () => {
  it('aceita os dados de identidade e consentimento válidos', () => expect(validatePublicProfileInvite(input)).toBeNull());
  it('exige consentimento explícito', () => expect(validatePublicProfileInvite({ ...input, consent: false })).toBe('consent_required'));
  it('exige grupo escolhido', () => expect(validatePublicProfileInvite({ ...input, target_team_id: '' })).toBe('group_required'));
  it('recusa e-mail sem domínio completo', () => expect(validatePublicProfileInvite({ ...input, email: 'teste@dominio' })).toBe('invalid_email'));
  it('recusa telefone sem DDD', () => expect(validatePublicProfileInvite({ ...input, phone: '999999999' })).toBe('invalid_phone'));
  it('não permite URL no identificador de perfil', () => expect(validatePublicProfileInvite({ ...input, profile_slug: 'https://outro.example' })).toBe('profile_unavailable'));
});