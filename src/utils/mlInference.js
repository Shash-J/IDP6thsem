import modelWeights from '../data/battery_ml_model.json';

/**
 * Run browser-side ML inference to predict battery State of Health (SoH),
 * Remaining Useful Life (RUL in days), and Sulfation Index.
 * 
 * Uses the pre-trained coefficients from train_battery_ml.py.
 * 
 * @param {number} voltage - Battery voltage (V)
 * @param {number} current - Battery current (A)
 * @param {number} temperature - Operating temperature (°C)
 * @param {number} internalResistance - Internal resistance (mΩ)
 * @param {number} specificGravity - Electrolyte specific gravity
 * @param {number} [electrolyteLevel=100] - Electrolyte level (%)
 * @returns {object} { soh (%), rul (days), sulfation (%) }
 */
export const predictBatteryMetrics = (voltage, current, temperature, internalResistance, specificGravity, electrolyteLevel = 100) => {
  // Ensure inputs are numeric
  const v = parseFloat(voltage) || 0;
  const c = parseFloat(current) || 0;
  const t = parseFloat(temperature) || 0;
  const ir = parseFloat(internalResistance) || 0;
  const sg = parseFloat(specificGravity) || 0;
  const el = parseFloat(electrolyteLevel) ?? 100;

  const predictSingle = (model) => {
    const { intercept, coefficients } = model;
    return (
      intercept +
      coefficients.voltage * v +
      coefficients.current * c +
      coefficients.temperature * t +
      coefficients.internalResistance * ir +
      coefficients.specificGravity * sg
    );
  };

  // Predict raw parameters
  const rawSoh = predictSingle(modelWeights.soh);
  const rawRul = predictSingle(modelWeights.rul);
  const rawSulfation = predictSingle(modelWeights.sulfation);

  // Electrolyte degradation curve:
  // - Above 30%: battery operates near full capacity (factor 0.95–1.0)
  // - Below 30%: plates begin to expose, steep performance cliff
  // - At 0%: factor drops to 0.35 (severe degradation)
  // Uses a smooth sigmoid-like ramp centered at 30% electrolyte level
  let electrolyteFactor;
  if (el >= 30) {
    // Healthy range: very gentle linear slope (1.0 at 100%, 0.95 at 30%)
    electrolyteFactor = 0.95 + 0.05 * ((el - 30) / 70);
  } else {
    // Critical range: steep exponential drop below 30%
    // Maps 30% → 0.95 down to 0% → 0.35
    electrolyteFactor = 0.35 + 0.60 * Math.pow(el / 30, 1.8);
  }

  // Apply degradation modifier
  const soh = Math.max(20, Math.min(100, rawSoh * electrolyteFactor));
  const rul = Math.max(0, Math.min(365, rawRul * electrolyteFactor));
  // Sulfation increases as electrolyte drops below 30% (plates exposed accelerates crystal buildup)
  const sulfationPenalty = el < 30 ? (30 - el) * 1.5 : 0;
  const sulfation = Math.max(0, Math.min(100, rawSulfation + sulfationPenalty));

  return {
    soh: Math.round(soh * 10) / 10,
    rul: Math.round(rul),
    sulfation: Math.round(sulfation * 10) / 10
  };
};
