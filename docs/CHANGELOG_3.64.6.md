<!-- @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte -->
# v3.64.6 — Correção da confirmação de encontros

- Convidado autorizado confirma encontro Premium sem gerar comparecimento ou pontos antes do evento.
- Confirmação fica vinculada ao encontro; convite geral de Grupo e autoria original são preservados. Repetir a confirmação não duplica registros.
- Gente HUB continua aberto para Convidados, com inscrição e contagem deduplicadas no CRM. Gente Conexões continua exigindo convite específico, inclusive HUB.
- Cancelar a confirmação não apaga comparecimento registrado pela gestão nem inscrição HUB criada por terceiros.
- Ativação de convidados reutiliza a mesma confirmação segura; agenda lê a confirmação persistida.
- Falhas mostram o motivo retornado pelo servidor, não apenas mensagem genérica.
- Nenhuma presença histórica ou pontuação foi removida; a correção não confirma o convidado automaticamente.
- Validação: regressão transacional do caso executada e totalmente desfeita; 222 testes passaram, build OK e nenhum alerta de segurança novo (79 preexistentes).
- Correção no Supabase aplicada; confirmação pela interface autenticada não foi verificada no Supabase externo. Publicação das mensagens do frontend depende do Cloudflare.