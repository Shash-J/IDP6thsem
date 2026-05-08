# BatteryGuard — Lead-Acid Battery Water Level Management System

A professional IoT dashboard built with React + Vite for real-time monitoring and control of lead-acid battery water refill chambers. Designed for industrial environments using ESP32 microcontrollers and ultrasonic sensors.

![Dashboard Preview](docs/preview.png)

---

## ✨ Features

- **Real-time Chamber Monitoring** — Live water level percentages, status indicators, and animated water fills for 6 battery chambers
- **Interactive Charts** — Recharts-powered area chart with time range selection (1H / 6H / 24H)
- **Pump Control** — Toggle the primary refill pump ON/OFF with animated status indicator
- **Valve Management** — Per-chamber valve toggle switches with live state display
- **System Mode** — AUTO/MANUAL mode toggle with safety cutoff indicators
- **Alert Panel** — Color-coded system alerts (warnings, errors, info, success)
- **Responsive Design** — Works on desktop, tablet, and mobile devices
- **Dark Theme** — Professional IoT-style glassmorphism UI
- **Demo Mode** — Built-in simulated data for development and demonstrations
- **Firebase Integration** — Real-time database sync when connected to Firebase

---

## 🛠 Tech Stack

| Technology     | Purpose                          |
| -------------- | -------------------------------- |
| React 19       | UI Framework                     |
| Vite 8         | Build Tool & Dev Server          |
| Tailwind CSS 4 | Utility-first Styling            |
| Firebase RTDB  | Real-time Database               |
| Recharts       | Data Visualization               |
| react-hot-toast | Toast Notifications             |
| react-icons    | Icon Library                     |

---

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   ├── TankCard.jsx
│   ├── PumpStatus.jsx
│   ├── ValveControl.jsx
│   ├── WaterChart.jsx
│   ├── AlertPanel.jsx
│   ├── ManualControls.jsx
│   ├── SystemOverview.jsx
│   └── LoadingSkeleton.jsx
├── pages/
│   └── Dashboard.jsx   # Main dashboard page
├── services/
│   ├── dataService.js  # Service router (Firebase/Demo)
│   └── demoData.js     # Simulated real-time data
├── firebase/
│   ├── config.js       # Firebase initialization
│   ├── service.js      # Firebase CRUD operations
│   └── index.js        # Barrel exports
├── hooks/
│   └── useFirebase.js  # Custom React hooks
├── utils/
│   └── helpers.js      # Utility functions
├── App.jsx             # Root component
├── main.jsx            # Entry point
└── index.css           # Global styles & design tokens
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd idp_webpage

# Install dependencies
npm install

# Start development server
npm run dev
```

The app starts in **demo mode** by default — no Firebase credentials needed.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Set to 'true' for demo data, 'false' for Firebase
VITE_USE_DEMO_DATA=true

# Firebase config (only needed when VITE_USE_DEMO_DATA=false)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

---

## 🔥 Firebase Setup

### Expected Database Structure

```json
{
  "chambers": {
    "tank1": {
      "waterPercent": 72,
      "waterLevel": 14,
      "status": "Normal",
      "valve": true
    },
    "tank2": {
      "waterPercent": 20,
      "waterLevel": 4,
      "status": "Low",
      "valve": false
    }
  },
  "pump": {
    "status": true,
    "lastUpdated": "2025-05-08T10:00:00Z"
  },
  "system": {
    "mode": "AUTO"
  }
}
```

### Connecting to Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Realtime Database
3. Copy your config credentials to `.env`
4. Set `VITE_USE_DEMO_DATA=false`
5. Restart the dev server

---

## 📦 Build & Deploy

### Production Build

```bash
npm run build
```

Output is in the `dist/` directory.

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to [vercel.com](https://vercel.com) for automatic deployments.

---

## 🏗 ESP32 Integration

This dashboard is designed to receive data from ESP32 microcontrollers with ultrasonic sensors. The ESP32 firmware should:

1. Read water level from HC-SR04 ultrasonic sensors
2. Calculate water percentage based on tank dimensions
3. Push data to Firebase Realtime Database
4. Listen for pump/valve control commands from Firebase

---

## 📜 License

MIT License — feel free to use for any purpose.
