import * as demoService from './demoData.js';
import * as esp32Service from './esp32Service.js';

/**
 * Get the active data source ('demo' or 'esp32').
 * Defaults to 'esp32'.
 */
export const getActiveSource = () => {
  return localStorage.getItem('data_source') || 'esp32';
};

/**
 * Set the active data source.
 * @param {string} source - 'demo' or 'esp32'
 */
export const setActiveSource = (source) => {
  if (source === 'demo' || source === 'esp32') {
    localStorage.setItem('data_source', source);
  }
};

/**
 * Get the active service instance dynamically.
 */
const getService = () => {
  const source = getActiveSource();
  if (source === 'demo') {
    return demoService;
  }
  return esp32Service;
};

// ─── Real-time Subscriptions ─────────────────────────────────────────

export const subscribeToChambers = (callback) => {
  return getService().subscribeToChambers(callback);
};

export const subscribeToPump = (callback) => {
  return getService().subscribeToPump(callback);
};

export const subscribeToSystem = (callback) => {
  return getService().subscribeToSystem(callback);
};

export const subscribeToAlerts = (callback) => {
  return getService().subscribeToAlerts(callback);
};

export const subscribeToHistory = (callback) => {
  return getService().subscribeToHistory(callback);
};

// ─── Action Controllers ──────────────────────────────────────────────

export const setPumpStatus = async (status) => {
  return getService().setPumpStatus(status);
};

export const setValveStatus = async (chamberId, valveState) => {
  return getService().setValveStatus(chamberId, valveState);
};

export const setSystemMode = async (mode) => {
  return getService().setSystemMode(mode);
};

export const setChamberOnline = async (chamberId, isOnline) => {
  if (getService().setChamberOnline) {
    return getService().setChamberOnline(chamberId, isOnline);
  }
};
