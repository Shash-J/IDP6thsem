import { useMemo } from 'react';
import { MdOutlineWaterDrop } from 'react-icons/md';
import { MdBatteryFull } from 'react-icons/md';
import { FiWifi, FiWifiOff } from 'react-icons/fi';
import { getStatusColor, CHAMBER_NAMES, timeAgo } from '../utils/helpers';

/**
 * TankCard Component
 * Displays individual battery chamber status with animated water level indicator.
 * Supports active/inactive and online/offline states.
 * Shows battery electrical parameters when online.
 */
const TankCard = ({ chamberId, data, index = 0, onToggleOnline }) => {
  const statusColors = useMemo(() => getStatusColor(data.status), [data.status]);
  const chamberName = data.name || CHAMBER_NAMES[chamberId] || chamberId;
  const isActive = data.active !== false;
  const isOnline = data.online !== false;
  const bp = data.batteryParams;

  // ─── Inactive Chamber ─────────────────────────────────────────────
  if (!isActive) {
    return (
      <div
        className="glass-card p-5 opacity-40 animate-fade-in"
        style={{ animationDelay: `${index * 80}ms` }}
        id={`tank-card-${chamberId}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-700/30 flex items-center justify-center">
              <MdBatteryFull className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-500">{chamberName}</h3>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{chamberId}</p>
            </div>
          </div>
          <div className="status-badge bg-slate-700/20 text-slate-600 border border-slate-700/30">
            Inactive
          </div>
        </div>

        <div className="water-container h-28 mb-4 border border-white/5">
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-lg font-bold text-slate-600">—</span>
          </div>
        </div>

        <div className="text-center text-xs text-slate-600 py-2">
          No sensor connected
        </div>
      </div>
    );
  }

  // ─── Active Chamber (Online or Offline) ────────────────────────────
  return (
    <div
      className={`glass-card p-5 animate-fade-in ${!isOnline ? 'border-amber-500/20' : ''}`}
      style={{ animationDelay: `${index * 80}ms` }}
      id={`tank-card-${chamberId}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${isOnline ? statusColors.bg : 'bg-amber-500/20'} flex items-center justify-center`}>
            <MdBatteryFull className={`w-5 h-5 ${isOnline ? statusColors.text : 'text-amber-400'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{chamberName}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{chamberId}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`status-badge ${isOnline ? `${statusColors.bg} ${statusColors.text} border ${statusColors.border}` : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
          <span className="relative flex h-1.5 w-1.5">
            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: statusColors.fill }} />}
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: isOnline ? statusColors.fill : '#f59e0b' }} />
          </span>
          {data.status}
        </div>
      </div>

      {/* Online/Offline Toggle */}
      <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-black/20 border border-white/5">
        <div className="flex items-center gap-2">
          {isOnline ? <FiWifi className="w-3.5 h-3.5 text-emerald-400" /> : <FiWifiOff className="w-3.5 h-3.5 text-amber-400" />}
          <span className={`text-[10px] font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isOnline ? 'ONLINE' : 'OFFLINE — Mock Data'}
          </span>
        </div>
        <div
          className={`toggle-switch ${isOnline ? 'on' : 'off'}`}
          onClick={() => onToggleOnline?.(chamberId, !isOnline)}
          role="switch"
          aria-checked={isOnline}
          aria-label={`Toggle ${chamberName} online`}
          style={{ width: '40px', height: '22px' }}
        >
          <div className="toggle-knob" style={{ width: '16px', height: '16px', top: '3px' }} />
        </div>
      </div>

      {/* Water Level Visual */}
      <div className="water-container h-28 mb-3 border border-white/5">
        <div className="absolute inset-0 flex flex-col justify-between py-2 px-2 z-10">
          {[100, 75, 50, 25, 0].map((mark) => (
            <div key={mark} className="flex items-center gap-1">
              <div className="w-3 h-px bg-white/10" />
              <span className="text-[8px] text-slate-600 font-mono">{mark}%</span>
            </div>
          ))}
        </div>

        <div
          className="water-fill"
          style={{
            height: `${Math.min(data.waterPercent || 0, 100)}%`,
            background: isOnline
              ? `linear-gradient(to top, ${statusColors.fill}dd, ${statusColors.fill}66)`
              : 'linear-gradient(to top, rgba(245,158,11,0.5), rgba(245,158,11,0.2))',
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-2xl font-bold text-white drop-shadow-lg font-mono">
            {data.waterPercent != null ? `${Math.round(data.waterPercent)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Level</p>
          <p className="text-xs font-bold text-slate-200 font-mono">
            {data.waterLevel?.toFixed(1) ?? '—'} <span className="text-[9px] text-slate-500">cm</span>
          </p>
        </div>
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Valve</p>
          <p className={`text-xs font-bold ${data.valve ? 'text-cyan-400' : 'text-slate-500'}`}>
            {data.valve ? 'OPEN' : 'CLOSED'}
          </p>
        </div>
      </div>

      {/* Battery Parameters — only shown when online */}
      {bp && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="bg-black/20 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-slate-600 uppercase">Voltage</p>
            <p className="text-[11px] font-bold text-cyan-400 font-mono">{bp.voltage}V</p>
          </div>
          <div className="bg-black/20 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-slate-600 uppercase">Current</p>
            <p className="text-[11px] font-bold text-blue-400 font-mono">{bp.current}A</p>
          </div>
          <div className="bg-black/20 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-slate-600 uppercase">Temp</p>
            <p className={`text-[11px] font-bold font-mono ${bp.temperature > 40 ? 'text-red-400' : bp.temperature > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {bp.temperature}°C
            </p>
          </div>
          <div className="bg-black/20 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-slate-600 uppercase">SoC</p>
            <p className="text-[11px] font-bold text-purple-400 font-mono">{bp.stateOfCharge}%</p>
          </div>
          <div className="bg-black/20 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-slate-600 uppercase">Sp.Gravity</p>
            <p className="text-[11px] font-bold text-teal-400 font-mono">{bp.specificGravity}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-slate-600 uppercase">Resist.</p>
            <p className="text-[11px] font-bold text-orange-400 font-mono">{bp.internalResistance}mΩ</p>
          </div>
        </div>
      )}

      {/* Offline: show mock data notice */}
      {!isOnline && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
          <p className="text-[9px] text-amber-400 text-center">⚠ Offline — Displaying mock data</p>
        </div>
      )}

      {/* Last Update */}
      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <div className="flex items-center gap-1">
          <MdOutlineWaterDrop className="w-3 h-3" />
          <span>Max: 20.0 cm</span>
        </div>
        <span>{data.lastUpdated ? timeAgo(data.lastUpdated) : '—'}</span>
      </div>
    </div>
  );
};

export default TankCard;
