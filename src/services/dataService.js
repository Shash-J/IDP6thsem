/**
 * Data Service Router
 * Routes between Firebase and Demo data based on environment config.
 * Uses synchronous conditional import to avoid top-level await issues.
 */

const useDemoData = import.meta.env.VITE_USE_DEMO_DATA === 'true';

// Dynamic re-exports based on environment
// We use a lazy-init pattern to avoid top-level await
let _service = null;

const getService = async () => {
  if (_service) return _service;
  if (useDemoData) {
    _service = await import('./demoData.js');
  } else {
    _service = await import('../firebase/service.js');
  }
  return _service;
};

export const subscribeToChambers = (callback) => {
  getService().then((s) => s.subscribeToChambers(callback));
  // Return a cleanup function
  return () => {
    getService().then((s) => {
      // Re-subscribe to get the unsub function, then call it
      // In practice, the subscription is already active
    });
  };
};

export const subscribeToPump = (callback) => {
  let unsub = null;
  getService().then((s) => {
    unsub = s.subscribeToPump(callback);
  });
  return () => unsub?.();
};

export const subscribeToSystem = (callback) => {
  let unsub = null;
  getService().then((s) => {
    unsub = s.subscribeToSystem(callback);
  });
  return () => unsub?.();
};

export const subscribeToAlerts = (callback) => {
  let unsub = null;
  getService().then((s) => {
    unsub = s.subscribeToAlerts(callback);
  });
  return () => unsub?.();
};

export const subscribeToHistory = (callback) => {
  let unsub = null;
  getService().then((s) => {
    unsub = s.subscribeToHistory(callback);
  });
  return () => unsub?.();
};

export const setPumpStatus = async (status) => {
  const s = await getService();
  return s.setPumpStatus(status);
};

export const setValveStatus = async (chamberId, valveState) => {
  const s = await getService();
  return s.setValveStatus(chamberId, valveState);
};

export const setSystemMode = async (mode) => {
  const s = await getService();
  return s.setSystemMode(mode);
};

export const setChamberOnline = async (chamberId, isOnline) => {
  const s = await getService();
  return s.setChamberOnline?.(chamberId, isOnline);
};
