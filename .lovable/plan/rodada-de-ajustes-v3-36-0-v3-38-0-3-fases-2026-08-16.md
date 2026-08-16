# Rodada de ajustes — v3.36.0 → v3.38.0 (3 fases)

Entrega em três versões, cada uma com documentação e entrada de changelog.

---

## Fase 1 — v3.36.0: chaves na central, CRM ↔ Encontros, convites

### 1. Chaves de API direto na Central de Integrações
Hoje a central só mostra "configurada / não configurada". Passa a permitir gravar a chave pela própria tela, sem entrar no Supabase.

- As chaves ficam **cifradas no Supabase Vault** (extensão `supabase_vault`, já ativa no projeto), nunca em coluna comum e nunca retornadas ao navegador.
- Nova RPC `set_integration_secret(_name, _value)` (security definer, só admin) grava/atualiza no Vault e registra auditoria (quem alterou e quando — sem o valor).
- Nova RPC `list_integration_secrets()` devolve apenas `nome + configurada + atualizada_em`.
- As Edge Functions passam a ler a chave assim: primeiro o Vault, e se não houver, o secret de ambiente atual (compatibilidade — nada quebra).
- Na UI: campo de senha por provedor, botão "Salvar chave", "Testar conexão" e "Remover chave"; campos extras por provedor (ex.: Client ID/Secret da EFI, remetente/SMTP host).

### 2. Lead do CRM vinculado ao encontro Gente HUB
- No drawer do lead: seletor **"Vincular ao encontro Gente HUB"**, listando só encontros com `event_type = 'hub_event'` e data futura/hoje.
- Ao vincular: cria a presença do lead no encontro, grava o evento na trilha de auditoria do lead e aparece na página Encontros junto com convidados e membros (a lógica atual de exibição continua igual, apenas ganha esses registros).
- Leads que chegam pela LP Gente HUB entram no CRM já com sugestão do encontro aberto do mês; o vínculo pode ser automático quando existir exatamente um encontro HUB aberto.
- Leads sem conta de usuário são exibidos na lista de presentes como participantes externos (não viram usuário nem pontuam), mantendo a gamificação intacta.

### 3. Convites alinhados e com melhor usabilidade
- O seletor de encontro no convite Gente HUB usa a **mesma fonte** dos encontros HUB abertos (lista única compartilhada com o CRM).
- O tipo de convite vira **dropdown** (Grupo Premium / Evento Gente HUB / Comunidade Gente no WhatsApp), com descrição curta do que cada um faz, no lugar das abas.
- Modal revisado para telas pequenas (campos empilhados, sem corte lateral).

---

## Fase 2 — v3.37.0: Planos, assinaturas e cobranças

Novo item de menu **"Planos e Cobranças"** (admin), com três abas.

### Planos
Cadastro de planos com: nome, descrição, valor, tipo (**recorrente** mensal/trimestral/anual ou **avulso**), moeda, status ativo/inativo e modelo de contrato vinculado.

### Descontos
Cupons ou descontos diretos: valor fixo ou percentual, validade, limite de uso, e aplicação a um plano específico ou a um cliente específico.

### Assinaturas e cobranças
- Vincula um plano a um cliente (lead do CRM ou membro), com desconto opcional.
- Gera cobranças (avulsas ou recorrentes), com status: pendente, enviada, paga, vencida, cancelada.
- Histórico completo de disparos e tentativas por cobrança.
- Contrato integrado: o modelo do plano é usado no envio para assinatura, e o status de assinatura aparece junto da cobrança.

### Disparo (conforme escolhido: automático + manual)
- **Automático**: ao lead entrar em uma etapa configurada do CRM, a cobrança do plano vinculado é gerada e enviada.
- **Manual**: botão de disparo sempre disponível no CRM e na tela da cobrança.
- O **botão de cobrança do CRM fica desabilitado** (com aviso explicativo) enquanto não houver plano ativo, provedor de pagamento configurado e cliente vinculado.

### E-mails
Novos templates na identidade Gente (azul-marinho/laranja, logo Gente Networking), reaproveitando o layout de e-mail atual:
cobrança gerada, lembrete de vencimento, pagamento confirmado, cobrança vencida, contrato enviado para assinatura e contrato assinado.
Todos passam pelo provedor ativo da central de integrações; os transacionais continuam fora do limite de disparos.

---

## Fase 3 — v3.38.0: edição rica, cases em 4 passos, página pública

### 4. Campos de texto com formatação
Editor rico (negrito, itálico, listas, títulos simples e links) nos campos longos de: Perfil (bio, o que faço, cliente ideal, como me indicar), Gente em Ação, Negócios, Depoimentos, Encontros, Indicações, Conselho 24/7, Oportunidades, Pedidos de Indicação e Cases.
O conteúdo é gravado como **HTML sanitizado** (sem JSON e sem markdown) e exibido formatado na plataforma, no perfil público e nos e-mails. Textos antigos em texto puro continuam funcionando normalmente.

### 5. Cases em 4 passos
Registro e exibição passam a seguir **Cliente → Problema → Solução → Sucesso**, com os quatro campos **obrigatórios** nos cases novos.
Cases existentes são migrados sem perda: a descrição atual vai para "Solução" e o resultado para "Sucesso"; os dois primeiros campos ficam sinalizados para complemento.
A exibição no perfil usa quatro colunas com ícone e título (padrão da referência enviada), empilhando em uma coluna no celular.

### 6. Página pública do membro
- Bloco **"Meus Resultados no Gente Networking"**, com os mesmos números de "Minhas Estatísticas" (presenças, Gente em Ação, depoimentos, valor em negócios, indicações), sincronizado por uma função pública segura que devolve só os totais.
- **Carrossel de cases**: dois por vez, ordem aleatória, troca a cada 5 segundos, pausa ao passar o mouse (e ao tocar no celular); um por vez em telas pequenas.

---

## Detalhes técnicos

**Banco**
- `set_integration_secret` / `list_integration_secrets` / `delete_integration_secret` (security definer, admin) sobre `vault.secrets`; tabela de auditoria sem valores.
- `plans`, `plan_discounts`, `subscriptions`, `invoices`, `invoice_events` — todas com `GRANT` + RLS (admin gerencia; membro lê a própria assinatura).
- `meeting_lead_attendances` (lead ↔ encontro HUB) com RLS para admin/facilitador; leitura para exibição de presentes.
- `business_cases`: colunas `client_context`, `problem`, `solution`, `success_result` + migração dos dados atuais.
- `get_public_profile_stats(_slug)` — totais agregados; `get_public_profile_cases(_slug)` — cases publicados.
- Trigger de cobrança automática por etapa (reaproveita `crm_pipeline_stages`).

**Edge Functions**
- `integration-status` passa a ler o Vault; nova `integration-test` para o botão "Testar conexão".
- `billing-dispatch` (gera/envia cobrança pelo provedor ativo) e `billing-webhook` (baixa de pagamento).
- `_shared/email-templates.ts` ganha os templates de cobrança/assinatura.

**Frontend**
- `RichTextEditor` + `RichText` (renderização sanitizada) reutilizados em todos os formulários listados.
- Novas páginas `PlanosCobrancas` (abas Planos / Descontos / Assinaturas) e itens de menu no grupo de gestão.
- Responsividade conforme as regras do projeto (`min-w-0`, `.text-wrap-anywhere`, sem `overflow-x:hidden` global).

**Registro**
Documentação em `docs/` (integrações, cobranças, CRM/encontros, editor rico), memórias do projeto e entradas de changelog para v3.36.0, v3.37.0 e v3.38.0.
