INSERT INTO public.system_changelog (version, title, category, description, changes) VALUES (
 'v3.56.0', 'Fluxo enxuto de convites e reconvite por papel', 'feature',
 'O convidado conclui tudo em uma única página: conta já confirmada, sem segundo e-mail, e presença confirmada no próximo encontro do Grupo.',
 '[
  {"type":"feature","text":"Página única do convite com anfitrião, Grupo e próximo encontro; link antigo /cadastrar redireciona"},
  {"type":"feature","text":"Ativação instantânea (complete-guest-signup) com login automático e presença confirmada"},
  {"type":"feature","text":"Botão Reconvidar em Convites e Convidados com mensagem pronta para WhatsApp"},
  {"type":"improvement","text":"Membro reconvida os próprios convidados nos seus Grupos; Facilitador no próprio Grupo; Admin em qualquer encontro"},
  {"type":"improvement","text":"Admin pode mover convidado para encontro de outro Grupo; autoria e pontos seguem com quem convidou primeiro"},
  {"type":"docs","text":"FLUXOS_DE_CONVITES e USER_FLOWS atualizados"}
 ]'::jsonb);