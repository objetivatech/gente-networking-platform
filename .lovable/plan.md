# Conexão LPs → CRM: automática, sem mapeamento manual

## 1. Conferência das configurações Cloudflare (prints)

**lps-gente-networking** — OK:
- `VITE_COMUNIDADE_ANON_KEY` e `VITE_COMUNIDADE_SUBMIT_LEAD_URL` (aponta para `vyfkddcbmwlwldaorxzy.functions.supabase.co/submit-lead`) presentes em Produção.
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` apontam para o Supabase **das LPs** (`kcnoqgnrwdjphjzqjnle`) — correto, são bancos diferentes.
- Pendência: as variáveis só entram no bundle **após um novo deploy de produção**. Também é preciso replicá-las no ambiente **Preview** se quiser testar em preview.

**gente-networking-platform** — OK, nada a mudar (aponta para o Supabase da Comunidade).

## 2. Erro no formulário do site (Elementor) — causa confirmada

Os logs do `submit-lead` mostram o payload chegando com chaves quebradas: `"name][value"`, `"form[id"`, `"meta[date][value"`. O Elementor envia `fields[name][value]`, e o normalizador atual só remove o prefixo `form_fields[` e um `]` final, produzindo chaves inválidas. Resultado: `name` e `email` ficam ausentes → `400 invalid_payload` → "Webhook error" na tela.

Correção: reescrever o parser de `form-data`/`urlencoded` para interpretar corretamente chaves com colchetes (`fields[<id>][value]` → `<id>`), ignorando `meta[...]` e `form[...]`, e usando `value`/`raw_value`.

## 3. Conexão automática LP → CRM (fim do mapeamento por UUID)

Hoje é preciso colar o UUID do grupo no gerenciador de LPs. Proposta: a LP passa a mandar **texto** e o CRM resolve sozinho.

- **Resolução de grupo por nome**: `submit-lead` passa a aceitar `target_team_name` (ou o próprio texto da opção escolhida no formulário, ex.: "GeNtE Master – Terça-Feira") e resolve o `team_id` por comparação normalizada (sem acentos/caixa/pontuação, match parcial). Se não achar, o lead entra como triagem HUB — nunca falha.
- **Auto-descoberta de LPs**: nova tabela `crm_lead_pages` (chave = URL/slug da página). No primeiro lead recebido, a página é registrada automaticamente com nome, origem, primeira e última captação e contador. Nenhum cadastro manual.
- **Filtro dinâmico no CRM**: o filtro de origem em `/admin/crm` deixa de ser lista fixa e passa a listar as páginas descobertas (`crm_lead_pages`), com uma aba/painel "Páginas de captação" mostrando volume por LP.
- **Endpoint de catálogo**: `list-public-teams` passa a devolver `id`, `name`, `slug` e `is_hub`, para as LPs montarem o select de grupos automaticamente (sem hardcode e sem UUID digitado).

Com isso, uma LP nova só precisa chamar o `submit-lead` com `source` + `page_url`; ela aparece no CRM sozinha.

## 4. Documentação e changelog

- Atualizar `docs/INTEGRACAO_LPS_GENTE.md`, `docs/INTEGRACAO_WORDPRESS.md` e `docs/CRM_INGESTAO_LEADS.md` com o novo contrato (nome do grupo em vez de UUID, `page_url`, auto-descoberta).
- Registrar **v3.34.0** em `system_changelog`.

## Detalhes técnicos

- Migração: `crm_lead_pages` (id, page_key único, page_url, title, source, first_seen_at, last_seen_at, leads_count) + GRANTs (`select` para authenticated, `all` para service_role) + RLS restrita a admin; escrita apenas via service role no `submit-lead`.
- `submit-lead`: novo parser de brackets; aliases `page_url`, `target_team_name`, `group`, `grupo`, `primeira_opcao`; função `resolveTeamByName` com `unaccent`-like em JS; upsert em `crm_lead_pages`.
- Frontend: `useCrmLeads`/`AdminCrm` consomem as páginas descobertas para o filtro; nenhuma mudança nas mecânicas de promoção, contrato, cobrança ou gamificação.

## Ação manual sua

1. Redeploy de produção do projeto LPs no Cloudflare Pages (para as envs entrarem no bundle).
2. No projeto LPs, remover a obrigatoriedade do UUID no gerenciador (passará a enviar o nome do grupo) — faço isso lá depois que este lado estiver publicado.
