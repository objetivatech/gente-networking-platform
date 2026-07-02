## Contexto

Dois logos novos foram enviados:

- **Gente Networking** (`gente-networking.png`) — logo institucional da empresa.
- **Gente Comunidade** (`gente-comunidade.png`) — logo da ferramenta/plataforma.

Ambos têm o "GENTE" em cinza-claro e o subtítulo em laranja, otimizados para fundos escuros (navy). Hoje o app usa `logo-gente.png`, `logo-gente-branco.png` e `logo-gente-card.png` espalhados por várias páginas e nos e-mails.

## 1. Estratégia de logos (minha recomendação)

Concordo com sua leitura. Proposta de aplicação:

**Logo Gente Networking (empresa/institucional):**

- Todos os e-mails (cabeçalho e rodapé) — já usam versão branca sobre navy.
- Telas públicas/externas de entrada institucional: Login (`Auth`), Redefinir senha, Confirmação de conta (`AuthConfirm`), Convite público (`ConvitePublico`), Instalar PWA, Boas-vindas do convidado (`GuestWelcome`).
- Cabeçalho da página pública do perfil (`/p/:slug`) e rodapé dela — é uma vitrine externa da marca.

**Logo Gente Comunidade (ferramenta):**

- Dentro da plataforma logada: Sidebar (topo) e, como reforço, no rodapé interno (`Footer`).
- É onde o usuário "está usando a ferramenta", então faz sentido a identidade da Comunidade.

**Cartão Digital do Membro (os dois logos):**

- Logo **Gente Comunidade** em destaque (topo, maior).
- Logo **Gente Networking** discreto, menor, em segundo plano (ex.: rodapé do cartão ou marca d'água suave), como você sugeriu.

Opção alternativa caso prefira: manter apenas 1 logo por contexto e usar Comunidade também nas telas de login. Minha recomendação é a divisão acima (institucional fora / ferramenta dentro), que comunica melhor os dois níveis da marca.

**/// Gostei do que indicou acima. Podemos seguir assim. ///**

### Implementação técnica dos logos

- Subir os dois arquivos como assets do projeto (`src/assets/logo-gente-networking.png` e `src/assets/logo-gente-comunidade.png`) via Lovable Assets.
- Para os e-mails, hospedar a versão pública (a arte é clara sobre fundo escuro, então serve para o header navy). Atualizar `LOGO_URL` em `supabase/functions/_shared/email-templates.ts`.
- Substituir os imports/`src` nos arquivos: `Sidebar.tsx`, `Footer.tsx`, `Auth.tsx`, `AuthConfirm.tsx`, `RedefinirSenha.tsx`, `ConvitePublico.tsx`, `Instalar.tsx`, `GuestWelcome.tsx`, `PublicProfile.tsx`, `DigitalMemberCard.tsx`.

## 2. Página pública do perfil (`/p/:slug`)

- **Título e subtítulo:** adicionar um bloco com "Membro do Gente Networking" (título) e, como subtítulo, o **grupo** ao qual o membro pertence (ex.: "Grupo Impulso").
  - Requer estender a RPC `get_public_profile` para retornar o nome do grupo (join `team_members` → `teams`) e o papel (membro/convidado), sem quebrar os campos atuais.
- **Diagramação (banner sobreposto):** corrigir a sobreposição do texto sobre o banner. O avatar/nome subirão com margem negativa correta e o bloco de identificação ficará **abaixo** do banner (não em cima dele), com espaçamento responsivo, replicando o padrão já usado no perfil interno.

## 3. Perfil interno do membro (`Profile.tsx`)

- Corrigir o "amontoado à esquerda" em telas largas: hoje o conteúdo fica preso em `max-w-4xl` com `md:pl-40`, deixando os dados comprimidos numa coluna estreita.
- Reorganizar para um layout de 2 colunas que preenche melhor a largura (dados principais + coluna lateral de pontos/cartão), com o avatar posicionado corretamente e sem espaço morto à direita. Ajustar breakpoints para empilhar limpo no mobile.

## 4. Revisão geral de responsividade

Varredura das páginas principais para corrigir os problemas mostrados nos prints mobile (conteúdo cortado, cards estourando a largura, textos sobrepostos):

- Padronizar containers com `w-full max-w-*` + `overflow-x-hidden` já existente no layout.
- Cards de estatísticas (Início, Gente em Ação, Ranking): garantir grid responsivo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-...`) em vez de largura fixa que corta no mobile.
- Cabeçalhos de página, tabelas e listas: rolagem horizontal controlada e quebra de texto.
- Revisar `Ranking`, `Encontros`, `Estatisticas`, `GenteEmAcao`, `Feed`, `Membros`, `Negocios`, `Indicacoes` e páginas de gestão.

## 5. Documentação e Changelog

- Nova entrada de changelog (**v3.20.0**) descrevendo: atualização de identidade visual (2 logos), ajustes da página pública, reorganização do perfil interno e revisão de responsividade.
- Atualizar docs relevantes e memória (`mem://design/visual-identity`) com a regra dos dois logos por contexto.

## Notas técnicas

- Nenhuma mudança em regras de negócio, pontuação ou permissões — apenas apresentação (frontend), a RPC `get_public_profile` (adição de campos, retrocompatível) e o template de e-mail.
- Assets via Lovable Assets (sem inflar o repositório).
- Todos os novos arquivos seguem o cabeçalho JSDoc Ranktop.