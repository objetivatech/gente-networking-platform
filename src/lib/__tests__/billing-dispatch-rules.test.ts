/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { expect, it } from 'vitest';
import { canDispatchCharge, reuseCharge } from '../../../supabase/functions/_shared/billing-dispatch-rules';
it('Cobrança paga nunca é reenviada nem recriada', () => expect(reuseCharge('paid', true)).toBe('paid'));
it('Reativação não duplica cobrança em aberto', () => expect(reuseCharge('sent', false)).toBe('open'));
it('Plano inativo não pode ser cobrado', () => expect(canDispatchCharge('active', false)).toBe(false));
it('Assinatura concluída não pode ser cobrada', () => expect(canDispatchCharge('completed', true)).toBe(false));