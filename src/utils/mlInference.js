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

  // Electrolyte degradation factor (0.4 at 0% electrolyte level up to 1.0 at 100% electrolyte level)
  const electrolyteFactor = 0.4 + 0.6 * (el / 100);

  // Apply degradation modifier
  const soh = Math.max(20, Math.min(100, rawSoh * electrolyteFactor));
  const rul = Math.max(0, Math.min(365, rawRul * electrolyteFactor));
  // Sulfation increases as electrolyte level drops (up to +50% sulfation at 0% level)
  const sulfation = Math.max(0, Math.min(100, rawSulfation + (100 - el) * 0.5));

  return {
    soh: Math.round(soh * 10) / 10,
    rul: Math.round(rul),
    sulfation: Math.round(sulfation * 10) / 10
  };
};
