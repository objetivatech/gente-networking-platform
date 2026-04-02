
INSERT INTO system_changelog (version, title, description, category, changes)
VALUES (
  '3.4.0',
  'Confirmação de Email, Visibilidade de Encontros e Promoção por Facilitadores',
  'Reestruturação do fluxo de convites, correção de visibilidade de encontros para convidados e permissão de promoção por facilitadores.',
  'release',
  '["Novo callback /auth/confirm para confirmação de email com aceite de convite pós-verificação","Função accept_invitation agora é idempotente e salva snapshot de allowed_team_ids","Convidados agora veem encontros de hoje e futuros corretamente","Fallback inteligente: convidados sem grupo atribuído veem todos os encontros","Facilitadores podem promover convidados a Membros via RPC segura (promote_guest_to_member)","Facilitadores só podem promover para Membro e apenas dentro do seu grupo","Backfill de allowed_team_ids em todos os convites aceitos existentes","Documentação técnica e fluxos de usuário atualizados"]'::jsonb
);
