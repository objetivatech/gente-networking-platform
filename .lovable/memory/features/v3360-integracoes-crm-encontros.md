---
name: v3.36.0 Integrações, CRM x Encontros HUB e convites
description: Chaves de API no cofre do banco via Configurações, vínculo lead↔encontro Gente HUB e dropdown de tipo de convite
type: feature
---

- Chaves de API cadastradas em Configurações → Integrações; gravadas cifradas no
  cofre do banco (Vault). Resolução em edge functions: cofre primeiro, variável
  de ambiente como fallback (`supabase/functions/_shared/secrets.ts`).
- `meeting_lead_attendances` (unique meeting_id+lead_id) liga lead do CRM a
  encontro sem exigir conta. UI no `LeadDrawer`; leads aparecem em Encontros.
- `submit-lead` vincula leads `lp_gentehub` ao próximo encontro `hub_event`
  aberto e retorna `hub_meeting_id`.
- Fonte única de encontros HUB abertos: `src/hooks/useHubMeetings.ts` (usada por
  CRM e Convites).
- Modal de Convites: tipo de convite virou dropdown (era Tabs).
