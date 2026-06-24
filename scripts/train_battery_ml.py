import json
import os
import numpy as np

def load_data(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def train_linear_regression(X, y):
    # Add bias column (intercept)
    X_bias = np.c_[np.ones((X.shape[0], 1)), X]
    # OLS normal equation: (X^T * X)^-1 * X^T * y
    theta = np.linalg.pinv(X_bias.T.dot(X_bias)).dot(X_bias.T).dot(y)
    intercept = float(theta[0])
    coefficients = [float(c) for c in theta[1:]]
    return intercept, coefficients

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, 'src', 'data', 'battery_timeseries.json')
    output_path = os.path.join(base_dir, 'src', 'data', 'battery_ml_model.json')
    
    print(f"Loading timeseries data from {json_path}...")
    data = load_data(json_path)
    
    timeseries = data['timeseries']
    
    # We will extract features from active tanks (tank1 and tank2) across the timeseries
    features = []
    
    # Feature columns: [voltage, current, temperature, internalResistance, specificGravity]
    for dp in timeseries:
        for tank_id in ['tank1', 'tank2']:
            if tank_id in dp['chambers']:
                chamber = dp['chambers'][tank_id]
                bp = chamber.get('batteryParams')
                if bp:
                    features.append([
                        bp['voltage'],
                        bp['current'],
                        bp['temperature'],
                        bp['internalResistance'],
                        bp['specificGravity'],
                        bp['stateOfCharge'] # SoC is also useful
                    ])
                    
    features = np.array(features)
    
    # Feature columns mapping
    # 0: voltage
    # 1: current
    # 2: temperature
    # 3: internalResistance
    # 4: specificGravity
    # 5: stateOfCharge
    
    v = features[:, 0]
    c = features[:, 1]
    t = features[:, 2]
    ir = features[:, 3]
    sg = features[:, 4]
    soc = features[:, 5]
    
    # ─── Target Label Engineering (Physical Aging Equations) ───────────
    # 1. State of Health (SoH %): 
    # Nominal internal resistance is 4.5 mOhm. Degradation increases resistance.
    # Nominal Specific Gravity is 1.25. Low gravity under load means lower health.
    # We define SoH using standard physical relationships.
    soh_raw = 100.0 - 16.5 * (ir - 4.5) - 22.0 * (1.25 - sg) - 0.1 * (t - 25)
    soh = np.clip(soh_raw, 20.0, 100.0) # clip to sensible bounds
    
    # 2. Remaining Useful Life (RUL in Days):
    # Proportional to SoH, degraded by higher operating temperatures (Arrhenius relation)
    # Average battery life is 365 days. At higher temperatures, degradation rate doubles.
    rul_raw = soh * 3.65 * np.exp(-0.025 * (t - 25))
    rul = np.clip(rul_raw, 0.0, 365.0)
    
    # 3. Sulfation Index (%):
    # Buildup of lead sulfate crystals on plates.
    # Occurs when Specific Gravity is low, resistance is high, and SoC is low.
    sulf_raw = 100.0 * (1.0 - (sg - 1.15) / (1.26 - 1.15)) + 4.5 * (ir - 4.5) - 0.2 * soc
    sulfation = np.clip(sulf_raw, 0.0, 100.0)
    
    print("Training models...")
    # Features matrix for model (exclude SoC as a predictor, use voltage, current, temp, ir, sg)
    X = features[:, :5]
    
    soh_intercept, soh_coefs = train_linear_regression(X, soh)
    rul_intercept, rul_coefs = train_linear_regression(X, rul)
    sulfation_intercept, sulfation_coefs = train_linear_regression(X, sulfation)
    
    # Save the model parameters
    model_json = {
        "metadata": {
            "description": "Linear regression weights for battery health, RUL, and sulfation forecasting.",
            "trainedAt": "2026-06-24",
            "features": ["voltage", "current", "temperature", "internalResistance", "specificGravity"]
        },
        "soh": {
            "intercept": soh_intercept,
            "coefficients": {
                "voltage": soh_coefs[0],
                "current": soh_coefs[1],
                "temperature": soh_coefs[2],
                "internalResistance": soh_coefs[3],
                "specificGravity": soh_coefs[4]
            }
        },
        "rul": {
            "intercept": rul_intercept,
            "coefficients": {
                "voltage": rul_coefs[0],
                "current": rul_coefs[1],
                "temperature": rul_coefs[2],
                "internalResistance": rul_coefs[3],
                "specificGravity": rul_coefs[4]
            }
        },
        "sulfation": {
            "intercept": sulfation_intercept,
            "coefficients": {
                "voltage": sulfation_coefs[0],
                "current": sulfation_coefs[1],
                "temperature": sulfation_coefs[2],
                "internalResistance": sulfation_coefs[3],
                "specificGravity": sulfation_coefs[4]
            }
        }
    }
    
    print(f"Saving model coefficients to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(model_json, f, indent=2)
        
    print("ML model training completed successfully!")

if __name__ == "__main__":
    main()
