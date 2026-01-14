# Guia de Atualização da Documentação

Este documento estabelece as práticas para manter a documentação do sistema sempre atualizada.

## Quando Atualizar

A documentação deve ser atualizada **sempre** que:

1. **Novos recursos são adicionados**
   - Adicionar seção na página `/documentacao` explicando o recurso
   - Incluir guia passo a passo de uso
   - Adicionar entrada no changelog

2. **Recursos existentes são modificados**
   - Atualizar a documentação correspondente
   - Adicionar entrada no changelog descrevendo a mudança

3. **Regras de pontuação são alteradas**
   - Atualizar valores em `src/components/ScoringRulesCard.tsx`
   - Atualizar valores em `src/pages/Documentacao.tsx`
   - Atualizar valores em `src/pages/Index.tsx` (dashboard)
   - Adicionar entrada no changelog

4. **Políticas de segurança ou privacidade mudam**
   - Atualizar seções de RLS e permissões na documentação
   - Adicionar entrada no changelog
   - Notificar usuários se necessário

## Arquivos a Serem Atualizados

### Documentação de Uso
- `src/pages/Documentacao.tsx` - Guias de uso, fluxos e referências

### Dados de Gamificação
- `src/components/ScoringRulesCard.tsx` - Valores corretos de pontuação
- `src/pages/Index.tsx` - Valores na dashboard
- `src/pages/Documentacao.tsx` - Valores na documentação

### Changelog
- Adicionar entrada via SQL no banco `system_changelog`
- Incluir versão, título, descrição, lista de mudanças e categoria

### Documentação Técnica
- `docs/TECHNICAL_DOCUMENTATION.md` - Arquitetura e decisões técnicas
- `docs/PWA_IMPLEMENTATION.md` - Detalhes de PWA
- `docs/CLOUDFLARE_PAGES_DEPLOY.md` - Processo de deploy

## Como Adicionar no Changelog

Execute o SQL no banco de dados:

```sql
INSERT INTO system_changelog (version, title, description, changes, category, created_at)
VALUES (
  'X.Y.Z',
  'Título da Mudança',
  'Descrição detalhada da mudança',
  '["Mudança 1", "Mudança 2", "Mudança 3"]'::jsonb,
  'release', -- ou 'feature', 'fix', 'improvement'
  NOW()
);
```

## Categorias do Changelog

- **release**: Lançamentos principais com múltiplas mudanças
- **feature**: Novos recursos
- **fix**: Correções de bugs
- **improvement**: Melhorias em recursos existentes

## Template para Documentação de Recurso

Ao adicionar um novo recurso na documentação, use este template:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <IconeDoRecurso className="h-5 w-5" />
      Nome do Recurso
    </CardTitle>
  </CardHeader>
  <CardContent className="prose dark:prose-invert max-w-none">
    <p>Descrição breve do recurso.</p>

    <h4 className="font-semibold mt-4">Como usar:</h4>
    <ol>
      <li>Passo 1</li>
      <li>Passo 2</li>
      <li>Passo 3</li>
    </ol>

    <p className="text-sm text-muted-foreground mt-4">
      <strong>Nota:</strong> Informações importantes ou restrições.
    </p>
  </CardContent>
</Card>
```

## Checklist de Atualização

Ao fazer mudanças no sistema, verifique:

- [ ] Documentação de uso atualizada
- [ ] Valores de gamificação consistentes em todos os arquivos
- [ ] Entrada adicionada no changelog
- [ ] Documentação técnica atualizada (se aplicável)
- [ ] Comentários no código atualizados
- [ ] README atualizado (se aplicável)

## Responsabilidades

- **Desenvolvedores**: Devem atualizar a documentação ao implementar mudanças
- **Administradores**: Podem adicionar entradas no changelog via interface (futuro)
- **Todos**: Devem reportar inconsistências na documentação

## Contato

Para sugestões de melhorias neste processo, contate a equipe de desenvolvimento.
