-- Add v2.3.0 changelog entry
INSERT INTO system_changelog (version, title, description, changes, category, created_at)
VALUES (
  '2.3.0',
  'Gamificação Mensal por Grupo',
  'Reformulação completa do sistema de gamificação para operar com ciclos mensais e pontuação por grupo',
  '["Pontos são zerados automaticamente a cada novo mês", "Histórico de pontos mensais com consulta de meses anteriores", "Pontuação separada por grupo para membros de múltiplos grupos", "Rankings mensais com seletor de mês e grupo", "Gráfico de evolução mensal no perfil", "Nova seção de pontos mensais no dashboard", "Triggers automáticos para as 5 atividades principais", "Função de recálculo de pontos mensais no Admin"]'::jsonb,
  'release',
  NOW()
);