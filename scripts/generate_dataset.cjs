/**
 * Lead-Acid Battery Refill System — Time-Series Data Generator
 * Generates realistic 24-hour battery chamber water level data.
 * Run: node scripts/generate_dataset.js
 */
const fs = require('fs');
const path = require('path');

const CHAMBERS = {
  tank1: { name: 'Chamber A-1', baseLevel: 82, drainRate: 0.85 },
  tank2: { name: 'Chamber A-2', baseLevel: 70, drainRate: 1.15 },
  tank3: { name: 'Chamber B-1', baseLevel: 90, drainRate: 0.70 },
  tank4: { name: 'Chamber B-2', baseLevel: 60, drainRate: 0.90 },
  tank5: { name: 'Chamber C-1', baseLevel: 45, drainRate: 1.20 },
  tank6: { name: 'Chamber C-2', baseLevel: 75, drainRate: 0.75 },
};

const BATTERY_PARAMS = {
  tank1: { voltageBase: 12.6, currentBase: 5.2, tempBase: 32, sgBase: 1.265, resistBase: 4.8 },
  tank2: { voltageBase: 12.4, currentBase: 4.8, tempBase: 34, sgBase: 1.255, resistBase: 5.1 },
  tank3: { voltageBase: 12.7, currentBase: 5.5, tempBase: 30, sgBase: 1.270, resistBase: 4.5 },
  tank4: { voltageBase: 12.3, currentBase: 4.5, tempBase: 35, sgBase: 1.250, resistBase: 5.4 },
  tank5: { voltageBase: 12.1, currentBase: 3.8, tempBase: 38, sgBase: 1.240, resistBase: 6.0 },
  tank6: { voltageBase: 12.5, currentBase: 5.0, tempBase: 31, sgBase: 1.260, resistBase: 4.9 },
};

const TANK_HEIGHT_CM = 20;
const LOW_THRESHOLD = 30;
const FULL_THRESHOLD = 95;
const FILL_RATE = 2.5; // % per interval when filling
const INTERVAL_MINUTES = 5;
const HOURS = 24;
const TOTAL_POINTS = (HOURS * 60) / INTERVAL_MINUTES; // 288

const startTime = new Date('2026-05-08T08:00:00+05:30');

function getStatus(percent, filling) {
  if (filling) return 'Filling';
  if (percent >= FULL_THRESHOLD) return 'Full';
  if (percent <= LOW_THRESHOLD) return 'Low';
  return 'Normal';
}

function genBatteryParams(id, waterPercent) {
  const bp = BATTERY_PARAMS[id];
  const levelFactor = waterPercent / 100;
  return {
    voltage: Math.round((bp.voltageBase * (0.85 + 0.15 * levelFactor) + (Math.random() - 0.5) * 0.1) * 100) / 100,
    current: Math.round((bp.currentBase * (0.7 + 0.3 * levelFactor) + (Math.random() - 0.5) * 0.3) * 100) / 100,
    temperature: Math.round((bp.tempBase + (1 - levelFactor) * 8 + (Math.random() - 0.5) * 2) * 10) / 10,
    specificGravity: Math.round((bp.sgBase * (0.92 + 0.08 * levelFactor) + (Math.random() - 0.5) * 0.005) * 1000) / 1000,
    internalResistance: Math.round((bp.resistBase * (1.3 - 0.3 * levelFactor) + (Math.random() - 0.5) * 0.2) * 10) / 10,
    stateOfCharge: Math.round(Math.min(100, waterPercent * 1.05 + (Math.random() - 0.5) * 3) * 10) / 10,
  };
}

