# Machine Learning (ML) Battery Analytics Integration

This document details the Machine Learning integration in the **BatteryGuard** dashboard, explaining the physical degradation modeling, OLS training pipeline, browser-based inference engine, and the interactive predictions UI.

---

## 🧠 Core Concept & Target Variables

Lead-acid battery degradation is a complex electrochemical process. Instead of simple threshold checks, this project utilizes multivariate linear regression models to forecast three critical health and degradation metrics:

### 1. State of Health (SoH %)
- **Definition**: Represents the battery's current capacity to hold charge relative to its nominal brand-new condition.
- **Physical Modeling**: SoH degrades primarily due to increasing internal resistance (plate corrosion) and decreasing electrolyte specific gravity (loss of active acid).
- **Fitted Formula**: 
  $$\text{SoH} = \beta_0 + \beta_1 \cdot \text{Voltage} + \beta_2 \cdot \text{Current} + \beta_3 \cdot \text{Temperature} + \beta_4 \cdot \text{Internal Resistance} + \beta_5 \cdot \text{Specific Gravity}$$

### 2. Remaining Useful Life (RUL in Days)
- **Definition**: Forecasts the remaining operational days before the battery degrades below the standard $80\%$ SoH failure threshold.
- **Physical Modeling**: Life expectancy is inversely proportional to operational temperatures. The model simulates Arrhenius reaction rate acceleration, where elevated core temperatures double the chemical wear rate.
- **Fitted Formula**: Estimating days remaining based on temperature-influenced capacity fade rates.

### 3. Sulfation Index (%)
- **Definition**: Estimates the percentage of lead sulfate crystal buildup on the battery plates.
- **Physical Modeling**: Sulfation occurs when a battery remains discharged (low State of Charge) and the electrolyte density (Specific Gravity) falls while internal resistance increases.
- **Fitted Formula**: Predicts crystallization buildup based on voltage sag, resistance spikes, and gravity changes.

---

## 🛠 ML Pipeline Architecture

The system uses a **decentralized, local-first architecture**:
1. A Python pipeline trains the model coefficients offline on historical logs and exports them as a JSON file.
2. The React frontend imports this JSON weights file and executes real-time inference directly in the browser (zero server overhead).

```
   [battery_timeseries.json]
             │
             ▼
   [train_battery_ml.py] (Python NumPy OLS Training)
             │
             ▼
   [battery_ml_model.json] (Model Coefficients & Intercepts)
             │
             ▼
   [mlInference.js] (Client-side JavaScript Inference)
             │
             ▼
   [Predictions.jsx] (Real-time dashboard updates & What-If Simulator)
```

---

## 📂 Codebase Modules

### 1. Model Training Pipeline: `scripts/train_battery_ml.py`
This script executes the Ordinary Least Squares (OLS) regression using the normal equation:
$$\theta = (X^T X)^{-1} X^T y$$

It processes the 24-hour telemetry, applies physical degradation curves (Arrhenius and wear factors), fits the regression models, and outputs the parameters to a JSON file.

#### To Retrain the Model:
Ensure you have Python and `numpy` installed, then run:
```bash
python scripts/train_battery_ml.py
```
This will automatically update the coefficients file in `src/data/battery_ml_model.json`.

---

### 2. Browser-Side Inference Engine: `src/utils/mlInference.js`
This module performs real-time calculations directly in the browser. It imports the model weights and evaluates the linear equations instantly when telemetry is received or slider values are modified:

```javascript
import modelWeights from '../data/battery_ml_model.json';

export const predictBatteryMetrics = (voltage, current, temperature, internalResistance, specificGravity) => {
  const predictSingle = (model) => {
    const { intercept, coefficients } = model;
    return (
      intercept +
      coefficients.voltage * voltage +
      coefficients.current * current +
      coefficients.temperature * temperature +
      coefficients.internalResistance * internalResistance +
      coefficients.specificGravity * specificGravity
    );
  };

  const soh = Math.max(20, Math.min(100, predictSingle(modelWeights.soh)));
  const rul = Math.max(0, Math.min(365, predictSingle(modelWeights.rul)));
  const sulfation = Math.max(0, Math.min(100, predictSingle(modelWeights.sulfation)));

  return { soh, rul, sulfation };
};
```

---

### 3. ML Predictions Dashboard: `src/pages/Predictions.jsx`
Exposes the predictions to the user via a polished SCADA console layout:
- **Diagnostic Cards**: Shows State of Health, Remaining Useful Life, and Sulfation Index with color-coded safety badges (Healthy, Caution, Replace).
- **180-Day Decay Curve**: A Recharts area chart projecting the future SoH fade over the next 6 months, calculated using the active battery temperature and Arrhenius wear rates.
- **What-If Stress Simulator**: Features interactive sliders for:
  - Voltage ($10.5\text{V} - 14.5\text{V}$)
  - Current ($0.0\text{A} - 10.0\text{A}$)
  - Temperature ($15.0\text{°C} - 55.0\text{°C}$)
  - Internal Resistance ($3.0\text{ m}\Omega - 10.0\text{ m}\Omega$)
  - Specific Gravity ($1.100 - 1.300$)
  
  Sliding these parameters runs `predictBatteryMetrics` instantly, allowing operators to simulate high-stress conditions (e.g. charging at $45\text{°C}$ with $8\text{m}\Omega$ resistance) and see predictions in real-time.

---

## 📈 Trained Model Coefficients Reference

The current model is initialized with the following OLS-trained weights:

| Target Metric | Intercept | Voltage Coef | Current Coef | Temp Coef | Resistance Coef | Specific Gravity Coef |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SoH (%)** | $-1.1578$ | $+0.0487$ | $-0.0125$ | $-0.0987$ | $-12.4871$ | $+79.5214$ |
| **RUL (Days)**| $-245.412$| $+4.3214$ | $-1.0251$ | $-8.9482$ | $-42.1487$ | $+289.4125$ |
| **Sulfation (%)**| $+154.218$| $-3.2147$ | $+0.8412$ | $+0.1874$ | $+4.4891$  | $-100.2487$ |

*Note: Positive coefficients indicate a positive correlation (e.g., higher Specific Gravity increases SoH), while negative coefficients indicate an inverse correlation (e.g., higher Internal Resistance reduces SoH).*
