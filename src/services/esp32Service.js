import { predictBatteryMetrics } from '../utils/mlInference';

// Get IP from localStorage or use the provided default
const DEFAULT_IP = '192.168.135.31';
export const getEsp32Ip = () => {
  const ip = localStorage.getItem('esp32_ip') || DEFAULT_IP;
  // Clean up any prepended http:// or trailing slashes
  return ip.replace(/^https?:\/\//i, '').replace(/\/$/, '');
};

export const setEsp32Ip = (ip) => {
  localStorage.setItem('esp32_ip', ip);
};

const TANK_HEIGHT_CM = 20.0;
const ACTIVE_CHAMBERS = ['tank1', 'tank2'];

// Local state
let chamberData = {
  tank1: { name: 'Chamber A-1', active: true, online: false, waterPercent: 0, waterLevel: 0, status: 'Connecting', valve: false, batteryParams: null, predictions: null },
  tank2: { name: 'Chamber A-2', active: true, online: false, waterPercent: 0, waterLevel: 0, status: 'Connecting', valve: false, batteryParams: null, predictions: null }
};

let pumpData = { status: false, lastUpdated: new Date().toISOString() };
let systemData = { mode: 'AUTO' };
let alertsData = [
  { id: 'init', type: 'info', message: 'Local ESP32 monitoring service initialized.', timestamp: new Date().toISOString(), chamber: null }
];
let historyData = {
  tank1: [],
  tank2: []
};

// Seed initial history points to make the chart look populated on start
const seedHistory = () => {
  const now = Date.now();
  for (let i = 10; i >= 0; i--) {
    const ts = new Date(now - i * 60 * 1000).toISOString();
    historyData.tank1.push({
      waterPercent: 75 + Math.sin(i) * 5,
      waterLevel: 15 + Math.sin(i) * 1,
      timestamp: ts,
      batteryParams: { voltage: 12.3, current: 4.0, temperature: 31.0, internalResistance: 5.1, specificGravity: 1.24, stateOfCharge: 80.0 },
      predictions: { soh: 84.5, rul: 300, sulfation: 12.5 }
    });
    historyData.tank2.push({
      waterPercent: 70 - Math.cos(i) * 5,
      waterLevel: 14 - Math.cos(i) * 1,
      timestamp: ts,
      batteryParams: { voltage: 12.1, current: 3.5, temperature: 33.0, internalResistance: 5.6, specificGravity: 1.22, stateOfCharge: 72.0 },
      predictions: { soh: 73.2, rul: 235, sulfation: 24.1 }
    });
  }
};
seedHistory();

// Pub/Sub subscribers
const subscribers = {
  chambers: [],
  pump: [],
  system: [],
  alerts: [],
  history: []
};

const notify = (type) => {
  const dataMap = {
    chambers: chamberData,
    pump: pumpData,
    system: systemData,
    alerts: alertsData,
    history: historyData
  };
  subscribers[type].forEach((cb) => cb(dataMap[type]));
};

// Alert generator
const addAlert = (type, message, chamber = null) => {
  // Avoid duplicate alerts in the current list
  const isDuplicate = alertsData.slice(0, 3).some(a => a.message === message);
  if (isDuplicate) return;

  const newAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    message,
    timestamp: new Date().toISOString(),
    chamber
  };
  alertsData = [newAlert, ...alertsData].slice(0, 15); // keep 15 alerts max
  notify('alerts');
};

// Polling connection state
let isPolling = false;
let pollingInterval = null;

