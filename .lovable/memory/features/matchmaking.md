---
name: MatchMaking
description: Recurso v3.11.0 — sugestões de conexão por afinidade entre perfis (membros + convidados) exclusivo para membros/facilitadores/admins. Check cria Gente em Ação e soma +10 pts via RPC create_matchmaking_check.
type: feature
---

# MatchMaking (v3.11.0)

Sugere conexões estratégicas entre os perfis da plataforma para os MEMBROS (também visível a facilitadores e admins; convidados NÃO acessam — ver `canUseMatchmaking` em `src/lib/access-control.ts`).

## Score de afinidade (calculado no cliente, `useMatchmaking.ts`)
Avalia todos os perfis ativos (membros + convidados, exceto admins e o próprio):
- +40 cliente ideal do membro cruza com o que faço/segmento/tags do outro (e vice-versa)
- +25 tags em comum (12 pts por tag, teto 25)
- +15 mesmo segmento de negócio
- +10 perfil do outro completo (what_i_do, ideal_client, business_segment, tags)
- Bônus determinístico de oportunidade via `src/lib/matchmaking-rules.ts`: parceria complementar forte (+30, +10 adicional se houver público comum), troca de base compatível (+20), indicação estratégica (+10), afinidade de segmento/tags (+5).

Texto normalizado (minúsculas, sem acento), interseção de palavras-chave (>=4 letras). Sem IA externa.

## Oportunidades nos cards
Além das badges simples de motivo, cada sugestão deve exibir hipótese prática:
- `Parceria complementar`: serviços diferentes que podem gerar oferta conjunta (ex.: SEO + Desenvolvimento Web, Jurídico + Contábil, Marketing + Design).
- `Troca de base compatível`: públicos-alvo parecidos com soluções diferentes.
- `Indicação estratégica`: cruzamento claro entre cliente ideal e oferta do outro perfil.
- `Afinidade de segmento/tags`: conexão exploratória quando faltam sinais mais fortes.

Preservar abordagem determinística e sem IA externa nesta etapa. Não alterar gamificação: o check continua criando Gente em Ação e somando +10 pts via RPC.

## Aviso de perfil incompleto
Campos obrigatórios para participar bem: `what_i_do`, `ideal_client`, `business_segment`, `tags`. Banner orienta completar em `/perfil`.

## Check / pontuação
O diálogo "Já conectei" usa os MESMOS campos do Gente em Ação (contato já é a sugestão): data da reunião, notas (opcional) e foto (opcional, comprimida e enviada ao bucket `gente-em-acao` via `src/lib/image-upload.ts`).

RPC `create_matchmaking_check(_target_id, _description, _meeting_date, _image_url)` (SECURITY DEFINER):
1. Cria registro em `gente_em_acao` (membro→partner_id; convidado→guest_name; grava `image_url`) → 25 pts pela mecânica existente.
2. Insere em `matchmaking_connections` (unique member_id+target_id; ligado ao gente_em_acao_id; year_month).
3. Activity feed `matchmaking` + recálculo via `update_all_monthly_points_for_user`.

Bônus de +10 pts somado em `calculate_monthly_points_for_team` (termo `matchmaking_count * 10`), preservando todos os demais cálculos. Registrar Gente em Ação direto (fora do MatchMaking) continua disponível e soma só os 25 pts.

## Tabela `matchmaking_connections`
RLS: membro vê/cria/remove os próprios; admin/facilitador leem. Pontos só contam para membros (admin/facilitador retornam 0 no cálculo).
