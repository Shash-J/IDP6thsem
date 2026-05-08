/**
 * Firebase Service Layer
 * Provides clean API for reading/writing data to Firebase Realtime Database.
 * All database operations are centralized here for maintainability.
 */
import { database } from './config';
import { ref, onValue, set, update, off } from 'firebase/database';

// ─── Real-time Listeners ─────────────────────────────────────────────

/**
 * Subscribe to chamber data changes in real-time
 * @param {Function} callback - Called with chamber data on each update
 * @returns {Function} Unsubscribe function
 */
export const subscribeToChambers = (callback) => {
  const chambersRef = ref(database, 'chambers');
  onValue(chambersRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return () => off(chambersRef);
};

/**
 * Subscribe to pump status changes
 * @param {Function} callback - Called with pump data on each update
 * @returns {Function} Unsubscribe function
 */
export const subscribeToPump = (callback) => {
  const pumpRef = ref(database, 'pump');
  onValue(pumpRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return () => off(pumpRef);
};

/**
 * Subscribe to system mode changes
 * @param {Function} callback - Called with system data on each update
 * @returns {Function} Unsubscribe function
 */
export const subscribeToSystem = (callback) => {
  const systemRef = ref(database, 'system');
  onValue(systemRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return () => off(systemRef);
};

/**
 * Subscribe to alerts
 * @param {Function} callback - Called with alerts data on each update
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAlerts = (callback) => {
  const alertsRef = ref(database, 'alerts');
  onValue(alertsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return () => off(alertsRef);
};

// ─── Write Operations ────────────────────────────────────────────────

/**
 * Toggle pump status ON/OFF
 * @param {boolean} status - Desired pump state
 */
export const setPumpStatus = async (status) => {
  const pumpRef = ref(database, 'pump');
  await update(pumpRef, {
    status,
    lastUpdated: new Date().toISOString(),
  });
};

/**
 * Toggle valve for a specific chamber
 * @param {string} chamberId - Chamber identifier (e.g., 'tank1')
 * @param {boolean} valveState - Desired valve state
 */
export const setValveStatus = async (chamberId, valveState) => {
  const valveRef = ref(database, `chambers/${chamberId}`);
  await update(valveRef, { valve: valveState });
};

/**
 * Set system mode (AUTO/MANUAL)
 * @param {string} mode - 'AUTO' or 'MANUAL'
 */
export const setSystemMode = async (mode) => {
  const systemRef = ref(database, 'system');
  await update(systemRef, { mode });
};

/**
 * Write historical data point for charting
 * @param {string} chamberId - Chamber identifier
 * @param {object} dataPoint - { waterPercent, waterLevel, timestamp }
 */
export const writeHistoryPoint = async (chamberId, dataPoint) => {
  const historyRef = ref(database, `history/${chamberId}/${Date.now()}`);
  await set(historyRef, dataPoint);
};

/**
 * Subscribe to historical data for charts
 * @param {Function} callback - Called with history data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToHistory = (callback) => {
  const historyRef = ref(database, 'history');
  onValue(historyRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return () => off(historyRef);
};
