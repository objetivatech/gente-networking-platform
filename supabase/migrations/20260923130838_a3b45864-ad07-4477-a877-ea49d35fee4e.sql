-- v3.49.0 — WhatsApp assistido após solicitar Gente em Ação.

ALTER TABLE public.meeting_requests
  ADD COLUMN IF NOT EXISTS whatsapp_opened_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.register_meeting_request_whatsapp_open(_request_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opened_at TIMESTAMPTZ;
BEGIN
  UPDATE public.meeting_requests
     SET whatsapp_opened_at = COALESCE(whatsapp_opened_at, now())
   WHERE id = _request_id
     AND requester_id = auth.uid()
  RETURNING whatsapp_opened_at INTO v_opened_at;

  IF v_opened_at IS NULL THEN
    RAISE EXCEPTION 'Solicitação não encontrada ou acesso negado';
  END IF;

  RETURN v_opened_at;
END;
$$;

REVOKE ALL ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_meeting_request_whatsapp_open(UUID) TO service_role;

INSERT INTO public.system_changelog (version, title, description, category, changes)
VALUES (
  '3.49.0',
  'WhatsApp assistido no Gente em Ação',
  'Após criar uma solicitação, o membro pode abrir o WhatsApp com uma mensagem sugerida, copiar o texto ou concluir sem WhatsApp.',
  'feature',
  '["Mensagem personalizada com data, horário, duração, local e link público da Cloudflare","Telefone do perfil normalizado para o padrão brasileiro internacional","Registro seguro apenas da abertura do WhatsApp, sem presumir envio ou entrega","E-mail, notificação interna e contagem do MatchMaking preservados sem duplicidade"]'::jsonb
)
ON CONFLICT DO NOTHING;