INSERT INTO public.system_changelog (version, title, category, description, changes)
VALUES (
  'v3.6.0',
  'Separação clara de Convidados e novo Diretório',
  'improvement',
  'Convidados agora aparecem em seção própria nos Grupos e em diretório público acessível a todos os membros, eliminando confusão com a base de membros efetivos.',
  '[
    {"type": "improvement", "text": "Página /equipes (Grupos) agora separa rigorosamente Facilitadores, Membros e Convidados em três seções distintas"},
    {"type": "feature", "text": "Nova página /convidados — diretório de leads que passaram pela comunidade, acessível a todo membro"},
    {"type": "feature", "text": "Nova aba Convidados em /encontros listando convidados confirmados nos próximos eventos"},
    {"type": "improvement", "text": "Hook useTeams agora expõe member_type (facilitator | member | guest) para classificação à prova de erro"},
    {"type": "docs", "text": "Documentação atualizada (INVITATION_FLOW, USER_FLOWS, TECHNICAL_DOCUMENTATION)"}
  ]'::jsonb
);