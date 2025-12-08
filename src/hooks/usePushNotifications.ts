import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  showLocalNotification: (title: string, options?: NotificationOptions) => void;
}

export function usePushNotifications(): PushNotificationState {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  // Check if browser supports notifications
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
      
      // Check if already subscribed
      checkSubscription();
    }
  }, [isSupported]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.id) return false;

    setIsLoading(true);
    try {
      // First request permission if not granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return false;
        }
      }

      const registration = await navigator.serviceWorker.ready;
      
      // For now, we'll use local notifications as push server requires additional setup
      // The subscription object would be sent to our server in a full implementation
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // In production, you'd use your VAPID public key here
        applicationServerKey: undefined
      }).catch(() => null);

      if (subscription) {
        // Store subscription in database (future implementation)
        setIsSubscribed(true);
        localStorage.setItem('push-notifications-enabled', 'true');
        return true;
      }

      // Fallback: enable local notifications even without push subscription
      localStorage.setItem('push-notifications-enabled', 'true');
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      // Still enable local notifications
      localStorage.setItem('push-notifications-enabled', 'true');
      setIsSubscribed(true);
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user?.id, permission, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      localStorage.removeItem('push-notifications-enabled');
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return;

    try {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        ...options,
      });
    } catch (error) {
      // Fallback for service worker notifications
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          ...options,
        });
      });
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification,
  };
}
