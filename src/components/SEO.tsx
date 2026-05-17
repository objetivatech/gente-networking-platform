/**
 * SEO Helmet — per-route meta tags
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 */

import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://comunidadegente.lovable.app';

interface SEOProps {
  title: string;
  description: string;
  path?: string;
}

export default function SEO({ title, description, path }: SEOProps) {
  const location = useLocation();
  const url = `${BASE_URL}${path ?? location.pathname}`;
  const fullTitle = title.includes('Gente Networking') ? title : `${title} | Gente Networking`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
