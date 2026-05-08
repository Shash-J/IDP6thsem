/**
 * Demo Data Service — Plays back pre-recorded battery time-series data
 *
 * - Only tank1 and tank2 are ACTIVE chambers; others are INACTIVE.
 * - Includes battery electrical parameters (voltage, current, temperature, etc.)
 * - Supports online/offline toggle per chamber.
 */
import dataset from '../data/battery_timeseries.json';

const { timeseries, alerts: datasetAlerts, metadata } = dataset;

// ─── Active vs Inactive Chambers ─────────────────────────────────────
const ACTIVE_CHAMBERS = ['tank1', 'tank2'];

// ─── Playback State ──────────────────────────────────────────────────

let currentIndex = 0;
let chamberData = {};
let pumpData = { ...timeseries[0].pump };
let systemData = { ...timeseries[0].system };
let alertsData = [];
let historyData = {};

// Online/offline state per chamber (only active chambers can be online)
let onlineState = {};
Object.keys(timeseries[0].chambers).forEach((id) => {
  onlineState[id] = ACTIVE_CHAMBERS.includes(id); // Active ones start online
});

/** Build chamber data for a given timeseries data point */
function buildChamberData(dp) {
  const result = {};
  Object.entries(dp.chambers).forEach(([id, data]) => {
    const isActive = ACTIVE_CHAMBERS.includes(id);
    const isOnline = onlineState[id];

    if (!isActive) {
      // Inactive chamber — show minimal info
      result[id] = {
        name: data.name,
        active: false,
        online: false,
        waterPercent: null,
        waterLevel: null,
        status: 'Inactive',
        valve: false,
        batteryParams: null,
        lastUpdated: null,
      };
    } else if (!isOnline) {
      // Active but offline — show mock/stale data
      result[id] = {
        name: data.name,
        active: true,
        online: false,
        waterPercent: data.waterPercent,
        waterLevel: data.waterLevel,
        status: 'Offline',
        valve: data.valve,
        batteryParams: data.batteryParams,
        lastUpdated: dp.timestamp,
      };
    } else {
      // Active and online — live data
      result[id] = {
        ...data,
        active: true,
        online: true,
        batteryParams: data.batteryParams,
        lastUpdated: dp.timestamp,
      };
    }
  });
  return result;
}

// Seed history with first 20 data points (only for active chambers)
const seedCount = Math.min(20, timeseries.length);
ACTIVE_CHAMBERS.forEach((id) => {
  historyData[id] = timeseries.slice(0, seedCount).map((dp) => ({
    waterPercent: dp.chambers[id].waterPercent,
    waterLevel: dp.chambers[id].waterLevel,
    timestamp: dp.timestamp,
  }));
});
currentIndex = seedCount;

// Build initial chamber data
chamberData = buildChamberData(timeseries[currentIndex - 1]);

// Seed initial alerts (only for active chambers)
alertsData = datasetAlerts
  .filter((a) => {
    const alertTime = new Date(a.timestamp).getTime();
    const currentTime = new Date(timeseries[currentIndex - 1].timestamp).getTime();
    return alertTime <= currentTime && (a.chamber === null || ACTIVE_CHAMBERS.includes(a.chamber));
  })
  .slice(-5);

// ─── Subscriber storage ──────────────────────────────────────────────

const subscribers = {
  chambers: [],
  pump: [],
  system: [],
  alerts: [],
  history: [],
};

const notify = (type) => {
  const dataMap = {
    chambers: chamberData,
    pump: pumpData,
    system: systemData,
    alerts: alertsData,
    history: historyData,
  };
  subscribers[type].forEach((cb) => cb(dataMap[type]));
};

// ─── Playback Engine — advance one data point every 3 seconds ────────

setInterval(() => {
  if (currentIndex >= timeseries.length) {
    currentIndex = 0;
    Object.keys(historyData).forEach((id) => (historyData[id] = []));
  }

  const dp = timeseries[currentIndex];
  chamberData = buildChamberData(dp);

  pumpData = { ...dp.pump };
  systemData = { ...dp.system };

  // Append to history for active+online chambers only
  ACTIVE_CHAMBERS.forEach((id) => {
    if (!onlineState[id]) return;
    if (!historyData[id]) historyData[id] = [];
    historyData[id].push({
      waterPercent: dp.chambers[id].waterPercent,
      waterLevel: dp.chambers[id].waterLevel,
      timestamp: dp.timestamp,
    });
    if (historyData[id].length > 100) {
      historyData[id] = historyData[id].slice(-100);
    }
  });

  // Check for new alerts (only for active chambers or system alerts)
  const newAlerts = datasetAlerts.filter(
    (a) => a.timestamp === dp.timestamp && (a.chamber === null || ACTIVE_CHAMBERS.includes(a.chamber))
  );
  if (newAlerts.length > 0) {
    alertsData = [...newAlerts, ...alertsData].slice(0, 10);
    notify('alerts');
  }

  currentIndex++;
  notify('chambers');
  notify('pump');
  notify('history');
}, 3000);

// ─── Public API ──────────────────────────────────────────────────────

export const subscribeToChambers = (callback) => {
  subscribers.chambers.push(callback);
  setTimeout(() => callback(chamberData), 100);
  return () => { subscribers.chambers = subscribers.chambers.filter((cb) => cb !== callback); };
};

export const subscribeToPump = (callback) => {
  subscribers.pump.push(callback);
  setTimeout(() => callback(pumpData), 100);
  return () => { subscribers.pump = subscribers.pump.filter((cb) => cb !== callback); };
};

export const subscribeToSystem = (callback) => {
  subscribers.system.push(callback);
  setTimeout(() => callback(systemData), 100);
  return () => { subscribers.system = subscribers.system.filter((cb) => cb !== callback); };
};

export const subscribeToAlerts = (callback) => {
  subscribers.alerts.push(callback);
  setTimeout(() => callback(alertsData), 100);
  return () => { subscribers.alerts = subscribers.alerts.filter((cb) => cb !== callback); };
};

export const subscribeToHistory = (callback) => {
  subscribers.history.push(callback);
  setTimeout(() => callback(historyData), 100);
  return () => { subscribers.history = subscribers.history.filter((cb) => cb !== callback); };
};

export const setPumpStatus = async (status) => {
  pumpData = { status, lastUpdated: new Date().toISOString() };
  notify('pump');
};

export const setValveStatus = async (chamberId, valveState) => {
  if (chamberData[chamberId] && chamberData[chamberId].active) {
    chamberData[chamberId] = {
      ...chamberData[chamberId],
      valve: valveState,
      status: valveState ? 'Filling' : chamberData[chamberId].waterPercent <= 30 ? 'Low' : 'Normal',
    };
    notify('chambers');
  }
};

export const setSystemMode = async (mode) => {
  systemData = { mode };
  notify('system');
};

/** Toggle a chamber online/offline */
export const setChamberOnline = async (chamberId, isOnline) => {
  if (!ACTIVE_CHAMBERS.includes(chamberId)) return; // Can't toggle inactive chambers
  onlineState[chamberId] = isOnline;
  // Rebuild chamber data with current state
  const dp = timeseries[Math.max(0, currentIndex - 1)];
  chamberData = buildChamberData(dp);
  notify('chambers');
};

export const getDatasetMetadata = () => metadata;
