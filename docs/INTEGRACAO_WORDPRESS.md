# Integração — WordPress (site institucional) → CRM

**Versão:** v3.28.0
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

## Opção B — Elementor Forms

1. Edite a página com Elementor e selecione o Form.
2. **Actions After Submit → adicionar Webhook**.
3. Cole a mesma URL da função em "Webhook URL".
4. O Elementor envia como `application/x-www-form-urlencoded`. Ative a opção
   "Advanced Data" e mapeie os campos com nomes exatamente iguais ao payload esperado:
   `name`, `email`, `phone`, `company`, `segment`, `notes`.
5. Adicione `source=site_elementor` como campo oculto (`hidden`).

> ⚠️ Elementor não envia headers customizados por padrão. Se sua função exigir `apikey`,
> use a **Opção C** (proxy PHP) ou coloque a função atrás de um Worker Cloudflare que
> injete o header.

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
