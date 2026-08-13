---
name: Integração automática LPs → CRM (v3.34.0)
description: submit-lead com parser de colchetes (Elementor), resolução de grupo por nome, auto-descoberta de páginas (crm_lead_pages) e regra sem_grupo vs hub_triage
type: feature
---
- `submit-lead` interpreta chaves com colchetes (`fields[x][value]`, `form_fields[x]`, `meta[page_url][value]`). Isso corrigiu o "Webhook error" do Elementor.
- Grupo resolvido por **nome** (`target_team_name`, aliases `grupo`/`group`/`primeira_opcao`) com normalização sem acento e match parcial; `target_team_id` tem prioridade.
- Sem grupo: só vira HUB quando `source = lp_gentehub` (`group_resolution: hub_triage`); demais ficam `sem_grupo` — nunca classificar leads sem grupo como HUB.
- Tabela `crm_lead_pages` + RPC `register_crm_lead_page` registram LPs automaticamente por `page_url`; painel/filtro "Páginas de captação" em `/admin/crm` (hook `useCrmLeadPages`).
- `list-public-teams` devolve `{id, name, slug, is_hub}` para as LPs montarem selects sem UUID.
