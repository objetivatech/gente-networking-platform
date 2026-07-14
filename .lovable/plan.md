## Diagnóstico objetivo

Os prints mostram problemas que não são mais de “overflow global”, mas de composição interna dos cards em telas estreitas:

1. **Home**
   - O `ActivityFeed` ainda usa textos em `truncate` dentro de estruturas aninhadas com `ScrollArea`; isso corta nomes, descrições e pode empurrar a área interna.
   - O `ScoringRulesCard compact` usa `grid-cols-2` e coloca pontuação + descrição na mesma linha, o que causa textos amontoados.

2. **Membros**
   - A badge de `business_segment` usa o `Badge` global, mas o texto está direto dentro de um `inline-flex`. Em segmentos longos, a badge ainda não ganha uma área real de quebra.
   - O modal do membro repete o mesmo padrão no campo “Segmento”.

3. **Aniversariantes**
   - O cabeçalho do seletor mensal está em uma única linha: botões, mês e contador. Em mobile, o contador vira um círculo grande e quebra palavras como “aniversariantes”.

4. **Gente em Ação**
   - Cada reunião é um card horizontal com avatar à esquerda e data/excluir à direita. No mobile, sobra uma coluna estreita para nome, empresa, observações e imagem, causando cortes e textos empilhados.

5. **Indicações**
   - O card mistura avatar, nome do membro, data, badge, dados do contato e texto da indicação em uma mesma região visual. A badge de status pode quebrar palavra curta (“Quente”), e a indicação perde espaço útil.

6. **MatchMaking**
   - Hoje o motor gera motivos simples: cliente ideal, tags comuns, mesmo segmento e perfil completo.
   - Ele ainda não diferencia **serviços iguais** de **negócios complementares**, nem transforma compatibilidade em hipótese prática de parceria, oferta conjunta ou troca de contatos.

---

## Plano de implementação

### 1. Reforço dos utilitários responsivos sem mascarar overflow

Manter a regra já aprovada: **não usar `overflow-x: hidden` global**.

Ajustar apenas padrões locais:

- Aplicar `min-w-0`, `max-w-full`, `text-wrap-anywhere` e `leading-snug` nos pontos onde há conteúdo de usuário.
- Criar um padrão reutilizável para badges longas quando necessário:
  - badge com `h-auto`, `items-start`, `text-left`, `leading-snug`;
  - texto interno em `<span className="min-w-0 text-wrap-anywhere">...`.
- Usar `whitespace-nowrap` somente para badges curtas e controladas, como status “Frio”, “Morno”, “Quente” e pontuações pequenas.

Arquivos envolvidos:
- `src/index.css` se for necessário criar um utilitário específico para badges longas.
- `src/components/ui/badge.tsx` somente se a correção global for segura; caso contrário, ajustar localmente.

---

### 2. Home: feed e sistema de pontuação

#### ActivityFeed

Alterar `src/components/ActivityFeed.tsx` para:

- Garantir que `Card`, `CardContent`, `ScrollArea`, itens e wrappers internos usem `w-full min-w-0 max-w-full`.
- Trocar `truncate` em título/descrição por uma abordagem mobile-safe:
  - título com `line-clamp-2` ou quebra natural;
  - descrição com `line-clamp-2` e `text-wrap-anywhere`.
- Preservar a altura rolável do feed, mas impedir que o conteúdo interno crie largura maior que o card.

#### Sistema de Pontuação

Alterar `src/components/ScoringRulesCard.tsx` e o bloco de ranking em `src/pages/Index.tsx`:

- Em modo `compact`, cada regra passa a ter estrutura em duas linhas:

```text
[ícone] 25 pts
        por reunião 1-a-1
```

- Usar `grid-cols-1 xs:grid-cols-2 sm:grid-cols-3` para as regras compactas.
- Nas descrições longas, permitir quebra limpa com `text-wrap-anywhere` e `leading-snug`.
- No ranking, usar grade mais tolerante em telas pequenas: `grid-cols-2 xs:grid-cols-3 sm:grid-cols-5`, evitando cards estreitos demais.

Resultado esperado:
- Feed sem transbordar.
- Tabela de gamificação legível, sem sobreposição de texto.

---

### 3. Membros: badges de segmento quebrando corretamente

Alterar `src/pages/Membros.tsx`:

