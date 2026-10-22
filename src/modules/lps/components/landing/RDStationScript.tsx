/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect } from 'react';
import { RD_STATION_SCRIPT_URL } from '@/modules/lps/lib/constants';

export function RDStationScript() {
  useEffect(() => {
    // Keep the existing GTM container. Meta is managed inside GTM, never injected here.
    if (!document.getElementById('gente-lps-gtm') && !document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
      const target = window as Window & { dataLayer?: Record<string, unknown>[] };
      (target.dataLayer ??= []).push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      const gtm = document.createElement('script');
      gtm.id = 'gente-lps-gtm'; gtm.async = true;
      gtm.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WHK29D6';
      document.head.appendChild(gtm);
    }
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${RD_STATION_SCRIPT_URL}"]`);
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = RD_STATION_SCRIPT_URL;
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      const scriptToRemove = document.querySelector(`script[src="${RD_STATION_SCRIPT_URL}"]`);
      if (scriptToRemove) {
        document.body.removeChild(scriptToRemove);
      }
    };
  }, []);

  return null;
}
