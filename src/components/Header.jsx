import { useState, useEffect } from 'react';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { IoNotificationsOutline } from 'react-icons/io5';
import { MdOutlineWaterDrop } from 'react-icons/md';
import { FiWifi, FiWifiOff, FiSettings } from 'react-icons/fi';
import { useAlerts, useChambers } from '../hooks/useFirebase';
import { getActiveSource, setActiveSource } from '../services/dataService';
import { getEsp32Ip, setEsp32Ip } from '../services/esp32Service';

/**
 * Header Component
 * Top navigation bar with system status, notifications, and menu toggle.
 */
const Header = ({ onMenuToggle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  
  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempIp, setTempIp] = useState(getEsp32Ip());
  const [tempSource, setTempSource] = useState(getActiveSource());
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { alerts } = useAlerts();
  const { chambers } = useChambers();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeAlerts = Array.isArray(alerts)
    ? alerts.filter((a) => a.type === 'warning' || a.type === 'error').length
    : 0;

  const activeSource = getActiveSource();
  const esp32Ip = getEsp32Ip();
  
  // ESP32 is online if we're in demo mode OR we have online active chambers
  const isEsp32Online = activeSource === 'demo' 
    ? true 
    : (chambers && Object.entries(chambers).some(([id, c]) => c.active && c.online));

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const cleanIp = tempIp.replace(/^https?:\/\//i, '').replace(/\/$/, '');
      const response = await fetch(`http://${cleanIp}/data`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        setTestResult({ success: true, message: 'Connected successfully!' });
      } else {
        setTestResult({ success: false, message: `Failed: HTTP ${response.status}` });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Unreachable (CORS/Offline)' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = () => {
    setActiveSource(tempSource);
    if (tempSource === 'esp32') {
      const cleanIp = tempIp.replace(/^https?:\/\//i, '').replace(/\/$/, '');
      setEsp32Ip(cleanIp);
    }
    setSettingsOpen(false);
    // Reload page to re-initialize data subscriptions cleanly
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 px-4 md:px-6 lg:px-8 py-4">
      <div className="glass-card px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Left: Menu + Title */}
        <div className="flex items-center gap-3">
          <button
            id="menu-toggle"
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <HiOutlineMenuAlt2 className="w-5 h-5 text-slate-400" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <MdOutlineWaterDrop className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium text-slate-400">
              Lead-Acid Battery Refill System
            </span>
          </div>
        </div>

        {/* Right: Status Indicators */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Telemetry Source Badge */}
          <div className="flex items-center gap-2">
            {activeSource === 'demo' ? (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Demo Mode</span>
              </div>
            ) : isEsp32Online ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">ESP32 Live ({esp32Ip})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">ESP32 Offline</span>
              </div>
            )}
          </div>

          {/* Browser Network Status */}
          <div className="hidden sm:flex items-center gap-1.5">
            {online ? (
              <FiWifi className="w-3.5 h-3.5 text-emerald-400/80" />
            ) : (
              <FiWifiOff className="w-3.5 h-3.5 text-red-400/80" />
            )}
            <span className="text-[10px] text-slate-500">Wi-Fi</span>
          </div>

          {/* Live Clock */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>

          {/* Connection Settings Gear */}
          <button
            onClick={() => {
              setTempIp(getEsp32Ip());
              setTempSource(getActiveSource());
              setSettingsOpen(true);
            }}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <FiSettings className="w-5 h-5 text-slate-400 hover:text-cyan-400 transition-colors" />
          </button>

          {/* Notification Bell */}
          <button
            id="notification-bell"
            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Notifications"
          >
            <IoNotificationsOutline className="w-5 h-5 text-slate-400" />
            {activeAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {activeAlerts}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
            OP
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl relative bg-[#0d111d]">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <FiSettings className="w-5 h-5 text-cyan-400" />
              Connection Settings
            </h3>
            
            <div className="space-y-4">
              {/* Data Source Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Telemetry Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempSource('demo')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      tempSource === 'demo'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-black/20 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Demo Mode (Simulation)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempSource('esp32')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      tempSource === 'esp32'
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                        : 'bg-black/20 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ESP32 Live (Local Wi-Fi)
                  </button>
                </div>
              </div>

              {/* ESP32 IP Input */}
              {tempSource === 'esp32' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ESP32 IP Address / Hostname
                  </label>
                  <input
                    type="text"
                    value={tempIp}
                    onChange={(e) => {
                      setTempIp(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="e.g. 192.168.135.31"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
                  />
                  
                  {/* Test Connection Button */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors disabled:text-slate-600 cursor-pointer"
                    >
                      {testingConnection ? 'Testing...' : '⚡ Test Connection'}
                    </button>
                    
                    {testResult && (
                      <span className={`text-[11px] font-medium ${
                        testResult.success ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {testResult.message}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(false);
                  setTestResult(null);
                }}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-cyan-500/10 transition-all cursor-pointer"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
