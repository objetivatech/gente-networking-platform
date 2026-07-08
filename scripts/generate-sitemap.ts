/**
 * Gerador de sitemap.xml
 *
 * Executado nos hooks `predev` e `prebuild`. Gera public/sitemap.xml com as
 * rotas públicas estáticas e as páginas públicas de perfil dos membros
 * (/m/:slug) que estão ativas e com o perfil publicado.
 *
 * Os slugs são obtidos via RPC pública `get_public_profile_slugs` no Supabase.
 * Se a consulta falhar (ex.: variáveis de ambiente ausentes em ambiente local),
 * o sitemap é gerado apenas com as rotas estáticas — o build nunca quebra.
 *
 * @copyright Ranktop / Gente Networking
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = 'https://comunidade.gentenetworking.com.br';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://vyfkddcbmwlwldaorxzy.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

interface SitemapEntry {
  path: string;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/auth', changefreq: 'monthly', priority: '0.8' },
  { path: '/instalar', changefreq: 'monthly', priority: '0.5' },
];

async function fetchPublicSlugs(): Promise<string[]> {
  if (!SUPABASE_ANON_KEY) {
    console.warn('[sitemap] SUPABASE anon key ausente — gerando apenas rotas estáticas.');
    return [];
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_profile_slugs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: '{}',
    });
    if (!res.ok) {
      console.warn(`[sitemap] RPC falhou (${res.status}) — apenas rotas estáticas.`);
      return [];
    }
    const rows = (await res.json()) as Array<{ slug: string | null }>;
    return rows.map((r) => r.slug).filter((s): s is string => !!s);
  } catch (err) {
    console.warn('[sitemap] erro ao buscar slugs — apenas rotas estáticas.', err);
    return [];
  }
}

function buildXml(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      '  <url>',
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

async function main() {
  const slugs = await fetchPublicSlugs();
  const profileEntries: SitemapEntry[] = slugs.map((slug) => ({
    path: `/m/${slug}`,
    changefreq: 'monthly',
    priority: '0.7',
  }));
  const entries = [...staticEntries, ...profileEntries];
  writeFileSync(resolve('public/sitemap.xml'), buildXml(entries));
  console.log(`[sitemap] gerado com ${entries.length} URLs (${profileEntries.length} perfis).`);
}

main();
