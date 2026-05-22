
INSERT INTO public.system_changelog (version, title, category, description, changes)
VALUES (
  'v3.10.0',
  'Downgrade seguro de membro para convidado',
  'feature',
  'Admin pode rebaixar um membro a convidado preservando todo o histórico. Útil quando um membro pede saída do Gente sem perder contato/histórico.',
  '[
    "Nova RPC downgrade_member_to_guest (admin-only) com SECURITY DEFINER",
    "Remove o usuário de todos os grupos e troca role para convidado",
    "Preserva ou cria convite aceito com snapshot (downgraded_at, previous_role, motivo) para manter vínculo histórico",
    "Recalcula monthly_points do mês corrente (zera pontuação ativa)",
    "Histórico de pontos, presenças, indicações, depoimentos, negócios, cases e Gente em Ação totalmente preservado",
    "Botão Tornar Convidado em Gerenciar Membros (cor âmbar, distinto de Desativar)",
    "Retorno via promote_guest_to_member já existente",
    "Nova regra canDowngradeMember na matriz de access-control com teste de regressão"
  ]'::jsonb
);
