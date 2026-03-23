import { useEffect, useRef, useState, useCallback } from 'react';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAACp4c13EYVpO8Vxd';
const TURNSTILE_TIMEOUT_MS = 5000;

export type TurnstileStatus = 'loading' | 'ready' | 'error' | 'expired' | 'verified';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  onStatusChange?: (status: TurnstileStatus) => void;
}

export function CloudflareTurnstile({ onVerify, onExpire, onError, onStatusChange }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStatus = useCallback((status: TurnstileStatus) => {
    onStatusChange?.(status);
  }, [onStatusChange]);

  const handleVerify = useCallback((token: string) => {
    updateStatus('verified');
    onVerify(token);
  }, [onVerify, updateStatus]);

  const handleExpire = useCallback(() => {
    updateStatus('expired');
    onExpire?.();
  }, [onExpire, updateStatus]);

  const handleError = useCallback(() => {
    setFailed(true);
    updateStatus('error');
    onError?.();
  }, [onError, updateStatus]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || widgetIdRef.current !== null) return;
    const win = window as any;
    if (!win.turnstile) return;

    try {
      widgetIdRef.current = win.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: handleVerify,
        'expired-callback': handleExpire,
        'error-callback': handleError,
        theme: 'auto',
        size: 'normal',
      });
      updateStatus('ready');
    } catch (err) {
      console.warn('Turnstile render failed:', err);
      handleError();
    }
  }, [handleVerify, handleExpire, handleError, updateStatus]);

  useEffect(() => {
    const win = window as any;
    const markLoaded = () => {
      setLoaded(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };

    // Start timeout
    timeoutRef.current = setTimeout(() => {
      if (!loaded && !failed) {
        console.warn('Turnstile timed out after', TURNSTILE_TIMEOUT_MS, 'ms');
        handleError();
      }
    }, TURNSTILE_TIMEOUT_MS);

    pollRef.current = setInterval(() => {
      if (win.turnstile) {
        markLoaded();
      }
    }, 150);

    if (win.turnstile) {
      markLoaded();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (existingScript) {
      existingScript.addEventListener('load', markLoaded);
      existingScript.addEventListener('error', handleError);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = markLoaded;
    script.onerror = handleError;
    document.head.appendChild(script);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (widgetIdRef.current !== null) {
        try { win.turnstile?.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (loaded && !failed) {
      updateStatus('loading');
      renderWidget();
    }
  }, [loaded, failed, renderWidget, updateStatus]);

  if (failed) {
    return (
      <div className="flex justify-center my-2">
        <p className="text-xs text-muted-foreground">Verificação indisponível — prossiga com o cadastro.</p>
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center my-2" />;
}