- No `MemberCard`, renderizar `business_segment` como badge longa:

```text
[ Segmento de negócio longo pode quebrar em duas ou mais linhas dentro do card ]
```

- Aplicar o mesmo padrão no modal do membro.
- Revisar também nome, cargo, empresa e grupo para manter `min-w-0`/`text-wrap-anywhere` nos containers certos.
- Manter visual atual e ranking/facilitador sem redesign.

Resultado esperado:
- Tipos de negócio longos não empurram nem cortam o card.
- Badge fica visualmente aceitável mesmo com duas linhas.

---

### 4. Aniversariantes: seletor mensal compacto e elegante

Alterar `src/pages/Aniversarios.tsx`:

- Transformar o cabeçalho do mês em layout responsivo:
  - no desktop: controles, mês e contador na mesma linha;
  - no mobile: mês em destaque e controles/contador em linha separada.
- Reduzir o contador para formato curto no mobile:
  - `3 anivers.` em telas pequenas;
  - `3 aniversariantes` em telas maiores.
- Evitar que o contador vire círculo grande ou quebre palavras.
- Ajustar os cards dos aniversariantes com `min-w-0`, avatar um pouco menor em mobile e textos com `truncate` controlado.

Resultado esperado:
- Seletor do mês proporcional e sem aparência “quebrada”.

---

### 5. Gente em Ação: cards com conteúdo distribuído no card inteiro

Alterar `src/pages/GenteEmAcao.tsx`:

- Redesenhar cada card de reunião para mobile-first:

```text
[avatar] Nome do contato        [data] [excluir]
         [badge Membro/Externo]

Empresa / organização
Observações da reunião ocupando a largura total
Foto do encontro ocupando largura adequada
```

- Em mobile, o conteúdo deixa de competir com a coluna de data/excluir.
- Em desktop, manter aparência compacta, mas com melhor hierarquia.
- Aplicar `text-wrap-anywhere` em nome, empresa e observações.
- Ajustar a imagem para ter `max-w-full`, altura controlada e não estreitar o texto.

Resultado esperado:
- Cards legíveis, sem texto amontoado ou cortado.
- Registro visualmente mais parecido com app mobile.

---

### 6. Indicações: redesenho dos cards recebidos/enviados

Alterar `src/pages/Indicacoes.tsx`:

Criar uma composição mais clara para `ReferralCard`:

```text
Cabeçalho do card
[foto] De/Para: Nome do membro       [status]
       Data                          [excluir se enviada]

Corpo do card
Contato indicado
Telefone / email
Texto da indicação / observações

Ações
Atualizar status: [Frio] [Morno] [Quente]
```

Ajustes específicos:

- Cabeçalho separado do corpo com `border-b` ou área de fundo sutil.
- Nome do membro e data ficam isolados do texto da indicação.
- Status badge curta usa `whitespace-nowrap` para não quebrar “Quente”.
- Dados do contato e observações ocupam a largura completa do card.
- Botões de status ficam em grid de 3 colunas com texto centralizado e sem sobreposição.
- Preservar exportação, abas e mecânica de atualização de status.

Resultado esperado:
- Cards mais limpos e legíveis.
- A indicação em si passa a ter prioridade visual.

---

## Evolução proposta do MatchMaking

### Objetivo

Transformar o MatchMaking de uma lista de “motivos de compatibilidade” em uma ferramenta com **hipóteses práticas de conexão**, incluindo:

1. **Indicação de serviço**
   - Quando um membro atende exatamente o tipo de cliente que outro procura.

2. **Parceria complementar**
   - Quando os serviços não são iguais, mas podem formar uma oferta conjunta.
   - Exemplo: SEO + desenvolvimento web, contabilidade + jurídico, fotografia + eventos, marketing + design.

3. **Troca de contatos / base compatível**
   - Quando ambos atendem públicos parecidos, mas vendem soluções diferentes.

4. **Oferta conjunta ao mercado**
   - Quando os perfis permitem sugerir um pacote de serviço ou abordagem comercial combinada.

---

### Como implementar sem IA externa nesta etapa

Criar um motor determinístico em `src/lib/matchmaking-rules.ts`, usando os campos já existentes:

- `what_i_do`
- `ideal_client`
- `business_segment`
- `tags`
- `company`
- `position`

O motor faria:

