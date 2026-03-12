import { useEffect, useRef, useState, useCallback } from 'react';

const TURNSTILE_SITE_KEY = '0x4AAAAAACp4c13EYVpO8Vxd';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export function CloudflareTurnstile({ onVerify, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || widgetIdRef.current !== null) return;
    const win = window as any;
    if (!win.turnstile) return;

    widgetIdRef.current = win.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme: 'auto',
      size: 'normal',
    });
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    const win = window as any;
    if (win.turnstile) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current !== null) {
        try { win.turnstile?.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (loaded) renderWidget();
  }, [loaded, renderWidget]);

  return <div ref={containerRef} className="flex justify-center my-2" />;
}
