---
name: v3.28.0 Menu admin + LGPD + PWA + Guia CRM
description: Filtro de menu para administrador focar em gestão; banner LGPD + páginas legais (Termos/Privacidade/Cookies) no rodapé; ícones PWA regerados a partir do logo Gente Comunidade; painel de ingestão no /admin/crm + docs CRM_INGESTAO_LEADS, INTEGRACAO_LPS_GENTE, INTEGRACAO_WORDPRESS e UI_UX_GUIDELINES; correção de user_id ambíguo em get_members_health_scores
type: feature
---

- **Menu admin focado**: `Sidebar.tsx` ganha `hiddenForRoles`; admin não vê Feed, MatchMaking, Ranking, Gente em Ação, Indicações, Negócios, Depoimentos, Conselho, Oportunidades, Pedidos de Indicação, Aniversários (rotas continuam acessíveis por URL). `BottomNav` já era segregado por papel.
- **LGPD**: `src/components/LgpdBanner.tsx` (consent em `gente:lgpd-consent:v1`), páginas `src/pages/legal/{TermosDeUso,PoliticaPrivacidade,PoliticaCookies}.tsx` com Helmet+canonical; rotas públicas `/termos-de-uso`, `/politica-de-privacidade`, `/politica-de-cookies`; links no `Footer.tsx`.
- **PWA**: ícones regerados via PIL a partir de `gente-comunidade-cor.png` sobre fundo `#1E3A5F` — `public/icons/icon-*.png` (72–512) + `icon-maskable-{192,512}` + `apple-touch-icon.png` + `favicon-{16,32}x{16,32}.png`.
- **CRM guia de ingestão**: accordion "Como os leads chegam ao CRM?" em `AdminCrm.tsx` antes dos filtros, referenciando origens (`lp_gentehub`, `lp_participe`, `lp_networking`, `site_elementor`, `api`, `convite_manual`) e apontando para docs.
- **Docs**: `docs/CRM_INGESTAO_LEADS.md`, `docs/INTEGRACAO_LPS_GENTE.md`, `docs/INTEGRACAO_WORDPRESS.md`, `docs/UI_UX_GUIDELINES.md`.
- **Bug fix**: `get_members_health_scores` reescrita com aliases explícitos + `#variable_conflict use_column` (Health Score do admin voltou a carregar).
- **Changelog**: entrada v3.28.0 inserida em `system_changelog`.
