/**
 * @file PublicProfile.tsx
 * @description Página pública do perfil (/m/:slug), acessível externamente sem login e
 * indexável pelo Google. Layout "Executivo": card de perfil, faixa de KPIs, coluna
 * principal (sobre + cases) e coluna lateral (atividades recentes + CTA de conversão).
 * Inclui SEO completo (title/description/canonical/OpenGraph/Twitter) e dados
 * estruturados schema.org (ProfilePage + Person + BreadcrumbList).
 * Os dados vêm da RPC segura get_public_profile, liberada para o papel anônimo.
 * @copyright Ranktop / Gente Networking
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RichText from '@/components/RichText';
import { richTextToPlain } from '@/lib/rich-text';
import PublicProfileStats from '@/components/public/PublicProfileStats';
import PublicProfileCases from '@/components/public/PublicProfileCases';
import PublicProfileActivity from '@/components/public/PublicProfileActivity';
import {
  Loader2, Linkedin, Instagram, Globe, ArrowRight, UserX, Users,
} from 'lucide-react';

interface PublicProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  company: string | null;
  position: string | null;
  business_segment: string | null;
  bio: string | null;
  what_i_do: string | null;
  ideal_client: string | null;
  how_to_refer_me: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  slug: string | null;
  rank: string | null;
  team_name: string | null;
}

const LOGO = '/logo-gente-networking-branco.png';
const SITE_URL = 'https://comunidade.gentenetworking.com.br';
const OG_FALLBACK = `${SITE_URL}${LOGO}`;
const SIGNUP = '/auth?tab=signup';

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function truncate(text: string, max = 155) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Bloco de texto rico com recolhimento automático quando o conteúdo é longo. */
function ExpandableRich({
  value, label, tone = 'light',
}: { value: string; label: string; tone?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false);
  const isLong = richTextToPlain(value).length > 320;

  return (
    <div className={`min-w-0 rounded-xl p-4 ${tone === 'dark' ? '' : 'border border-slate-100 bg-slate-50'}`}>
      <h3 className={`mb-2 text-xs font-bold uppercase tracking-wide ${tone === 'dark' ? 'text-[#F7941D]' : 'text-[#F7941D]'}`}>
        {label}
      </h3>
      <RichText
        value={value}
        className={`text-sm leading-relaxed text-wrap-anywhere ${
          tone === 'dark'
            ? 'text-slate-200 [&_a]:text-[#F7941D] [&_a]:underline'
            : 'text-slate-600'
        } ${isLong && !open ? 'line-clamp-6' : ''}`}
      />
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-xs font-semibold text-[#1E3A5F] underline underline-offset-2 hover:text-[#F7941D]"
        >
          {open ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}

/** SEO + dados estruturados (schema.org) da página pública do perfil. */
function ProfileSEO({ profile, slug }: { profile: PublicProfileData | null; slug: string }) {
  const canonical = `${SITE_URL}/m/${slug}`;

  if (!profile) {
    return (
      <Helmet>
        <title>Perfil não disponível | Gente Networking</title>
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={canonical} />
      </Helmet>
    );
  }

  const name = profile.full_name || 'Membro';
  const roleLine = [profile.position, profile.company].filter(Boolean).join(' na ');
  const title = `${name}${roleLine ? ` — ${roleLine}` : ''} | Gente Networking`;
  const description = truncate(
    richTextToPlain(profile.bio) || richTextToPlain(profile.what_i_do) ||
    `${name} é membro do Gente Networking${profile.company ? `, atuando na ${profile.company}` : ''}. Conheça o perfil e conecte-se.`,
  );
  const image = profile.avatar_url || OG_FALLBACK;
  const sameAs = [profile.linkedin_url, profile.instagram_url, profile.website_url].filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      ...(profile.position ? { jobTitle: profile.position } : {}),
      ...(profile.company ? { worksFor: { '@type': 'Organization', name: profile.company } } : {}),
      ...(profile.avatar_url ? { image: profile.avatar_url } : {}),
      ...(profile.bio ? { description: richTextToPlain(profile.bio) } : {}),
      url: canonical,
      ...(sameAs.length ? { sameAs } : {}),
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Membros', item: `${SITE_URL}/membros` },
      { '@type': 'ListItem', position: 3, name, item: canonical },
    ],
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content="index, follow" />

      <meta property="og:type" content="profile" />
      <meta property="og:site_name" content="Gente Networking" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <script type="application/ld+json">{(() => { try { return JSON.stringify(jsonLd); } catch { return '{}'; } })()}</script>
      <script type="application/ld+json">{(() => { try { return JSON.stringify(breadcrumb); } catch { return '{}'; } })()}</script>

    </Helmet>
  );
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_public_profile', { _slug: slug || '' });
        if (!active) return;
        if (error) {
          console.error('[PublicProfile] RPC error:', error);
          setProfile(null);
        } else {
          const first = Array.isArray(data) && data.length ? (data[0] as PublicProfileData) : null;
          setProfile(first);
        }
      } catch (err) {
        console.error('[PublicProfile] fetch failed:', err);
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  const firstName = profile?.full_name?.split(' ')[0] || 'nossos membros';

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f4f8]">
      <ProfileSEO profile={loading ? null : profile} slug={slug || ''} />

      {/* Cabeçalho fixo com CTA persistente */}
      <header className="sticky top-0 z-30 bg-[#1E3A5F] shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <img src={LOGO} alt="Gente Networking" className="h-8 w-auto" />
          <Button asChild size="sm" className="bg-[#F7941D] text-white hover:bg-[#e0850f]">
            <Link to={SIGNUP}>Quero participar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 pb-24 md:pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
          </div>
        ) : !profile ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <UserX className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h1 className="mb-2 text-xl font-semibold text-[#1E3A5F]">Perfil não disponível</h1>
            <p className="mb-6 text-slate-500">
              Este perfil não existe ou ainda não foi publicado pelo membro.
            </p>
            <Button asChild className="bg-[#1E3A5F] hover:bg-[#2d4a6f]">
              <Link to={SIGNUP}>Conheça o Gente Networking</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Card principal do perfil */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div
                className="relative h-32 bg-[#1E3A5F]"
                style={profile.banner_url ? {
                  backgroundImage: `url(${profile.banner_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : undefined}
              >
                <div className="absolute -bottom-12 left-6 rounded-2xl bg-white p-1 shadow-md sm:left-8">
                  <Avatar className="h-24 w-24 rounded-xl">
                    <AvatarImage src={profile.avatar_url || ''} className="rounded-xl object-cover" />
                    <AvatarFallback className="rounded-xl text-2xl">{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="flex flex-col gap-6 px-6 pb-8 pt-16 sm:px-8 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-[#1E3A5F] text-wrap-anywhere">{profile.full_name}</h1>
                    {profile.rank && (
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F7941D]">
                        {profile.rank}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-slate-500 text-wrap-anywhere">
                    {[profile.position, profile.company].filter(Boolean).join(' • ')}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {profile.business_segment && (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600 text-wrap-anywhere">
                        {profile.business_segment}
                      </span>
                    )}
                    {profile.team_name && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        <Users className="h-3 w-3" /> {profile.team_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <div className="flex gap-2">
                    {profile.linkedin_url && (
                      <a
                        href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:text-[#1E3A5F]"
                      ><Linkedin className="h-4 w-4" /></a>
                    )}
                    {profile.instagram_url && (
                      <a
                        href={profile.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:text-[#1E3A5F]"
                      ><Instagram className="h-4 w-4" /></a>
                    )}
                    {profile.website_url && (
                      <a
                        href={profile.website_url} target="_blank" rel="noopener noreferrer" aria-label="Site"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:text-[#1E3A5F]"
                      ><Globe className="h-4 w-4" /></a>
                    )}
                  </div>
                  <Button asChild className="rounded-xl bg-[#F7941D] px-8 font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-[#e0850f]">
                    <Link to={SIGNUP}>Conectar agora</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Faixa de KPIs */}
            <PublicProfileStats slug={slug || ''} />

            {/* Grid principal */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {(profile.bio || profile.what_i_do || profile.ideal_client) && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                    <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-[#1E3A5F]">
                      <span className="h-5 w-1 rounded-full bg-[#F7941D]" />
                      Sobre o especialista
                    </h2>
                    {profile.bio && (
                      <RichText
                        value={profile.bio}
                        className="max-w-prose text-[15px] leading-relaxed text-slate-600 text-wrap-anywhere [&_p]:mb-3 [&_li]:mb-1"
                      />
                    )}
                    {(profile.what_i_do || profile.ideal_client) && (
                      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {profile.what_i_do && <ExpandableRich value={profile.what_i_do} label="O que eu faço" />}
                        {profile.ideal_client && <ExpandableRich value={profile.ideal_client} label="Cliente ideal" />}
                      </div>
                    )}
                  </section>
                )}

                <PublicProfileCases slug={slug || ''} />
              </div>

              {/* Coluna lateral */}
              <div className="space-y-6">
                <PublicProfileActivity slug={slug || ''} />

                {profile.how_to_refer_me && (
                  <div className="rounded-2xl bg-[#1E3A5F] p-6 text-white">
                    <ExpandableRich value={profile.how_to_refer_me} label="Como me indicar" tone="dark" />
                  </div>
                )}

                <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
                  <h2 className="mb-2 text-lg font-bold text-[#1E3A5F]">Faça parte do Gente</h2>
                  <p className="mb-6 text-sm text-slate-500">
                    Conecte-se com especialistas como {firstName} e gere mais negócios.
                  </p>
                  <Button asChild className="w-full rounded-xl bg-[#F7941D] py-6 font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-[#e0850f]">
                    <Link to={SIGNUP}>Quero participar</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Banner final de conversão */}
            <section className="rounded-2xl bg-[#1E3A5F] p-10 text-center text-white">
              <h2 className="mb-2 text-2xl font-bold">Quer acelerar seu networking?</h2>
              <p className="mx-auto mb-8 max-w-lg text-white/80">
                Junte-se ao Gente Networking, conecte-se com profissionais como {firstName} e
                fortaleça sua rede de relacionamentos.
              </p>
              <Button asChild size="lg" className="rounded-full bg-[#F7941D] px-10 font-bold text-white hover:bg-[#e0850f]">
                <Link to={SIGNUP}>Quero me cadastrar <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </section>
          </>
        )}
      </main>

      {/* CTA fixo no mobile */}
      {!loading && profile && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
          <Button asChild className="w-full rounded-xl bg-[#F7941D] font-bold text-white hover:bg-[#e0850f]">
            <Link to={SIGNUP}>Quero participar do Gente</Link>
          </Button>
        </div>
      )}

      <footer className="bg-[#1E3A5F] text-white/80">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-sm">
          <img src={LOGO} alt="Gente Networking" className="mx-auto mb-3 h-7 w-auto opacity-90" />
          <p>Gente Networking — Conectando pessoas, gerando negócios.</p>
        </div>
      </footer>
    </div>
  );
}
