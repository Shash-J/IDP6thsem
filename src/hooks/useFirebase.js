/**
 * Custom hooks for Firebase/Demo data subscriptions.
 * Provides reactive state management for all dashboard data streams.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToChambers,
  subscribeToPump,
  subscribeToSystem,
  subscribeToAlerts,
  subscribeToHistory,
  setPumpStatus,
  setValveStatus,
  setSystemMode,
  setChamberOnline,
} from '../services/dataService';

/**
 * Hook for chamber data with real-time updates
 */
export const useChambers = () => {
  const [chambers, setChambers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const unsubscribe = subscribeToChambers((data) => {
        setChambers(data);
        setLoading(false);
      });
      return unsubscribe;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const toggleOnline = useCallback(async (chamberId, isOnline) => {
    try {
      await setChamberOnline(chamberId, isOnline);
    } catch (err) {
      console.error('Failed to toggle chamber online:', err);
    }
  }, []);

  return { chambers, loading, error, toggleOnline };
};


/**
 * Hook for pump status with real-time updates and control
 */
export const usePump = () => {
  const [pump, setPump] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPump((data) => {
      setPump(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const togglePump = useCallback(async (status) => {
    try {
      await setPumpStatus(status);
    } catch (err) {
      console.error('Failed to toggle pump:', err);
    }
  }, []);

  return { pump, loading, togglePump };
};

/**
 * Hook for system mode with real-time updates and control
 */
export const useSystem = () => {
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToSystem((data) => {
      setSystem(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleMode = useCallback(async (mode) => {
    try {
      await setSystemMode(mode);
    } catch (err) {
      console.error('Failed to set system mode:', err);
    }
  }, []);

  return { system, loading, toggleMode };
};

/**
 * Hook for alerts with real-time updates
 */
export const useAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts((data) => {
      setAlerts(data || []);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { alerts, loading };
};

/**
 * Hook for valve control
 */
export const useValveControl = () => {
  const toggleValve = useCallback(async (chamberId, valveState) => {
    try {
      await setValveStatus(chamberId, valveState);
    } catch (err) {
      console.error('Failed to toggle valve:', err);
    }
  }, []);

  return { toggleValve };
};

/**
 * Hook for historical chart data
 */
export const useHistory = () => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToHistory((data) => {
      setHistory(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { history, loading };
};
