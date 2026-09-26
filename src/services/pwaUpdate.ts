import { registerSW } from 'virtual:pwa-register';

type UpdateCallback = (hasUpdate: boolean) => void;

class PWAUpdateManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable: boolean = false;
  private isChecking: boolean = false;
  private listeners: Set<UpdateCallback> = new Set();
  private updateSWHandler: ((reloadPage?: boolean) => Promise<void>) | null = null;
  private lastChecked: number = 0;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      // Listen for controllerchange: when a new SW activates and claims clients
      let isRefreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!isRefreshing) {
          isRefreshing = true;
          // Notify listeners so UI shows update or allows reload
          this.setUpdateAvailable(true);
        }
      });

      // Register the Service Worker via vite-plugin-pwa
      this.updateSWHandler = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          this.setUpdateAvailable(true);
        },
        onOfflineReady: () => {
          // App precached and ready offline
        },
        onRegisteredSW: (_swUrl, registration) => {
          if (registration) {
            this.registration = registration;

            // 1. Check immediately after registration
            setTimeout(() => {
              this.checkNow();
            }, 1000);

            // 2. Periodic background check every 15 minutes
            setInterval(() => {
              this.checkNow();
            }, 15 * 60 * 1000);

            // 3. Track any new SW that starts installing
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    this.setUpdateAvailable(true);
                  }
                });
              }
            });
          }
        },
      });

      // 4. Foreground resume: document visibility change (app returned to foreground)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkNow();
        }
      });

      // 5. Window focus (tapped/clicked back into app)
      window.addEventListener('focus', () => {
        this.checkNow();
      });

      // 6. pageshow event: specifically essential on iOS Safari standalone PWA resume
      window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
          this.checkNow();
        }
      });

      // 7. Network reconnected
      window.addEventListener('online', () => {
        this.checkNow();
      });
    }
  }

  public subscribe(cb: UpdateCallback): () => void {
    this.listeners.add(cb);
    cb(this.updateAvailable);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.updateAvailable));
  }

  public setUpdateAvailable(available: boolean) {
    this.updateAvailable = available;
    this.notify();
  }

  public async checkNow(): Promise<boolean> {
    const now = Date.now();
    // Throttle checks to max once per 10 seconds
    if (this.isChecking || (now - this.lastChecked < 10000 && this.lastChecked !== 0)) {
      return this.updateAvailable;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    this.isChecking = true;
    this.lastChecked = now;

    try {
      if (this.registration) {
        await this.registration.update();
        if (this.registration.waiting || this.registration.installing) {
          this.setUpdateAvailable(true);
          return true;
        }
      } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          this.registration = reg;
          await reg.update();
          if (reg.waiting || reg.installing) {
            this.setUpdateAvailable(true);
            return true;
          }
        }
      }
    } catch (err) {
      console.warn('PWA update check notice:', err);
    } finally {
      this.isChecking = false;
    }

    return this.updateAvailable;
  }

  public async applyUpdate() {
    if (this.updateSWHandler) {
      await this.updateSWHandler(true);
    } else {
      window.location.reload();
    }
  }

  /**
   * Safely clears Cache Storage (static assets only, NEVER touches IndexedDB)
   * and forces a clean reload with a timestamp parameter.
   */
  public async forceReload() {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if (this.registration) {
        await this.registration.unregister();
      }
    } catch (err) {
      console.error('Failed to clear asset cache:', err);
    }
    const cleanUrl = window.location.origin + window.location.pathname + '?reload=' + Date.now();
    window.location.replace(cleanUrl);
  }

  public hasUpdate(): boolean {
    return this.updateAvailable;
  }

  public getIsChecking(): boolean {
    return this.isChecking;
  }
}

export const pwaUpdateManager = new PWAUpdateManager();
