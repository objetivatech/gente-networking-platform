/** @copyright © 2026 Ranktop SEO Inteligente. @author Diogo Devitte */
import { useEffect } from 'react';
import { RD_STATION_SCRIPT_URL } from '@/modules/lps/lib/constants';

export function RDStationScript() {
  useEffect(() => {
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
