import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const APP_DOWNLOADED_KEY = 'flux_app_downloaded_at';

export function getAppDownloadedTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(APP_DOWNLOADED_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function markAppDownloaded(timestamp = Date.now()): number {
  try {
    localStorage.setItem(APP_DOWNLOADED_KEY, String(timestamp));
  } catch {
    // Ignore storage quota errors
  }
  return timestamp;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [downloadedAt, setDownloadedAt] = useState<number | null>(() =>
    getAppDownloadedTimestamp()
  );

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      if (!getAppDownloadedTimestamp()) {
        setDownloadedAt(markAppDownloaded());
      }
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setDownloadedAt(markAppDownloaded());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setDownloadedAt(markAppDownloaded());
        return true;
      }
      return false;
    }

    // Fallback when running inside preview iframe / non-installable browser:
    // Record local offline app cache download timestamp for the 12-day offline window.
    const ts = markAppDownloaded();
    setDownloadedAt(ts);
    setIsInstalled(true);
    return true;
  }, [deferredPrompt]);

  const setMockElapsedDays = useCallback((daysAgo: number) => {
    const ts = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    markAppDownloaded(ts);
    setDownloadedAt(ts);
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    downloadedAt,
    install,
    setMockElapsedDays,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
