## Diagnóstico

O problema não está na rota `/convidados` nem no menu: ambos já permitem `admin`, `facilitador` e `membro`.

O bloqueio provável está no hook `src/hooks/useGuestsDirectory.ts`:

- A página busca convidados começando por `invitations`.
- Após a mudança v3.7.0, convidados deixaram de estar em `team_members` e o vínculo com grupo passou a existir em `invitations.team_id`.
- Porém as policies atuais de `invitations` permitem leitura apenas para:
  - admin;
  - usuário que criou o convite (`invited_by`).
- Portanto um membro comum autenticado não consegue ler os convites aceitos da comunidade e o diretório fica vazio/incompleto para ele.

A regra correta é: `admin`, `facilitador` e `membro` podem ver o diretório de convidados; `convidado` não pode.

## Plano de correção

### 1. Corrigir a origem de dados do diretório de convidados

Criar uma RPC segura no Supabase, por exemplo `public.get_guests_directory()`, com `SECURITY DEFINER` e checagem explícita de role:

- Permitir execução apenas para usuários autenticados com role `admin`, `facilitador` ou `membro`.
- Bloquear role `convidado` e usuários sem role válida.
- Retornar somente os campos que a tela precisa:
  - dados públicos/operacionais do convidado;
  - status da jornada;
  - grupo vindo de `invitations.team_id`;
  - quem convidou;
  - contagem de presenças.
- Não expor `code`, `metadata`, `expires_at` e outros campos internos/sensíveis de `invitations`.

Isso corrige o bug sem abrir a tabela `invitations` inteira para todos os membros.

### 2. Atualizar `useGuestsDirectory`

Trocar a montagem manual atual por chamada à RPC:

- `supabase.rpc('get_guests_directory')`.
- Manter o mesmo contrato TypeScript (`GuestDirectoryEntry`) para não quebrar `src/pages/Convidados.tsx`.
- Preservar a regra de status:
  - `awaiting_first` quando ainda não participou;
  - `attended` quando já participou;
  - `promoted` quando deixou de ser `convidado`.
- Garantir que o filtro por grupo use `invitations.team_id`, não `team_members`.

### 3. Garantir bloqueio explícito para convidados

Manter o redirecionamento em `src/pages/Convidados.tsx`, mas fortalecer a lógica para aguardar carregamento de role antes de concluir vazio/sem acesso.

A proteção real ficará no banco pela RPC; a UI continua apenas como camada de experiência.

### 4. Criar proteção contra regressões

Adicionar uma camada simples e permanente de manutenção para evitar que alterações futuras quebrem permissões críticas:

- Criar um arquivo central de matriz de permissões, por exemplo `src/lib/access-control.ts`, com regras nomeadas:
  - `canViewGuestsDirectory(role)`;
  - `canManageGuests(role)`;
  - outras regras já usadas em menus/rotas podem migrar gradualmente para esse padrão.
- Usar essa regra no menu e na página de convidados, evitando permissões duplicadas espalhadas.
- Adicionar testes automatizados focados nas regras críticas de acesso, com Vitest:
  - `admin` vê diretório de convidados;
  - `facilitador` vê diretório de convidados;
  - `membro` vê diretório de convidados;
  - `convidado` não vê diretório de convidados;
  - role nula/indefinida não vê diretório protegido.

### 5. Adicionar uma verificação de regressão para o hook

Adicionar teste unitário do hook/serviço de diretório, mockando o Supabase:

- Deve chamar a RPC `get_guests_directory`.
- Não deve voltar a consultar `invitations` diretamente no frontend para montar o diretório.

Isso protege exatamente contra o tipo de bug ocorrido: uma mudança estrutural no banco quebrar uma tela por dependência indevida de RLS.

### 6. Atualizar documentação

Atualizar os documentos pertinentes:

- `docs/INVITATION_FLOW.md`: registrar que `/convidados` usa RPC segura e é visível para `admin`, `facilitador`, `membro`.
- `docs/TECHNICAL_DOCUMENTATION.md`: documentar a matriz de acesso e o teste de regressão.
- Memória do projeto relacionada a convidados, para preservar a regra em futuras alterações.

### 7. Validação final

Depois da implementação:

- Executar teste focado de permissões/regressão.
- Rodar linter/checagem aplicável ao Supabase se disponível.
- Validar que `/convidados` continua bloqueado para `convidado` e disponível para `membro`, `facilitador`, `admin`.

## Resultado esperado

- Membros voltam a ver a listagem de convidados.
- Facilitadores e admins continuam vendo normalmente.
- Convidados seguem bloqueados.
- O diretório passa a depender de uma interface segura e estável no banco, não de leitura direta de uma tabela sensível.
- Haverá testes e matriz de permissões para reduzir regressões em futuras alterações.