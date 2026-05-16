---
name: Move Guest Attendance Between Meetings
description: v3.8.0 — Admin/Facilitador podem mover a presença de um convidado para outro encontro futuro do MESMO grupo via RPC `move_guest_attendance`. UI exposta na aba "Convidados em Encontros" (`/encontros`). Convidado mantém visibilidade restrita ao grupo.
type: feature
---

**Quem pode:** admin (qualquer grupo) | facilitador (apenas seu grupo).

**Regras:** destino precisa ser hoje/futuro, mesmo grupo da origem, alvo precisa ter role `convidado`. Presença é transferida atomicamente (DELETE origem + INSERT destino com ON CONFLICT DO NOTHING). Triggers existentes recalculam pontos do mês.

**Hook:** `useMoveGuestAttendance` invalida `meetings`, `meeting-attendees`, `meeting-guests`, `guests-attendance-history`, `my-attendances`, `guest-meetings`.

**UI:** botão `Mover` (ArrowRightLeft) no card de convidado em `UpcomingGuestsTab` (Encontros.tsx), abre Dialog com Select dos encontros futuros do mesmo grupo.
