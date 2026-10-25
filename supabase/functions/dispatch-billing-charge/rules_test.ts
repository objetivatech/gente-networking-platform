/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { canDispatchCharge, reuseCharge } from '../_shared/billing-dispatch-rules.ts';
Deno.test('Cobrança paga não pode ser duplicada', () => assertEquals(reuseCharge('paid', true), 'paid'));
Deno.test('Plano inativo não emite cobrança', () => assertEquals(canDispatchCharge('active', false), false));
Deno.test('Cobrança em aberto requer reenvio explícito', () => assertEquals(reuseCharge('sent', false), 'open'));