-- Inserir entradas no changelog para as novas funcionalidades
INSERT INTO public.system_changelog (version, title, description, category, changes)
VALUES 
  ('1.4.0', 'URLs Amigáveis e Gerenciamento de Membros', 'Nova estrutura de URLs e controle de membros ativos', 'release', 
   '["URLs de perfil agora usam slug amigável (ex: /membro/joao-silva)", "Nova página de gerenciamento de membros para admins", "Sistema de ativação/desativação de membros", "Histórico de membros que saíram da comunidade", "Motivo opcional para desativação"]'::jsonb);