# Regras de arquitetura

- Separe ativação (`invitations`) de visitas recorrentes (`guest_participations`), pois uma nova participação nunca deve criar conta, presença, pontos ou promoção automaticamente.
- Consolide métricas de presença no CRM por encontro entre `attendances` e `meeting_lead_attendances`, pois a ativação pode ligar as duas fontes à mesma identidade.
- Modele cada nova ausência ou desativação como ciclo independente em `rescue_dispatches.cycle_started_at`, preservando todos os disparos históricos.
- Assinante da Comunidade deve ser implementado exclusivamente em etapa separada, nunca junto às correções.
- Indicadores consolidados usam `get_statistics_snapshot` e funções de `src/lib/statistics.ts`; não reintroduza somas de consultas truncadas ou dependentes de RLS do leitor.
- Universo operacional: perfis ativos Membro/Facilitador sem Admin; ranking competitivo mantém sua exclusão própria de Facilitadores.
