# Correção de Logos e Responsividade Mobile

Investiguei os prints e o código. Encontrei **duas causas raiz concretas**, ambas corrigíveis apenas no frontend/templates (sem mexer em regras de negócio).

## Problema 1 — Logos não aparecem (quebrados)

Os componentes importam os logos a partir de arquivos `.asset.json`, cujo `url` aponta para o CDN da Lovable (`/__l5e/assets-v1/...`). Este projeto **é publicado via Cloudflare Pages** (não usa Lovable Cloud), então esse endereço **não existe em produção** — por isso o rodapé mostra a imagem quebrada ("Gente Comunidade").

Os PNGs corretos **já existem** em `public/` (`logo-gente-comunidade.png`, `logo-gente-networking.png`), e alguns componentes (DigitalMemberCard, PublicProfile) já usam o caminho público correto.

### Correção
Trocar em todos os arquivos abaixo o import `@/assets/logo-*.png.asset.json` + `logo.url` pelo caminho público estático:
- `logo-gente-comunidade.png` → `"/logo-gente-comunidade.png"`
- `logo-gente-networking.png` → `"/logo-gente-networking.png"`

Arquivos afetados:
```text
src/components/layout/Footer.tsx      (comunidade)
src/components/layout/Sidebar.tsx     (comunidade)
src/pages/Auth.tsx                    (networking)
src/pages/AuthConfirm.tsx             (networking)
src/pages/RedefinirSenha.tsx          (networking)
src/pages/ConvitePublico.tsx          (networking)
src/pages/GuestWelcome.tsx            (networking)
src/pages/Instalar.tsx                (networking)
```

### E-mails
Em `supabase/functions/_shared/email-templates.ts`, o `LOGO_URL` aponta para um domínio morto (`https://network-bloom-forge.lovable.app/...`). Trocar para o domínio real de produção onde o PNG é servido:
`https://comunidade.gentenetworking.com.br/logo-gente-networking.png` (mesmo host do `APP_URL`). Assim o cabeçalho dos e-mails volta a exibir o logo.

## Problema 2 — Overflow horizontal no mobile (página "amontoada"/cortada)

Nos prints a página inteira aparece cortada à direita. A causa não é grade errada (as grades já colapsam) e sim **strings longas sem quebra** (e-mails, URLs, links) dentro dos cards. Como não podem quebrar, forçam a largura mínima do conteúdo a ficar maior que a tela, e o navegador mobile renderiza a página "afastada"/cortada. O `overflow-x-hidden` global apenas corta visualmente, sem resolver a origem.

Exemplo confirmado (print de Indicações): em `src/pages/Indicacoes.tsx` o e-mail do contato está em um `<a class="flex items-center gap-1">` sem `min-w-0`/`break-all`, estourando o card.

### Correção (categoria, não caso isolado)
Auditar e aplicar quebra de texto/`min-w-0` onde há e-mail, telefone, URL ou link exibido, nas páginas que compartilham esse padrão:
- `Indicacoes.tsx` — links de e-mail/telefone: adicionar `min-w-0 break-all` no `<a>` e garantir `min-w-0` nos flex pais.
- `PedidosIndicacao.tsx`, `Negocios.tsx`, `Membros.tsx`, `MemberProfile.tsx`, `Profile.tsx`, `PublicProfile.tsx`, `Encontros.tsx` e o card "Próximos Encontros" do dashboard (`Index.tsx`, link do Google Meet) — aplicar `break-words`/`break-all` + `truncate` conforme o caso em e-mails, URLs de reunião e slugs públicos.
- Reforçar `min-w-0` em containers flex que contêm esses textos, para permitir o encolhimento.

Isso elimina a largura intrínseca excessiva e faz a página caber corretamente na tela do celular.

## Verificação
- Rodar checagem de overflow via Playwright em largura 390px na página pública `/auth` (única acessível no sandbox, pois o Supabase é externo) — deve permanecer sem offenders.
- Inspecionar visualmente Footer/Sidebar/Auth para confirmar que os logos carregam a partir de `/logo-gente-*.png`.
- `tsgo --noEmit` para garantir que a remoção dos imports `.asset.json` não quebrou tipos.

## Fora de escopo
Nenhuma mudança em lógica de negócio, RPCs, pontuação ou dados. Apenas caminhos de imagem, template de e-mail e classes utilitárias de layout.
