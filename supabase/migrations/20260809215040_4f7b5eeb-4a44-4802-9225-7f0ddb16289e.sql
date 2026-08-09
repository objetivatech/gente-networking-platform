insert into public.system_changelog (version, title, description, category, changes)
values (
  'v3.33.1',
  'Correção da integração LPs → CRM',
  'O submit-lead passou a definir invite_purpose explicitamente, destravando a ingestão de leads sem grupo vindos das LPs e do site.',
  'fix',
  '["submit-lead define invite_purpose: premium_group (com grupo) ou hub_legacy (sem grupo)", "Leads sem grupo deixam de falhar com \"Convite para grupo premium exige grupo\"", "Documentação de integração das LPs atualizada"]'::jsonb
);