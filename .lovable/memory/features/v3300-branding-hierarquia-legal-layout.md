---
name: v3.30.0 Hierarquia de marca + páginas legais no layout
description: Login exibe logo Gente Networking (marca do negócio) com título "Gente Comunidade" (produto); páginas LGPD movidas para dentro do MainLayout (exigem autenticação). E-mails já usavam logo Networking.
type: feature
---

- **Auth (`src/pages/Auth.tsx`)**: `logoGente` agora aponta para `/logo-gente-networking-branco.png`; CardTitle exibe "Gente Comunidade" como nome do produto abaixo do logo da marca.
- **Legais no app (`src/App.tsx`)**: `/termos-de-uso`, `/politica-de-privacidade` e `/politica-de-cookies` movidas para dentro do `<Route element={<MainLayout />}>` — herdam Sidebar/Header/Footer e exigem sessão autenticada.
- **Componentes legais** (`src/pages/legal/*.tsx`): removido wrapper `<main className="min-h-screen bg-background">` já que o `MainLayout` provê o container.
- **E-mails**: confirmado que `supabase/functions/_shared/email-templates.ts` (linha 6) já usa `/logo-gente-networking.png` em todos os templates.
- **Regra de branding**: Gente Networking = marca do negócio (login, e-mails, páginas externas/públicas). Gente Comunidade = produto (título dentro do app, sidebar, cartão do membro, footer).
