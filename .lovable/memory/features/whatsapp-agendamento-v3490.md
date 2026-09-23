---
name: WhatsApp assistido no agendamento v3.49.0
description: Após solicitar Gente em Ação, oferece abrir WhatsApp, copiar mensagem ou concluir; usa telefone do perfil e domínio Cloudflare, sem envio automático.
type: feature
---

# WhatsApp assistido no Gente em Ação

- O e-mail e a notificação interna continuam sendo os canais oficiais.
- Depois da criação bem-sucedida, o diálogo oferece **Abrir WhatsApp e enviar**, **Copiar mensagem** e **Concluir sem WhatsApp**.
- A plataforma abre `wa.me` com sugestão editável; não usa API da Meta e não confirma envio, entrega ou leitura.
- O telefone vem do perfil, é normalizado com DDI `55` e, quando inválido/ausente, somente a cópia da mensagem fica disponível.
- A mensagem sempre usa `https://comunidade.gentenetworking.com.br/perfil?tab=agendamentos`.
- Só `whatsapp_opened_at` é registrado, por RPC restrita ao solicitante e de modo idempotente.
- A etapa final não cria outra solicitação, tentativa de MatchMaking ou pontuação.