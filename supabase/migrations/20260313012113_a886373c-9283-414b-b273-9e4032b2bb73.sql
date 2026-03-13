
-- Changelog entry for v3.1.0
INSERT INTO public.system_changelog (version, title, description, category, changes)
VALUES (
  '3.1.0',
  'Triggers de Gamificação, Cache Proxy e Correções',
  'Implementação de triggers automáticos para pontuação, integração com Cloudflare Worker Proxy para cache de borda, correções de responsividade e unificação de menus.',
  'release',
  '["Criados 16 triggers automáticos para calcular pontos mensais em todas as atividades (Gente em Ação, Depoimentos, Indicações, Negócios, Presenças, Conselho 24/7, Cases de Negócio, Convites)", "Integração com Cloudflare Worker Proxy para cache de borda com TTLs específicos", "Componente de diagnóstico de cache no painel admin (HIT/MISS/BYPASS)", "Correção do cliente supabaseReadOnly que não compartilhava sessão de autenticação", "Unificação das páginas /membros e /grupos em abas", "Atualização do ScoringRulesCard com todas as 8 atividades pontuáveis", "Links de notificações do sininho agora direcionam para /feed", "Melhorias de responsividade mobile (overflow-x-hidden, grids adaptativos)", "Correção dos thresholds de rank (Iniciante 0-49, Bronze 50-149, Prata 150-299, Ouro 300-499, Diamante 500+)"]'::jsonb
);
