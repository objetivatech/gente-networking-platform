import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium transition-all duration-300",
        isOffline 
          ? "bg-destructive text-destructive-foreground" 
          : "bg-green-600 text-white"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Você está offline. Alguns recursos podem estar indisponíveis.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>Conexão restaurada!</span>
        </>
      )}
    </div>
  );
}
