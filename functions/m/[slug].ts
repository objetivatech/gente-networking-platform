/**
 * Cloudflare Pages Function — Meta tags no edge para páginas públicas de perfil
 *
 * Intercepta as requisições para /m/:slug e injeta as meta tags de SEO/OpenGraph
 * (title, description, canonical, og:*, twitter:*, JSON-LD) diretamente no HTML
 * base (index.html) usando HTMLRewriter. Isso garante que crawlers que NÃO
 * executam JavaScript (WhatsApp, LinkedIn, Facebook, etc.) enxerguem os dados
 * reais do membro — inclusive a foto do perfil como imagem OG.
 *
 * A SPA continua responsável por renderizar a página no cliente; aqui apenas
 * reescrevemos o <head>.
 *
 * Variáveis de ambiente necessárias no Cloudflare Pages:
 *   - SUPABASE_URL       (ex.: https://vyfkddcbmwlwldaorxzy.supabase.co)
 *   - SUPABASE_ANON_KEY  (chave anônima pública do projeto)
 *
 * @copyright Ranktop / Gente Networking
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

interface PublicProfile {
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  position: string | null;
  bio: string | null;
  what_i_do: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  slug: string | null;
}

const SITE_URL = 'https://comunidade.gentenetworking.com.br';
const LOGO = `${SITE_URL}/logo-gente-networking.png`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

async function fetchProfile(env: Env, slug: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_public_profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ _slug: slug }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PublicProfile[];
    return Array.isArray(data) && data.length ? data[0] : null;
  } catch {
    return null;
  }
}

/** Reescreve o <head> do HTML base com as meta tags do perfil. */
class HeadRewriter {
  private readonly tags: string;

  constructor(tags: string) {
    this.tags = tags;
  }

  element(element: Element) {
    element.append(this.tags, { html: true });
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, params, env, next } = context;
  const slug = String(params.slug || '');

  // Busca o HTML base servido pela SPA.
  const assetResponse = await next();
  const contentType = assetResponse.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return assetResponse;
  }

  const profile = slug ? await fetchProfile(env, slug) : null;
  const canonical = `${SITE_URL}/m/${slug}`;

  let tags: string;

  if (!profile) {
    tags = [
      `<title>Perfil não disponível | Gente Networking</title>`,
      `<meta name="robots" content="noindex, follow" />`,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    ].join('\n');
  } else {
    const name = profile.full_name || 'Membro';
    const roleLine = [profile.position, profile.company].filter(Boolean).join(' na ');
    const title = `${name}${roleLine ? ` — ${roleLine}` : ''} | Gente Networking`;
    const description = truncate(
      profile.bio ||
        profile.what_i_do ||
        `${name} é membro do Gente Networking${profile.company ? `, atuando na ${profile.company}` : ''}. Conheça o perfil e conecte-se.`,
    );
    const image = profile.avatar_url || LOGO;
    const sameAs = [profile.linkedin_url, profile.instagram_url, profile.website_url].filter(
      Boolean,
    ) as string[];

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name,
        ...(profile.position ? { jobTitle: profile.position } : {}),
        ...(profile.company
          ? { worksFor: { '@type': 'Organization', name: profile.company } }
          : {}),
        ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
        ...(profile.bio ? { description: profile.bio } : {}),
        url: canonical,
        ...(sameAs.length ? { sameAs } : {}),
      },
    };

    tags = [
      `<title>${escapeHtml(title)}</title>`,
      `<meta name="description" content="${escapeHtml(description)}" />`,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      `<meta name="robots" content="index, follow" />`,
      `<meta property="og:type" content="profile" />`,
      `<meta property="og:site_name" content="Gente Networking" />`,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    ].join('\n');
  }

  return new HTMLRewriter()
    .on('head', new HeadRewriter(tags))
    .transform(assetResponse);
};
