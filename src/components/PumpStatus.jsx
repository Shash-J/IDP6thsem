import { useMemo } from 'react';
import { MdPower, MdPowerOff, MdOutlineWater } from 'react-icons/md';
import { timeAgo, formatTimestamp } from '../utils/helpers';

/**
 * PumpStatus Component
 * Displays pump ON/OFF state with animated indicator and timestamp.
 */
const PumpStatus = ({ pump, onToggle }) => {
  const isOn = pump?.status === true;

  return (
    <div className="glass-card p-5" id="pump-status-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isOn ? 'bg-emerald-500/20' : 'bg-slate-700/30'
          }`}>
            <MdOutlineWater className={`w-5 h-5 ${isOn ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Pump System</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Primary Refill Pump</p>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center mb-5">
        <div className="relative">
          {/* Outer glow ring */}
          {isOn && (
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" style={{ animationDuration: '2s' }} />
          )}
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            border-2 transition-all duration-500
            ${isOn
              ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-800/50 border-slate-600/30'
            }
          `}>
            {isOn ? (
              <MdPower className="w-8 h-8 text-emerald-400" />
            ) : (
              <MdPowerOff className="w-8 h-8 text-slate-500" />
            )}
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center mb-4">
        <p className={`text-lg font-bold ${isOn ? 'text-emerald-400' : 'text-slate-500'}`}>
          {isOn ? 'RUNNING' : 'STOPPED'}
        </p>
        <p className="text-[10px] text-slate-600 mt-1">
          Last updated: {pump?.lastUpdated ? timeAgo(pump.lastUpdated) : 'N/A'}
        </p>
      </div>

      {/* Toggle Button */}
      <button
        id="pump-toggle-btn"
        onClick={() => onToggle(!isOn)}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
          isOn
            ? 'glow-btn-danger'
            : 'glow-btn-success'
        }`}
      >
        {isOn ? 'Stop Pump' : 'Start Pump'}
      </button>
    </div>
  );
};

export default PumpStatus;
