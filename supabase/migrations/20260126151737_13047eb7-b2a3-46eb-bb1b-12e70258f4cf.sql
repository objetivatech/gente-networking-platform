-- Adicionar entrada no changelog para as correções de segurança e rodapé
INSERT INTO public.system_changelog (version, title, description, category, changes)
VALUES 
  ('1.4.1', 'Segurança e Rodapé de Copyright', 'Correções de segurança no banco de dados e adição de rodapé padronizado em todas as páginas públicas.', 'release', 
   '[
     "Definido search_path em 16+ funções PostgreSQL para prevenir SQL injection via hijacking",
     "Extensões unaccent e pg_trgm movidas para schema extensions dedicado",
     "Adicionado rodapé de copyright Ranktop em todas as páginas públicas",
     "Corrigido posicionamento do rodapé na página de login",
     "Meta tags de autoria adicionadas ao index.html",
     "Cabeçalhos JSDoc de copyright em arquivos core do sistema"
   ]'::jsonb);