/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { isValidLpEmail, isValidLpPhone } from './lp-form.ts';

/** Public callers identify a published slug, never an inviter ID or arbitrary destination. */
export function validatePublicProfileInvite(input: Record<string, unknown>): string | null {
  if (typeof input.profile_slug !== 'string' || !/^[a-zA-Z0-9_-]{1,150}$/.test(input.profile_slug)) return 'profile_unavailable';
  if (input.consent !== true) return 'consent_required';
  if (typeof input.target_team_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.target_team_id)) return 'group_required';
  if (typeof input.name !== 'string' || input.name.trim().length < 2 || input.name.length > 120) return 'invalid_name';
  if (typeof input.email !== 'string' || input.email.length > 200 || !isValidLpEmail(input.email)) return 'invalid_email';
  if (typeof input.phone !== 'string' || !isValidLpPhone(input.phone)) return 'invalid_phone';
  if (input.company !== undefined && (typeof input.company !== 'string' || input.company.length > 200)) return 'invalid_company';
  return null;
}