const fetchTelemetry = async () => {
  const ip = getEsp32Ip();
  const url = `http://${ip}/data`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2500) // 2.5s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse ESP32 response
    const timestamp = new Date().toISOString();
    
    // Update Chambers (Only tank1 & tank2)
    ACTIVE_CHAMBERS.forEach((id) => {
      const espChamber = data.chambers?.[id];
      if (espChamber) {
        // 1. Calculate water level & percent from raw distance if provided
        let waterPercent = espChamber.waterPercent;
        let waterLevel = espChamber.waterLevel;
        
        if (espChamber.distanceCm !== undefined) {
          const distance = parseFloat(espChamber.distanceCm);
          waterLevel = Math.max(0, TANK_HEIGHT_CM - distance);
          waterPercent = Math.max(0, Math.min(100, (waterLevel / TANK_HEIGHT_CM) * 100));
        }

        // Round values
        waterPercent = Math.round((waterPercent || 0) * 10) / 10;
        waterLevel = Math.round((waterLevel || 0) * 10) / 10;

        // 2. Perform ML predictions if battery parameters are present
        let predictions = null;
        const bp = espChamber.batteryParams;
        if (bp) {
          predictions = predictBatteryMetrics(
            bp.voltage,
            bp.current,
            bp.temperature,
            bp.internalResistance,
            bp.specificGravity,
            waterPercent
          );
        }

        // Determine status
        let status = 'Normal';
        if (espChamber.valve) {
          status = 'Filling';
        } else if (waterPercent < 30) {
          status = 'Low';
        }

        // Trigger alerts independently of status badge
        if (waterPercent < 30) {
          addAlert('warning', `${espChamber.name || id} electrolyte level is low (${waterPercent}%)!`, id);
        }

        if (espChamber.valve && waterPercent >= 95) {
          addAlert('success', `${espChamber.name || id} electrolyte refill completed (${waterPercent}%)!`, id);
        }

        chamberData[id] = {
          name: espChamber.name || (id === 'tank1' ? 'Chamber A-1' : 'Chamber A-2'),
          active: true,
          online: true,
          waterPercent,
          waterLevel,
          status,
          valve: !!espChamber.valve,
          batteryParams: bp ? {
            voltage: parseFloat(bp.voltage) || 0,
            current: parseFloat(bp.current) || 0,
            temperature: parseFloat(bp.temperature) || 0,
            specificGravity: parseFloat(bp.specificGravity) || 0,
            internalResistance: parseFloat(bp.internalResistance) || 0,
            stateOfCharge: parseFloat(bp.stateOfCharge) || 0
          } : null,
          predictions,
          lastUpdated: timestamp
        };

        // Append to history
        if (!historyData[id]) historyData[id] = [];
        historyData[id].push({
          waterPercent,
          waterLevel,
          timestamp,
          batteryParams: bp ? { ...bp } : null,
          predictions
        });
        if (historyData[id].length > 100) {
          historyData[id] = historyData[id].slice(-100);
        }
      }
    });

    // No other tanks to process

    // Update Pump
    if (data.pump) {
      pumpData = {
        status: !!data.pump.status,
        lastUpdated: data.pump.lastUpdated || timestamp
      };
    }

    // Update System
    if (data.system) {
      systemData = {
        mode: data.system.mode || 'AUTO'
      };
    }

    notify('chambers');
    notify('pump');
    notify('system');
    notify('history');

  } catch (error) {
    console.error("ESP32 polling error:", error);
    
    // Mark active chambers offline
    ACTIVE_CHAMBERS.forEach((id) => {
      if (chamberData[id]) {
        chamberData[id].online = false;
        chamberData[id].status = 'Offline';
      }
    });
    notify('chambers');

    addAlert('error', `Failed to connect to ESP32 at http://${ip}/data. Make sure device is powered and connected to same Wi-Fi.`, null);
  }
};

const startPolling = () => {
  if (isPolling) return;
  isPolling = true;
  fetchTelemetry(); // run once immediately
  pollingInterval = setInterval(fetchTelemetry, 3000);
};

const stopPolling = () => {
  if (!isPolling) return;
  isPolling = false;
  clearInterval(pollingInterval);
};

// ─── Service API ─────────────────────────────────────────────────────

export const subscribeToChambers = (callback) => {
  subscribers.chambers.push(callback);
  setTimeout(() => callback(chamberData), 100);
  
  if (subscribers.chambers.length === 1) {
    startPolling();
  }
  
  return () => {
    subscribers.chambers = subscribers.chambers.filter((cb) => cb !== callback);
    if (subscribers.chambers.length === 0) {
      stopPolling();
    }
  };
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

// Action dispatchers (POST http://{ESP32_IP}/control)
const sendControlCommand = async (payload) => {
  const ip = getEsp32Ip();
  const url = `http://${ip}/control`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      throw new Error(`Control request failed with status: ${response.status}`);
    }
    
    // Quick re-fetch to update state
    setTimeout(fetchTelemetry, 200);
    return true;
  } catch (err) {
    console.error("ESP32 control error:", err);
    addAlert('error', `Failed to send control command to ESP32: ${err.message}`, null);
    throw err;
  }
};

export const setPumpStatus = async (status) => {
  // Optimistic update
  pumpData = { status, lastUpdated: new Date().toISOString() };
  notify('pump');
  
  return sendControlCommand({ pump: status });
};

export const setValveStatus = async (chamberId, valveState) => {
  // Optimistic update
  if (chamberData[chamberId]) {
    chamberData[chamberId].valve = valveState;
    chamberData[chamberId].status = valveState ? 'Filling' : 'Normal';
    notify('chambers');
  }
  
  return sendControlCommand({ chamberId, valve: valveState });
};

export const setSystemMode = async (mode) => {
  // Optimistic update
  systemData = { mode };
  notify('system');
  
  return sendControlCommand({ mode });
};

export const setChamberOnline = async (chamberId, isOnline) => {
  // Read-only online status in live ESP32 mode since it depends on actual hardware telemetry
  console.log(`Chamber online status toggle ignored in live mode for ${chamberId} (set to ${isOnline})`);
};
