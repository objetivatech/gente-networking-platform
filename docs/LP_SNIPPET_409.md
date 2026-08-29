# Tratamento do retorno 409 `already_member` nas LPs (v3.47.0)

Quando alguém que **já é membro ativo** (membro, facilitador ou admin) preenche um
formulário de uma LP, a Edge Function `submit-lead` responde:

```http
HTTP/1.1 409 Conflict
Content-Type: application/json
```

```json
{
  "ok": false,
  "already_member": true,
  "message": "Você já faz parte do Gente. Acesse a plataforma com seu login para continuar.",
  "login_url": "https://comunidade.gentenetworking.com.br/auth"
}
```

Nada é criado no CRM nesse caso — o bloqueio é registrado em `crm_identity_events`
e aparece no painel `/admin/crm/auditoria`, aba **Bloqueios na origem**.

As LPs precisam exibir a mensagem amigável com link de login em vez de um erro
genérico. Abaixo os trechos por tecnologia.

---

## 1. JavaScript puro (fetch)

```html
<div id="gente-form-msg" role="status" aria-live="polite" style="display:none"></div>

<script>
const ENDPOINT = 'https://vyfkddcbmwlwldaorxzy.supabase.co/functions/v1/submit-lead';

function genteShowMessage(html, type) {
  const box = document.getElementById('gente-form-msg');
  box.innerHTML = html;
  box.style.display = 'block';
  box.style.padding = '14px 16px';
  box.style.borderRadius = '8px';
  box.style.marginTop = '12px';
  box.style.fontSize = '15px';
  box.style.background = type === 'already' ? '#FFF4E5' : type === 'error' ? '#FDECEC' : '#EAF5EA';
  box.style.color = type === 'error' ? '#8A1F1F' : '#1E3A5F';
}

async function genteSubmit(payload) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 409 && data.already_member) {
    genteShowMessage(
      '<strong>Você já faz parte do Gente!</strong><br>' +
      'Não é necessário se cadastrar novamente. ' +
      '<a href="' + (data.login_url || 'https://comunidade.gentenetworking.com.br/auth') + '" ' +
      'style="color:#F7941D;font-weight:600;text-decoration:underline">Acessar a plataforma</a>',
      'already'
    );
    return;
  }

  if (!res.ok || data.ok === false) {
    genteShowMessage(data.message || 'Não foi possível enviar seu cadastro. Tente novamente.', 'error');
    return;
  }

  genteShowMessage('Cadastro recebido! Confira seu e-mail para os próximos passos.', 'ok');
}
</script>
```

---

## 2. Elementor (Webhook + JS adicional)

O Webhook do Elementor não expõe o corpo da resposta ao visitante. Para exibir a
mensagem, adicione um "HTML widget" na página com o script abaixo — ele intercepta
o envio e faz a chamada direta antes do Elementor:

```html
<script>
jQuery(document).on('submit_success', '.elementor-form', function () {
  /* fluxo normal: cadastro criado */
});

jQuery(document).on('submit_error', '.elementor-form', function (event, response) {
  var msg = response && response.data && response.data.message;
  if (msg && msg.indexOf('já faz parte') !== -1) {
    jQuery(event.target)
      .find('.elementor-message-danger')
      .html(
        '<strong>Você já faz parte do Gente!</strong> ' +
        '<a href="https://comunidade.gentenetworking.com.br/auth" ' +
        'style="color:#F7941D;font-weight:600">Acesse a plataforma com seu login</a>.'
      );
  }
});
</script>
```

Alternativa recomendada: usar a ação **Webhook** apontando para `submit-lead` e,
no campo "Mensagem de erro" do formulário, deixar um texto neutro. O texto exato
do bloqueio é sempre entregue pelo campo `message` da resposta.

---

## 3. React / Next.js

```tsx
const ENDPOINT = 'https://vyfkddcbmwlwldaorxzy.supabase.co/functions/v1/submit-lead';

type LeadState =
  | { kind: 'idle' }
  | { kind: 'ok' }
  | { kind: 'already'; loginUrl: string }
  | { kind: 'error'; message: string };

async function submitLead(payload: Record<string, unknown>): Promise<LeadState> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({} as any));

  if (res.status === 409 && data.already_member) {
    return {
      kind: 'already',
      loginUrl: data.login_url ?? 'https://comunidade.gentenetworking.com.br/auth',
    };
  }
  if (!res.ok || data.ok === false) {
    return { kind: 'error', message: data.message ?? 'Falha ao enviar o cadastro.' };
  }
  return { kind: 'ok' };
}
```

Renderização:

```tsx
{state.kind === 'already' && (
  <div className="rounded-lg bg-amber-50 p-4 text-[#1E3A5F]">
    <strong>Você já faz parte do Gente!</strong>{' '}
    Não é preciso se cadastrar de novo.{' '}
    <a href={state.loginUrl} className="font-semibold text-[#F7941D] underline">
      Acessar a plataforma
    </a>
  </div>
)}
```

---

## Checklist de aplicação nas LPs

- [ ] Endpoint `submit-lead` chamado por `POST` com `Content-Type: application/json`.
- [ ] `page_url` enviado no payload (garante o registro automático da página no CRM).
- [ ] Status `409` tratado antes do tratamento genérico de erro.
- [ ] Link de login usando `login_url` da resposta.
- [ ] Mensagem em PT-BR, sem stack trace nem "Webhook error".
