# Integração — WordPress (site institucional) → CRM

**Versão:** v3.32.0
**Site alvo:** https://gentenetworking.com.br (WordPress)

O CRM aceita leads do site institucional via **webhook HTTP** direto para a Edge Function
`submit-lead`. Abaixo, três caminhos (do mais recomendado ao mais direto).

## Pré-requisitos

- URL da função: `https://<PROJECT_REF>.functions.supabase.co/submit-lead`
- `anon key` (publishable) do Supabase da Comunidade
- Acesso admin ao WordPress

---

## Opção A — WPForms (recomendado)

1. No plugin WPForms, abra o formulário desejado.
2. **Settings → Webhooks → Add Webhook**.
3. Configure:
   - **Request URL**: URL da função `submit-lead`
   - **Method**: `POST`
   - **Format**: `JSON`
   - **Headers**:
     - `Content-Type: application/json`
     - `apikey: <anon key>`
     - `Authorization: Bearer <anon key>`
   - **Body** (mapear campos do formulário):
     ```json
     {
       "name": "{field_id=\"1\"}",
       "email": "{field_id=\"2\"}",
       "phone": "{field_id=\"3\"}",
       "company": "{field_id=\"4\"}",
       "source": "site_elementor",
       "notes": "{field_id=\"5\"}"
     }
     ```
4. Salve e envie um teste.

## Opção B — Elementor Forms (recomendado para o site atual)

A função `submit-lead` é **pública** (`verify_jwt=false`) e aceita
`application/x-www-form-urlencoded`, então o webhook nativo do Elementor
funciona **sem proxy PHP e sem headers customizados**.

1. Edite a página com Elementor e selecione o Form.
2. **Actions After Submit → Add Action → Webhook**.
3. Em **Advanced → Webhook URL**, cole a URL da função:
   `https://<PROJECT_REF>.functions.supabase.co/submit-lead`
4. Marque **Advanced Data** = `Yes` (o Elementor passa a enviar chaves no formato
   `form_fields[name]`, que a função reconhece automaticamente).
5. Garanta que os campos do formulário tenham os IDs **exatamente**: `name`,
   `email`, `phone`, `company`, `segment` (opcionais além de name/email).
6. Adicione um campo **Hidden** com ID `source` e valor `site_elementor`
   (ou `lp_gentehub`, `lp_participe`, `lp_networking` conforme a página).
7. Salve e envie um teste. O lead deve aparecer em `/admin/crm` em segundos.

> A função também aceita JSON puro — use isso apenas se você tiver um plugin
> capaz de enviar `Content-Type: application/json` (WPForms com Webhooks Add-on,
> Fluent Forms, etc.).

## Opção C — Snippet PHP (proxy simples)

Cole em `functions.php` do tema filho (ou plugin de snippets):

```php
add_action('wpcf7_mail_sent', function ($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;

    $data = $submission->get_posted_data();
    $payload = [
        'name'    => $data['your-name'] ?? '',
        'email'   => $data['your-email'] ?? '',
        'phone'   => $data['your-phone'] ?? '',
        'company' => $data['your-company'] ?? '',
        'source'  => 'site_elementor',
        'notes'   => $data['your-message'] ?? '',
    ];

    wp_remote_post('https://<PROJECT_REF>.functions.supabase.co/submit-lead', [
        'headers' => [
            'Content-Type'  => 'application/json',
            'apikey'        => '<ANON_KEY>',
            'Authorization' => 'Bearer <ANON_KEY>',
        ],
        'body'    => wp_json_encode($payload),
        'timeout' => 8,
    ]);
});
```

Ajuste `wpcf7_mail_sent` para o hook do plugin em uso (ex.: `wpforms_process_complete`).

---

## Teste ponta a ponta

1. Envie um formulário real no site em produção.
2. Confirme o card em `/admin/crm` com badge **Site** (origem `site_elementor`).
3. Se falhar, veja os logs em:
   - WordPress: log do plugin de forms.
   - Supabase: **Edge Functions → submit-lead → Logs**.

## Segurança

- Nunca cole a `service_role` no WordPress — sempre `anon key`.
- Adicione uma proteção anti-spam (Akismet, Turnstile, reCAPTCHA) no formulário.
- O CRM só aceita `source` conhecidos; qualquer outro é rejeitado.
