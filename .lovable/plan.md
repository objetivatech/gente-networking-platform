

## Diagnóstico: Convites ficam como "Pendente" mesmo após aceito

### Causa Raiz

O fluxo de aceitação de convite depende de dois mecanismos para passar o código do convite para a página `/auth/confirm`:

1. **Query param `?invite=CODE`** na URL de redirect do email de confirmação
2. **`localStorage`** como fallback

**Ambos falham:**

- O Supabase usa fluxo PKCE para confirmação de email. Quando o usuário clica no link de confirmação, o Supabase redireciona para `/auth/confirm?code=PKCE_CODE`, **substituindo** o `?invite=CODE` original. O parâmetro `invite` se perde.
- O `localStorage` só funciona se o usuário abrir o link no mesmo navegador/dispositivo onde fez o cadastro. Se abrir em outro dispositivo, app de email diferente, ou aba anônima, o código não existe.

**Prova nos dados:** Todos os 7+ cadastros de abril têm `role = NULL` (sem papel atribuído) e seus convites correspondentes continuam com `status = pending`, `accepted_by = NULL`. A função `accept_invitation` nunca foi executada para eles.

### Plano de Correção

#### 1. Salvar o código do convite nos metadados do usuário no signup

Ao criar a conta em `CadastroConvidado.tsx`, incluir o código do convite nos `user_metadata` do Supabase Auth. Esses metadados viajam com o token e estão disponíveis em qualquer dispositivo após o login.

```typescript
// Em handleSignUp, adicionar invitation_code aos metadata
options: {
  emailRedirectTo: confirmUrl,
  data: {
    full_name: fullName,
    invitation_code: code,  // <-- NOVO
    // ... demais campos
  },
}
```

#### 2. Ler o código dos metadados no AuthConfirm

Em `AuthConfirm.tsx`, além de `searchParams` e `localStorage`, buscar o código nos metadados do usuário autenticado:

```typescript
const inviteCode = searchParams.get('invite') 
  || localStorage.getItem('invitation_code')
  || session.user.user_metadata?.invitation_code;  // <-- NOVO
```

Isso garante que o código esteja disponível independentemente do dispositivo ou navegador.

#### 3. Corrigir os convites pendentes retroativamente

Criar um script (via Edge Function ou SQL) que cruza `profiles.email` com `invitations.email` para os convites de abril que ficaram pendentes, e executa `accept_invitation` para cada match encontrado. Também atribuir o papel `convidado` aos usuários que ficaram sem papel.

#### 4. Adicionar log de diagnóstico

Adicionar logs no `AuthConfirm` para rastrear de onde o código do convite veio (query param, localStorage ou metadata), facilitando debug futuro.

### Arquivos Modificados

- `src/pages/CadastroConvidado.tsx` — adicionar `invitation_code` aos user_metadata
- `src/pages/AuthConfirm.tsx` — ler `invitation_code` dos user_metadata como fallback
- Migration SQL — corrigir convites pendentes e atribuir papéis faltantes

### Resultado Esperado

- Novos convites serão aceitos automaticamente na confirmação do email, independentemente do dispositivo
- Convites antigos pendentes com match de email serão corrigidos retroativamente
- Todos os convidados sem papel receberão o papel `convidado`

