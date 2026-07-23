INSERT INTO public.system_changelog (version, title, description, category, changes) VALUES (
  'v3.29.0',
  'Logos brancos, cartão digital com dois logos e quebra automática, perfil público estável',
  'Ajustes de identidade visual e correções no cartão digital e na página pública do perfil.',
  'melhoria',
  '[
    "Substituídos os logos brancos oficiais (Comunidade e Networking) enviados pelo usuário",
    "Auth, Sidebar e Footer voltam a usar o logo branco do Gente Comunidade sobre o fundo navy",
    "Páginas externas (AuthConfirm, ConvitePublico, GuestWelcome, Instalar, RedefinirSenha, Perfil Público) usam o logo branco do Gente Networking sobre o fundo navy",
    "Cartão Digital do Membro: dois logos (Comunidade em destaque + Networking secundário) e quebra de linha automática em nome, cargo, empresa, segmento, e-mail e telefone — sem sobrepor o QR Code",
    "Perfil público /m/:slug: tratamento defensivo de erros na RPC get_public_profile para evitar tela de erro quando o slug não existe ou a resposta falha"
  ]'::jsonb
);