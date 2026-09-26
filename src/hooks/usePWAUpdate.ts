import { useState, useEffect } from 'react';
import { pwaUpdateManager } from '../services/pwaUpdate';

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(pwaUpdateManager.hasUpdate());
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    return pwaUpdateManager.subscribe((hasUpdate) => {
      setUpdateAvailable(hasUpdate);
    });
  }, []);

  const checkForUpdate = async () => {
    setIsChecking(true);
    try {
      const hasNew = await pwaUpdateManager.checkNow();
      return hasNew;
    } finally {
      setIsChecking(false);
    }
  };

  const applyUpdate = () => {
    pwaUpdateManager.applyUpdate();
  };

  const forceReload = () => {
    pwaUpdateManager.forceReload();
  };

  return {
    updateAvailable,
    isChecking,
    checkForUpdate,
    applyUpdate,
    forceReload,
  };
}
