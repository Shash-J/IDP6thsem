/**
 * Converts battery_timeseries.json into CSV files for Excel.
 * Generates two sheets:
 *   1. battery_data.csv     — Main time-series (one row per timestamp)
 *   2. battery_alerts.csv   — Alert events log
 *
 * Run: node scripts/export_csv.cjs
 */
const fs = require('fs');
const path = require('path');

const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'battery_timeseries.json'), 'utf-8')
);

const outDir = path.join(__dirname, '..', 'data_export');
fs.mkdirSync(outDir, { recursive: true });

// ─── Sheet 1: Main Time-Series Data ─────────────────────────────────

const chamberIds = Object.keys(dataset.timeseries[0].chambers);
const chamberNames = {};
chamberIds.forEach((id) => {
  chamberNames[id] = dataset.metadata.chambers[id].name;
});

// Build CSV header
const headers = ['Timestamp', 'Date', 'Time'];
chamberIds.forEach((id) => {
  const name = chamberNames[id];
  headers.push(
    `${name} Water%`,
    `${name} Level(cm)`,
    `${name} Status`,
    `${name} Valve`,
    `${name} Voltage(V)`,
    `${name} Current(A)`,
    `${name} Temp(C)`,
    `${name} Sp.Gravity`,
    `${name} Resistance(mOhm)`,
    `${name} SoC(%)`
  );
});
headers.push('Pump Status', 'System Mode');

// Build rows
const rows = dataset.timeseries.map((dp) => {
  const ts = new Date(dp.timestamp);
  const date = ts.toLocaleDateString('en-IN');
  const time = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const cols = [dp.timestamp, date, time];
  chamberIds.forEach((id) => {
    const c = dp.chambers[id];
    cols.push(
      c.waterPercent,
      c.waterLevel,
      c.status,
      c.valve ? 'OPEN' : 'CLOSED',
      c.batteryParams?.voltage || '',
      c.batteryParams?.current || '',
      c.batteryParams?.temperature || '',
      c.batteryParams?.specificGravity || '',
      c.batteryParams?.internalResistance || '',
      c.batteryParams?.stateOfCharge || ''
    );
  });
  cols.push(dp.pump.status ? 'ON' : 'OFF', dp.system.mode);
  return cols;
});

// Write CSV
const csvLines = [headers.join(',')];
rows.forEach((row) => {
  csvLines.push(row.map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','));
});
const csvPath = path.join(outDir, 'battery_data.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'));

// ─── Sheet 2: Alerts Log ─────────────────────────────────────────────

const alertHeaders = ['Alert ID', 'Timestamp', 'Date', 'Time', 'Type', 'Severity', 'Message', 'Chamber'];
const alertRows = dataset.alerts.map((a) => {
  const ts = new Date(a.timestamp);
  const severity = a.type === 'error' ? 'CRITICAL' : a.type === 'warning' ? 'WARNING' : a.type === 'success' ? 'OK' : 'INFO';
  return [
    a.id,
    a.timestamp,
    ts.toLocaleDateString('en-IN'),
    ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    a.type.toUpperCase(),
    severity,
    `"${a.message}"`,
    a.chamber || 'SYSTEM',
  ];
});

const alertCsvLines = [alertHeaders.join(',')];
alertRows.forEach((row) => alertCsvLines.push(row.join(',')));
const alertCsvPath = path.join(outDir, 'battery_alerts.csv');
fs.writeFileSync(alertCsvPath, alertCsvLines.join('\n'));

// ─── Sheet 3: Metadata / Config ─────────────────────────────────────

const metaLines = [
  'Parameter,Value',
  `Description,"${dataset.metadata.description}"`,
  `Generated At,${dataset.metadata.generatedAt}`,
  `Interval (minutes),${dataset.metadata.intervalMinutes}`,
  `Total Data Points,${dataset.metadata.totalDataPoints}`,
  `Duration (hours),${dataset.metadata.durationHours}`,
  `Start Time,${dataset.metadata.startTime}`,
  `Tank Height (cm),${dataset.metadata.tankHeightCm}`,
  `Low Threshold (%),${dataset.metadata.lowThresholdPercent}`,
  `Full Threshold (%),${dataset.metadata.fullThresholdPercent}`,
  '',
  'Chamber,Name,Drain Rate (%/interval),Initial Level (%)',
];
Object.entries(dataset.metadata.chambers).forEach(([id, cfg]) => {
  metaLines.push(`${id},${cfg.name},${cfg.drainRatePerInterval},${cfg.initialLevelPercent}`);
});
const metaCsvPath = path.join(outDir, 'battery_metadata.csv');
fs.writeFileSync(metaCsvPath, metaLines.join('\n'));

console.log('✅ Export complete! Files saved to: data_export/');
console.log(`   📊 ${csvPath}  (${rows.length} rows)`);
console.log(`   ⚠️  ${alertCsvPath}  (${alertRows.length} alerts)`);
console.log(`   📋 ${metaCsvPath}  (system config)`);
console.log('\n💡 Open these .csv files in Excel — they auto-format into spreadsheet columns.');
