# WhatsApp assistido no Agendar Gente em Ação

## Objetivo
Após uma solicitação de Gente em Ação ser gravada, oferecer ao solicitante um reforço manual pelo WhatsApp, sem API paga e sem alterar o envio oficial por e-mail e notificação interna.

## Implementação
- Centralizar no formulário compartilhado pelo MatchMaking e pelo perfil do membro.
- Buscar no banco o nome do solicitante e o telefone do destinatário; não aceitar número informado livremente nessa ação.
- Normalizar telefone brasileiro para o padrão internacional (`55` + DDD + número) e rejeitar formatos inválidos.
- Após o sucesso, manter o diálogo aberto em uma etapa final com:
  - **Abrir WhatsApp e enviar** quando houver telefone válido;
  - **Copiar mensagem** em todos os casos;
  - **Concluir sem WhatsApp**.
- Preencher a mensagem aprovada com destinatário, solicitante, data, hora, duração, local e o link público fixo `https://comunidade.gentenetworking.com.br/perfil?tab=agendamentos`.
- Abrir `wa.me` somente por ação explícita. O texto seguirá editável no WhatsApp.
- Registrar no pedido apenas a data em que o WhatsApp foi aberto; não registrar como enviado ou entregue.
- Impedir novo envio do formulário após a solicitação criada, evitando solicitação, tentativa ou pontuação duplicada.

## Banco e segurança
- Adicionar `whatsapp_opened_at` opcional em `meeting_requests`.
- Permitir que apenas o solicitante participante registre essa abertura, por uma função segura e idempotente.
- Manter as regras atuais de leitura, confirmação, recusa e cancelamento.

## Validação
- Testar normalização, mensagem e URL do WhatsApp.
- Verificar os fluxos pelo MatchMaking e pelo perfil do membro, inclusive sem telefone e falha ao copiar.
- Confirmar que e-mail, notificação e tentativa do MatchMaking continuam ocorrendo uma única vez.
- Atualizar documentação, histórico da versão e memória funcional.