1. **Inferência de categorias de serviço**
   - Mapear palavras-chave para categorias como:
     - marketing, SEO, tráfego, branding, design, vídeo, tecnologia, jurídico, contábil, financeiro, RH, saúde, eventos, arquitetura, imóveis, educação, seguros, consultoria etc.

2. **Mapa de complementaridade**
   - Definir pares de categorias que costumam gerar parceria.
   - Exemplo:

```text
SEO + desenvolvimento web => pacote de site com aquisição orgânica
Contabilidade + jurídico => regularização e estruturação empresarial
RH + treinamento => desenvolvimento de equipes
Design + social media => presença digital completa
Fotografia + eventos => cobertura e produção para experiências presenciais
```

3. **Análise de público-alvo compatível**
   - Comparar palavras do `ideal_client` de ambos.
   - Se ambos atendem “clínicas”, “empresas”, “empreendedores”, “imobiliárias”, “indústrias”, etc., gerar insight de base compatível.

4. **Novos campos no `MatchSuggestion`**

```text
matchType: "indicacao" | "parceria" | "troca_base" | "segmento" | "tags"
partnershipScore: number
opportunityTitle: string
opportunityDescription: string
opportunityIdeas: string[]
```

5. **Pontuação complementar ao score atual**
   - Manter o score existente para não quebrar a lógica.
   - Adicionar bônus moderado para complementaridade real:
     - +30 parceria complementar forte;
     - +20 público-alvo compatível;
     - +15 troca de contatos provável;
     - +10 oferta conjunta possível.

6. **Cards de MatchMaking mais úteis**

Cada card deixaria de mostrar apenas badges como:

```text
Compatível com seu cliente ideal
Mesmo segmento de negócio
```

E passaria a mostrar algo como:

```text
Oportunidade: Parceria complementar
SEO + Desenvolvimento Web podem gerar uma oferta conjunta para empresas que precisam captar leads pelo site.

Possíveis próximos passos:
- Trocar cases de clientes atendidos
- Mapear clientes que precisam do serviço complementar
- Criar uma oferta conjunta para clínicas e empresas locais
```

---

### Escopo controlado para a primeira versão

Implementar agora:

- Motor determinístico sem custo externo.
- Novos insights nos cards de MatchMaking.
- Priorização visual das oportunidades de parceria.
- Preservar a ação “Já conectei”, a criação de Gente em Ação e os +10 pontos.
- Sem novas tabelas, sem alteração de RLS, sem edge function e sem IA generativa nesta etapa.

Deixar como evolução futura:

- IA para gerar textos personalizados por membro.
- Registro de “interesse em parceria”.
- Funil de oportunidades colaborativas.
- Histórico de troca de contatos.
- Métrica de conversão das conexões sugeridas.

---

## Validação

Após implementação, validar com Playwright nas larguras:

- 360px
- 390px
- 768px
- desktop padrão

Critérios mínimos:

- `document.documentElement.scrollWidth === document.documentElement.clientWidth` nas páginas afetadas.
- Home sem feed transbordando.
- Gamificação sem texto sobreposto.
- Segmentos em Membros quebrando dentro da badge.
- Seletor de aniversariantes proporcional no mobile.
- Cards de Gente em Ação usando a largura total.
- Cards de Indicações com cabeçalho separado e corpo legível.
- MatchMaking exibindo oportunidades complementares sem alterar pontuação existente de gamificação.

---

## Arquivos previstos

- `src/components/ActivityFeed.tsx`
- `src/components/ScoringRulesCard.tsx`
- `src/pages/Index.tsx`
- `src/pages/Membros.tsx`
- `src/pages/Aniversarios.tsx`
- `src/pages/GenteEmAcao.tsx`
- `src/pages/Indicacoes.tsx`
- `src/hooks/useMatchmaking.ts`
- `src/pages/Matchmaking.tsx`
- `src/lib/matchmaking-rules.ts` novo arquivo utilitário
- `src/index.css` somente se for necessário adicionar utilitário local de quebra/estrutura

---

## Fora do escopo nesta entrega

- Alterar regras de pontuação.
- Alterar banco, RLS, migrations ou roles.
- Alterar segurança/PII.
- Recriar layout inteiro do app.
- Adicionar IA externa ou cobrança por uso.
- Alterar Cloudflare, Supabase Functions ou deploy.