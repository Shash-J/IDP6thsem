# BatteryGuard — Lead-Acid Battery Water Level Management System

A professional, local IoT dashboard built with React + Vite for real-time monitoring and control of lead-acid battery water refill chambers. Designed to operate **entirely offline on your Local Area Network (LAN)**, connecting directly to ESP32 microcontrollers with ultrasonic level sensors and battery parameters, without any cloud dependencies.

---

## ✨ Features

- **Non-Scrollable Cockpit SCADA Grid** — High-density, professional layout that fits entirely on a single screen without scrolling on desktop.
- **Direct local ESP32 Polling** — Real-time telemetry fetched directly from your ESP32's local IP address (default: `192.168.135.31`) every 3 seconds.
- **Frontend Metric Calculations** — Converts raw ultrasonic sensor distance readings (`distanceCm`) into `waterLevel` and `waterPercent` in real-time, simplifying ESP32 code.
- **Chamber Filtering** — Restrained UI to monitor exactly **2 active chambers** (Chamber A-1 and Chamber A-2), matching the physical dual-tank hardware setup.
- **Dynamic Connection Settings** — Interactive settings modal accessible via the header gear icon allowing you to swap between Live ESP32 and Demo modes, configure the IP, and **Test Connection** with live diagnostics.
- **Browser-Side Machine Learning** — Exposes a custom-trained Linear Regression model running locally in the browser to forecast:
  - **State of Health (SoH %)**: Battery capacity fade relative to new state.
  - **Remaining Useful Life (RUL in Days)**: Days left before SoH drops below 80%.
  - **Sulfation Index (%)**: Estimates lead sulfate crystal buildup on battery plates.
- **What-If Stress Simulator** — Real-time slider console on the Predictions page that allows you to manually stress-test parameters (voltage, current, temp, resistance, specific gravity) to see immediate model forecasts.

---

## 🛠 Tech Stack

| Technology     | Purpose                          |
| -------------- | -------------------------------- |
| React 19       | UI Framework                     |
| Vite 8         | Build Tool & Dev Server          |
| Tailwind CSS 4 | SCADA Glassmorphic Styling       |
| Recharts       | Analytics & Decay Graphing       |
| react-hot-toast| Status Toast Notifications       |
| NumPy / Python | ML Model OLS Training            |

---

## 📁 Project Structure

```
├── esp_code.ino        # CORS-enabled ESP32 Web Server Firmware
├── scripts/
│   └── train_battery_ml.py   # OLS Linear Regression training pipeline
├── src/
│   ├── components/     # High-density UI controls & widgets
│   ├── pages/
│   │   ├── Dashboard.jsx     # Non-scrollable SCADA cockpit page
│   │   └── Predictions.jsx   # Machine Learning predictions & Simulator
│   ├── services/
│   │   ├── dataService.js    # Data routing layer (ESP32 vs. Demo)
│   │   └── esp32Service.js   # HTTP client with in-memory history & alerts
│   ├── utils/
│   │   └── mlInference.js    # Browser-side ML regression engine
│   ├── App.jsx         # App router and shell layout
│   └── index.css       # Design tokens & glassmorphism styling
```

---

## 🚀 Getting Started

### 1. Installation

```bash
# Install NPM dependencies
npm install

# Start the Vite local development server
npm run dev
```

The application will be served locally at: [http://localhost:5173/](http://localhost:5173/)

### 2. Machine Learning Training

If you accumulate custom battery telemetry logs and want to retrain the forecasting models:

```bash
# Run the NumPy OLS training script
python scripts/train_battery_ml.py
```

This script will read `src/data/battery_timeseries.json`, fit linear regression parameters, and export the coefficients directly to `src/data/battery_ml_model.json`, which the React app immediately loads for browser-side predictions.

---

## 🔌 ESP32 REST API Contract

The ESP32 microcontroller must expose the following local network endpoints:

### 1. Telemetry API: `GET /data`
Should return CORS headers (`Access-Control-Allow-Origin: *`) and the JSON telemetry object:
```json
{
  "chambers": {
    "tank1": {
      "name": "Chamber A-1",
      "distanceCm": 4.5,
      "valve": false,
      "batteryParams": {
        "voltage": 12.42,
        "current": 4.5,
        "temperature": 30.5,
        "specificGravity": 1.245,
        "internalResistance": 5.2,
        "stateOfCharge": 82.5
      }
    },
    "tank2": {
      "name": "Chamber A-2",
      "distanceCm": 14.8,
      "valve": true,
      "batteryParams": {
        "voltage": 11.95,
        "current": 3.6,
        "temperature": 34.2,
        "specificGravity": 1.215,
        "internalResistance": 5.7,
        "stateOfCharge": 69.0
      }
    }
  },
  "pump": {
    "status": false,
    "lastUpdated": "2026-06-24T11:06:26Z"
  },
  "system": {
    "mode": "AUTO"
  }
}
```

### 2. Control API: `POST /control`
Receives control adjustments from the dashboard:
- Mode change: `{"mode": "MANUAL"}`
- Pump control (Manual only): `{"pump": true}`
- Valve control: `{"chamberId": "tank1", "valve": true}`

*CORS preflight demands that the ESP32 must also respond with `204 No Content` to HTTP `OPTIONS` requests sent to both routes.*

---

## 📜 License

MIT License — feel free to use and adapt this for local SCADA and industrial IoT testing.
