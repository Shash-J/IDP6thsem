import { useState, useEffect } from 'react';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { IoNotificationsOutline } from 'react-icons/io5';
import { MdOutlineWaterDrop } from 'react-icons/md';
import { FiWifi, FiWifiOff } from 'react-icons/fi';
import { useAlerts } from '../hooks/useFirebase';

/**
 * Header Component
 * Top navigation bar with system status, notifications, and menu toggle.
 */
const Header = ({ onMenuToggle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const { alerts } = useAlerts();

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
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {online ? (
              <FiWifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <FiWifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-medium ${online ? 'text-emerald-400' : 'text-red-400'}`}>
              {online ? 'Connected' : 'Offline'}
            </span>
          </div>

          {/* Live Clock */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {currentTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>

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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold">
            OP
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
