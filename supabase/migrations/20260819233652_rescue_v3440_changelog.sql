-- v3.44.0 — Central de Resgate: orçamento, pessoas, campanhas e histórico
INSERT INTO public.integration_settings (category, provider, environment, config)
VALUES ('rescue', 'resend', 'production', jsonb_build_object(
  'daily_budget', 300,
  'transactional_reserve', 100,
  'send_days', jsonb_build_array(2,3,4),
  'send_hour_start', 9,
  'send_hour_end', 11,
  'whatsapp_number', '555121652325',
  'enabled', true
))
ON CONFLICT (category) DO NOTHING;

INSERT INTO public.system_changelog (version, title, description, category, changes)
VALUES (
  '3.44.0',
  'Central de Resgate completa: orçamento diário, pessoas, campanhas e histórico',
  'Conclusão das Partes 4 e 5 da régua de resgate — controle do limite de 300 e-mails/dia da Resend, gestão de pessoas na régua, editor de campanhas com preview e teste, e histórico exportável.',
  'release',
  '["Painel de orçamento diário (usados/disponíveis/fila) com barra de progresso e status da janela de envio","Configurações da régua editáveis pelo admin: limite diário, reserva transacional, dias e horário de envio, WhatsApp e liga/desliga","Nova aba Pessoas: etapa atual, próximo envio, enviar agora, pular etapa, pausar 30 dias (cool-off) e remover da régua (opt-out LGPD)","Editor de campanhas com texto rico, bloco de oferta especial opcional, variáveis {{nome}}, {{grupo}} e {{dias_desde}}","Preview do e-mail e envio de teste para qualquer endereço via rescue-runner (action=test)","Histórico com filtros por público e status e exportação em Excel/PDF","Correção dos rótulos de status da fila (queued/sent/skipped/cancelled/error)","Execução manual com modo simulação e modo forçado (ignora a janela de envio)"]'::jsonb
);
