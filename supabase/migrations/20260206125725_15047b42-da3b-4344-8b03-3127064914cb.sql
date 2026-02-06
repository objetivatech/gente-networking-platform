-- Add changelog entry for version 2.1.0
INSERT INTO system_changelog (version, title, description, category, changes)
VALUES (
  '2.1.0',
  'Correções de Fluxo de Convidados e Emails',
  'Melhorias no sistema de convites, acesso a perfis e emails',
  'fix',
  '["Corrigido sistema de expiração de convites (30 dias)", "Corrigido acesso a perfis de membros convertidos na Gestão de Convidados", "Corrigida página de aceite de convite com logo real e rodapé padronizado", "Corrigido carregamento do logo nos templates de email", "Admins e Facilitadores agora podem visualizar todos os perfis de membros"]'::jsonb
);