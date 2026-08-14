# v3.35.0 — CRM à prova de sincronização, colunas configuráveis e central de integrações

## Diagnóstico (confirmado no banco)

Os contatos **não foram apagados**. Eles foram **sobrescritos**.

Consultando `crm_leads`, hoje existem 112 leads e **todos** estão com `source = convite_manual`. Os campos `updated_at` de praticamente todos ficaram entre **14/08 12:23 e 12:24**, e `crm_lead_history` só tem eventos `status_change` desse mesmo horário.

Causa: a função `migrate-existing-guests` (botão de backfill no CRM) varre todos os convites e, quando encontra um lead com o mesmo e-mail, faz `UPDATE` gravando `source: 'convite_manual'`, `source_detail: 'invitation:<id>'` e **reescrevendo o status**. Foi isso que apagou as tags "LP Participe" e "Site" — inclusive do lead de teste do Gente HUB de hoje (o registro dele continua lá, com `metadata.landing_page = "hub | location=pais | referral=outro"`, mas marcado como convite manual).

Boa notícia: a origem real ainda é recuperável. O `metadata.landing_page` / `metadata.page_url` dos leads e o `metadata.source` gravado no convite pela `submit-lead` sobreviveram.

## 1. Recuperar as origens perdidas

Script de restauração (executado uma vez, em transação): para cada lead cujo convite tenha `metadata.source` de LP/site, ou cujo `metadata.page_url`/`landing_page` aponte para uma LP conhecida, devolver `source` e `source_detail` originais e registrar o evento `source_restored` em `crm_lead_history`. Leads realmente vindos de convite da plataforma ficam como estão.

## 2. Sincronização unilateral e não destrutiva (a regra principal)

- `migrate-existing-guests` deixa de sobrescrever leads existentes: passa a preencher **apenas campos vazios** (`invitation_id`, `profile_id`, `target_team_id` nulos) e **nunca** toca em `source`, `source_detail`, `status`, `notes` ou `metadata` de lead já existente. Vira um backfill puramente aditivo.
- `submit-lead` idem: em lead já existente, só sobrescreve dados de contato quando o valor novo não é vazio, preserva o `metadata` anterior (merge, não replace) e nunca rebaixa o status.
- Trava no banco: trigger `crm_leads_protect_source` que bloqueia mudança de `source` de uma origem de captação (LP/site) para `convite_manual`, e RLS/GRANT sem `DELETE` para qualquer papel que não seja admin — exclusão de lead passa a ser explícita (soft delete com `archived_at`), nunca efeito colateral de sincronização.
- O botão de backfill no `/admin/crm` ganha diálogo de confirmação explicando que a operação é somente aditiva.

## 3. Card "Páginas de captação" padronizado

Todos os itens passam a ter o mesmo formato do "Quero Participar": título legível + linha de apoio.
- Título: nome amigável da página (do `page_title` limpo ou derivado do `page_url`), sem a string bruta `hub | location=pais | referral=outro`.
- Os parâmetros de rastreio saem do título e viram badges secundários (ou tooltip).
- Cada card exibe badge da origem com a mesma cor usada no Kanban, contagem de leads e data do último lead.
- Normalização também na entrada (`register_crm_lead_page`), para páginas novas já chegarem limpas.

## 4. Colunas do CRM editáveis

Nova tabela `crm_pipeline_stages` (`key`, `label`, `color`, `position`, `is_default`, `is_system`, `notify_on_enter`, `notify_template`, `active`).
- Seed com as 6 colunas atuais (`novo`, `em_qualificacao`, `qualificado`, `hub_ativo`, `fechado`, `perdido`) marcadas como `is_system` — podem ser renomeadas/reordenadas/recoloridas, mas não excluídas, porque triggers e RPCs dependem delas.
- Colunas novas criadas pelo admin ficam livres para editar e arquivar (arquivar exige mover os leads antes).
- `crm_leads.status` continua sendo o enum atual; colunas customizadas usam uma coluna nova `stage_key` com fallback para o status legado, para não quebrar `promote_crm_lead_to_member`, os triggers de attendance/role e o Kanban existente.
- UI: `/admin/crm/colunas` (ou diálogo "Gerenciar colunas" no topo do Kanban) com drag para ordenar, editar rótulo/cor e alternar notificação.

## 5. Notificações de troca de coluna

Hoje **não existe** notificação em mudança de status — o histórico é gravado, mas nada é disparado. Será criada:
- Trigger de mudança de estágio → grava evento e enfileira notificação quando `notify_on_enter` estiver ativo na coluna de destino.
- Edge function `notify-lead-stage` envia e-mail ao admin/facilitador do grupo, usando o provedor configurado (item 6) e respeitando o limite de disparos.
- Configurável por coluna, para que colunas novas nasçam já integradas ao mecanismo.

## 6. Central de integrações nas configurações

Nova aba **Integrações** em `/configuracoes` (admin-only), com três blocos:

| Bloco | Provedores | Campos |
|---|---|---|
| Pagamentos | EFI, Mercado Pago, Asaas, Infinity Pay | provedor ativo, chave/token, ambiente (sandbox/produção), webhook URL exibida para copiar |
| Assinatura digital | Autentique, DocuSign, Clicksign | provedor ativo, token, webhook URL, template padrão |
| E-mail | Resend, Brevo, Sender, SMTP | provedor ativo, chave, remetente (nome/e-mail), limite de disparos (X envios a cada Y dias/horas) |

Arquitetura:
- Tabela `integration_settings` guarda **apenas** provedor ativo, ambiente, remetente, limites e status da última verificação. **Nenhuma chave de API é gravada no banco.**
- As chaves continuam no cofre de secrets do Supabase; o formulário aciona o fluxo seguro de secret com nome padronizado por provedor (`RESEND_API_KEY`, `ASAAS_API_KEY`, etc.), e a tela mostra só "configurado / não configurado" + botão testar conexão.
- Camada de abstração `email-provider.ts` nas edge functions: os templates atuais permanecem intactos e só o transporte muda conforme o provedor ativo — trocar Resend por Brevo passa a ser uma seleção na tela.
- Mesma abstração para pagamento e assinatura, mantendo Autentique e Efi como implementações já existentes.
- Limite de disparos aplicado por uma tabela de log de envio consultada antes de cada disparo.

## 7. Documentação e changelog

- `docs/CRM_LEADS.md` e `docs/CRM_INGESTAO_LEADS.md`: regra de sincronização unilateral, colunas configuráveis, notificações.
- Novo `docs/INTEGRACOES.md`: como plugar cada provedor e onde ficam as chaves.
- Registro da versão **v3.35.0** em `system_changelog` e memória do projeto atualizada.

## Ordem de execução

1. Restaurar origens (item 1) — primeiro, antes de qualquer novo backfill.
2. Blindar sincronização (item 2).
3. Card de páginas (item 3).
4. Colunas configuráveis + notificações (itens 4 e 5).
5. Central de integrações (item 6).
6. Docs e changelog (item 7).
