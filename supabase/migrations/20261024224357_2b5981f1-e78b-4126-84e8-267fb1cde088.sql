INSERT INTO public.system_changelog (version, title, description, changes, category)
SELECT
  '3.53.0',
  'Vitrine da Comunidade e franquia do MatchMaking',
  'Assinantes e Convidados ativos ganham uma vitrine exclusiva, e o MatchMaking passa a controlar sorteios extras por franquia mensal do plano.',
  '["Vitrine interna restrita a Assinantes e Convidados ativos","Perfis de MatchMaking filtrados no banco conforme o papel","Sorteio extra registrado por mês sem consumir a sugestão semanal","Assinante sem plano ativo ou sem franquia não sorteia novos contatos","Tentativas de contato do Assinante limitadas à vitrine permitida"]'::jsonb,
  'feature'
WHERE NOT EXISTS (SELECT 1 FROM public.system_changelog WHERE version = '3.53.0');