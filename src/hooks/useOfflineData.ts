import { useEffect, useState, useCallback } from 'react';

interface OfflineDataOptions<T> {
  key: string;
  fetchFn: () => Promise<T>;
  staleTime?: number; // milliseconds
}

interface OfflineDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isOffline: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const STORAGE_PREFIX = 'gente-offline-';

interface StoredData<T> {
  data: T;
  timestamp: number;
}

export function useOfflineData<T>({
  key,
  fetchFn,
  staleTime = 5 * 60 * 1000, // 5 minutes default
}: OfflineDataOptions<T>): OfflineDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const storageKey = `${STORAGE_PREFIX}${key}`;

  // Load cached data from localStorage
  const loadCachedData = useCallback((): StoredData<T> | null => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
    return null;
  }, [storageKey]);

  // Save data to localStorage
  const saveToCache = useCallback((newData: T) => {
    try {
      const stored: StoredData<T> = {
        data: newData,
        timestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(stored));
      setLastUpdated(new Date(stored.timestamp));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }, [storageKey]);

  // Fetch fresh data
  const fetchData = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return;
    }

    setIsLoading(true);
    try {
      const freshData = await fetchFn();
      setData(freshData);
      saveToCache(freshData);
      setIsOffline(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      // If fetch fails, try to use cached data
      const cached = loadCachedData();
      if (cached) {
        setData(cached.data);
        setLastUpdated(new Date(cached.timestamp));
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, saveToCache, loadCachedData]);

  // Check if data is stale
  const isStale = lastUpdated 
    ? Date.now() - lastUpdated.getTime() > staleTime 
    : true;

  // Initial load
  useEffect(() => {
    // First, try to load from cache
    const cached = loadCachedData();
    if (cached) {
      setData(cached.data);
      setLastUpdated(new Date(cached.timestamp));
      setIsLoading(false);
    }

    // Then fetch fresh data if online
    if (navigator.onLine) {
      fetchData();
    } else {
      setIsOffline(true);
      setIsLoading(false);
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Refresh data when coming back online
      fetchData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    isOffline,
    isStale,
    lastUpdated,
    refresh: fetchData,
  };
}

// Helper to clear all offline data
export function clearOfflineData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Helper to get offline data size
export function getOfflineDataSize(): string {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      totalSize += localStorage.getItem(key)?.length || 0;
    }
  }
  
  if (totalSize < 1024) {
    return `${totalSize} bytes`;
  } else if (totalSize < 1024 * 1024) {
    return `${(totalSize / 1024).toFixed(2)} KB`;
  } else {
    return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
  }
}
