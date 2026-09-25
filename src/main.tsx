import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerSW} from 'virtual:pwa-register';

// Register PWA service worker with automatic update checks
registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl, registration) {
    if (registration) {
      // Periodically check for SW updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Check for updates when page becomes visible or focused
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