function generate() {
  const timeseries = [];
  const state = {};
  const alerts = [];
  let pumpOn = false;
  let systemMode = 'AUTO';
  let alertId = 1;

  // Init state
  for (const [id, cfg] of Object.entries(CHAMBERS)) {
    state[id] = { percent: cfg.baseLevel, valve: false, filling: false };
  }

  for (let i = 0; i < TOTAL_POINTS; i++) {
    const ts = new Date(startTime.getTime() + i * INTERVAL_MINUTES * 60000);
    const timestamp = ts.toISOString();
    const hour = ts.getHours();

    // Drain rate varies by time of day (higher during work hours 9-18)
    const drainMultiplier = (hour >= 9 && hour <= 18) ? 1.5 : 0.6;

    // Process each chamber
    const chamberSnapshot = {};
    let anyFilling = false;
    let anyLow = false;

    for (const [id, cfg] of Object.entries(CHAMBERS)) {
      const s = state[id];

      if (s.filling && s.valve) {
        // Filling — increase level
        s.percent = Math.min(100, s.percent + FILL_RATE + (Math.random() * 0.4 - 0.2));
        if (s.percent >= FULL_THRESHOLD) {
          s.filling = false;
          s.valve = false;
          s.percent = Math.min(98, s.percent);
          alerts.push({ id: alertId++, type: 'success', message: `${cfg.name} refill completed — level at ${s.percent.toFixed(1)}%`, timestamp, chamber: id });
        }
      } else {
        // Normal drain — electrolysis water loss with added noise for realistic chart
        const drain = cfg.drainRate * drainMultiplier * (0.5 + Math.random() * 1.5);
        s.percent = Math.max(2, s.percent - drain + (Math.random() * 1.2 - 0.6));
      }

      // Trigger refill in AUTO mode
      if (systemMode === 'AUTO' && s.percent <= LOW_THRESHOLD && !s.filling) {
        s.filling = true;
        s.valve = true;
        alerts.push({ id: alertId++, type: 'warning', message: `${cfg.name} water level low (${s.percent.toFixed(1)}%) — starting refill`, timestamp, chamber: id });
      }

      if (s.filling) anyFilling = true;
      if (s.percent <= LOW_THRESHOLD) anyLow = true;

      const percent = Math.round(s.percent * 10) / 10;
      chamberSnapshot[id] = {
        name: cfg.name,
        waterPercent: percent,
        waterLevel: Math.round((percent / 100) * TANK_HEIGHT_CM * 10) / 10,
        status: getStatus(percent, s.filling),
        valve: s.valve,
        batteryParams: genBatteryParams(id, percent),
      };
    }

    pumpOn = anyFilling;

    // Add a sensor glitch event around hour 14
    if (i === 72) {
      alerts.push({ id: alertId++, type: 'error', message: 'ESP32 Module #2 — sensor read timeout (recovered)', timestamp, chamber: null });
    }
    // Connectivity blip at hour 20
    if (i === 144) {
      alerts.push({ id: alertId++, type: 'error', message: 'ESP32 Module #3 connectivity intermittent — 2 missed heartbeats', timestamp, chamber: null });
    }

    timeseries.push({
      timestamp,
      chambers: chamberSnapshot,
      pump: { status: pumpOn, lastUpdated: timestamp },
      system: { mode: systemMode },
    });
  }

  return {
    metadata: {
      description: 'Lead-Acid Battery Water Level Management System — 24-Hour Time-Series Dataset',
      generatedAt: new Date().toISOString(),
      intervalMinutes: INTERVAL_MINUTES,
      totalDataPoints: TOTAL_POINTS,
      durationHours: HOURS,
      startTime: startTime.toISOString(),
      tankHeightCm: TANK_HEIGHT_CM,
      lowThresholdPercent: LOW_THRESHOLD,
      fullThresholdPercent: FULL_THRESHOLD,
      chambers: Object.fromEntries(Object.entries(CHAMBERS).map(([id, cfg]) => [id, { name: cfg.name, drainRatePerInterval: cfg.drainRate, initialLevelPercent: cfg.baseLevel }])),
    },
    timeseries,
    alerts,
  };
}

const data = generate();
const outPath = path.join(__dirname, '..', 'src', 'data', 'battery_timeseries.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Dataset generated: ${outPath}`);
console.log(`  ${data.timeseries.length} data points over ${HOURS} hours`);
console.log(`  ${data.alerts.length} alert events`);
