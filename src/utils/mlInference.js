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
 * @returns {object} { soh (%), rul (days), sulfation (%) }
 */
export const predictBatteryMetrics = (voltage, current, temperature, internalResistance, specificGravity) => {
  // Ensure inputs are numeric
  const v = parseFloat(voltage) || 0;
  const c = parseFloat(current) || 0;
  const t = parseFloat(temperature) || 0;
  const ir = parseFloat(internalResistance) || 0;
  const sg = parseFloat(specificGravity) || 0;

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

  // Predict and clip to logical ranges
  const soh = Math.max(20, Math.min(100, predictSingle(modelWeights.soh)));
  const rul = Math.max(0, Math.min(365, predictSingle(modelWeights.rul)));
  const sulfation = Math.max(0, Math.min(100, predictSingle(modelWeights.sulfation)));

  return {
    soh: Math.round(soh * 10) / 10,
    rul: Math.round(rul),
    sulfation: Math.round(sulfation * 10) / 10
  };
};
