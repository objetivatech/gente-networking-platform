/**
 * @file PublicProfile.tsx
 * @description Página pública do perfil (/m/:slug), acessível externamente sem login e
 * indexável pelo Google. Exibe as informações profissionais do membro (quando publicado)
 * com a identidade visual do Gente (cabeçalho e rodapé), SEO completo (title/description/
 * canonical/OpenGraph/Twitter), dados estruturados schema.org (ProfilePage + Person +
 * BreadcrumbList) e imagem OG usando a foto do perfil. Uma chamada para inscrição direciona
 * para o formulário de cadastro existente (/auth?tab=signup).
 * Os dados vêm da RPC segura get_public_profile, liberada para o papel anônimo.
 * @copyright Ranktop / Gente Networking
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Briefcase, Target, Megaphone, Linkedin, Instagram, Globe,
  ArrowRight, UserX,
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

const LOGO = '/logo-gente-networking.png';
const SITE_URL = 'https://comunidade.gentenetworking.com.br';
const OG_FALLBACK = `${SITE_URL}${LOGO}`;

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function truncate(text: string, max = 155) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
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
    profile.bio || profile.what_i_do ||
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
      ...(profile.bio ? { description: profile.bio } : {}),
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

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
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
      const { data } = await supabase.rpc('get_public_profile', { _slug: slug || '' });
      if (!active) return;
      setProfile((data && data[0]) ? (data[0] as PublicProfileData) : null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {!loading && <ProfileSEO profile={profile} slug={slug || ''} />}
      {/* Cabeçalho */}
      <header className="bg-gradient-to-r from-[#1E3A5F] to-[#2d4a6f]">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <img src={LOGO} alt="Gente Networking" className="h-9 w-auto" />
          <Button asChild size="sm" className="bg-[#F7941D] hover:bg-[#e0850f] text-white">
            <Link to="/auth?tab=signup">Quero participar</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
          </div>
        ) : !profile ? (
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="py-12">
              <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-60" />
              <h1 className="text-xl font-semibold mb-2">Perfil não disponível</h1>
              <p className="text-muted-foreground mb-6">
                Este perfil não existe ou ainda não foi publicado pelo membro.
              </p>
              <Button asChild className="bg-[#1E3A5F] hover:bg-[#2d4a6f]">
                <Link to="/auth?tab=signup">Conheça o Gente Networking</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Título da página */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A5F]">
                Membro do Gente Networking
              </h1>
              {profile.team_name && (
                <p className="text-muted-foreground mt-1">
                  Grupo <span className="font-semibold text-[#F7941D]">{profile.team_name}</span>
                </p>
              )}
            </div>

            {/* Banner + cabeçalho do perfil */}
            <Card className="overflow-hidden">
              <div
                className="h-32 sm:h-40 bg-gradient-to-r from-[#1E3A5F] to-[#2d4a6f]"
                style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              />
              <CardContent className="pt-0">
                <div className="flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left gap-4">
                  <Avatar className="h-24 w-24 border-4 border-background -mt-12 shrink-0">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className="text-2xl">{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="pt-2 sm:pb-1">
                    <h2 className="text-2xl font-bold text-[#1E3A5F]">{profile.full_name}</h2>
                    <p className="text-muted-foreground">
                      {[profile.position, profile.company].filter(Boolean).join(' • ')}
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                      {profile.business_segment && <Badge variant="secondary">{profile.business_segment}</Badge>}
                      {profile.rank && <Badge className="bg-[#F7941D] text-white hover:bg-[#F7941D]">{profile.rank}</Badge>}
                    </div>
                  </div>
                </div>

                {profile.bio && (
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                )}

                {/* Redes / site */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {profile.linkedin_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"><Linkedin className="mr-1.5 h-4 w-4" /> LinkedIn</a>
                    </Button>
                  )}
                  {profile.instagram_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer"><Instagram className="mr-1.5 h-4 w-4" /> Instagram</a>
                    </Button>
                  )}
                  {profile.website_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.website_url} target="_blank" rel="noopener noreferrer"><Globe className="mr-1.5 h-4 w-4" /> Site</a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações profissionais */}
            <div className="grid md:grid-cols-3 gap-4">
              {profile.what_i_do && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="h-4 w-4 text-[#F7941D]" /> O que eu faço</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{profile.what_i_do}</p></CardContent>
                </Card>
              )}
              {profile.ideal_client && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-[#F7941D]" /> Cliente Ideal</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{profile.ideal_client}</p></CardContent>
                </Card>
              )}
              {profile.how_to_refer_me && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-[#F7941D]" /> Como me indicar</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{profile.how_to_refer_me}</p></CardContent>
                </Card>
              )}
            </div>

            {/* CTA de inscrição */}
            <Card className="bg-gradient-to-r from-[#1E3A5F] to-[#2d4a6f] text-white border-0">
              <CardContent className="py-8 text-center">
                <h2 className="text-xl font-bold mb-2">Faça parte do Gente Networking</h2>
                <p className="text-white/80 mb-6 max-w-lg mx-auto">
                  Conecte-se com profissionais como {profile.full_name?.split(' ')[0]}, gere negócios e
                  fortaleça sua rede de relacionamentos.
                </p>
                <Button asChild size="lg" className="bg-[#F7941D] hover:bg-[#e0850f] text-white">
                  <Link to="/auth?tab=signup">Quero me cadastrar <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Rodapé */}
      <footer className="bg-[#1E3A5F] text-white/80">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm">
          <img src={LOGO} alt="Gente Networking" className="h-7 w-auto mx-auto mb-3 opacity-90" />
          <p>Gente Networking — Conectando pessoas, gerando negócios.</p>
        </div>
      </footer>
    </div>
  );
}
