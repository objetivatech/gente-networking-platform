/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { z } from 'npm:zod@3.25.76';
export const GuestMeetingRequest = z.discriminatedUnion('action', [
  z.object({ action: z.literal('agenda') }),
  z.object({ action: z.literal('invitations'), meeting_id: z.string().uuid() }),
  z.object({ action: z.literal('confirm'), meeting_id: z.string().uuid(), confirm: z.boolean() }),
  z.object({ action: z.literal('invite'), meeting_id: z.string().uuid(), name: z.string().trim().min(2).max(255), email: z.string().email().max(255), phone: z.string().max(40).optional(), company: z.string().max(255).optional() }),
]);