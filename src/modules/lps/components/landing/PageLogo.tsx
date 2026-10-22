/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
interface PageLogoProps {
  logoUrl?: string;
  pageName: string;
}

export function PageLogo({ logoUrl, pageName }: PageLogoProps) {
  if (!logoUrl || logoUrl.trim() === '') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-background shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center">
        <img
          src={logoUrl}
          alt={`Logo ${pageName}`}
          className="h-10 sm:h-12 w-auto object-contain"
          onError={(e) => {
            console.error('Erro ao carregar logo:', logoUrl);
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
}
