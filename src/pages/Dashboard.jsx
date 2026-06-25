import { useChambers, usePump, useSystem, useAlerts, useValveControl, useHistory } from '../hooks/useFirebase';
import toast from 'react-hot-toast';
import { MdTune, MdPower, MdPowerOff, MdAndroid, MdBuild } from 'react-icons/md';

import SystemOverview from '../components/SystemOverview';
import TankCard from '../components/TankCard';
import WaterChart from '../components/WaterChart';
import AlertPanel from '../components/AlertPanel';
import LoadingSkeleton from '../components/LoadingSkeleton';

/**
 * Dashboard Page
 * Main page assembling all monitoring and control components in a compact cockpit layout.
 */
const Dashboard = () => {
  const { chambers, loading: chambersLoading, toggleOnline } = useChambers();
  const { pump, loading: pumpLoading, togglePump } = usePump();
  const { system, loading: systemLoading, toggleMode } = useSystem();
  const { alerts, loading: alertsLoading } = useAlerts();
  const { toggleValve } = useValveControl();
  const { history, loading: historyLoading } = useHistory();

  const isLoading = chambersLoading || pumpLoading || systemLoading;

  // ─── Handlers ────────────────────────────────────────────────────

  const handlePumpToggle = async (status) => {
    try {
      await togglePump(status);
      toast.success(status ? 'Pump started manually' : 'Pump stopped', {
        icon: status ? '🟢' : '🔴',
      });
    } catch (err) {
      toast.error('Failed to toggle pump');
    }
  };

  const handleValveToggle = async (chamberId, state) => {
    try {
      await toggleValve(chamberId, state);
      toast.success(`Valve ${state ? 'opened' : 'closed'} for ${chamberId}`, {
        icon: state ? '💧' : '🚫',
      });
    } catch (err) {
      toast.error('Failed to toggle valve');
    }
  };

  const handleModeToggle = async (mode) => {
    try {
      await toggleMode(mode);
      toast.success(`Switched to ${mode} mode`, {
        icon: mode === 'AUTO' ? '🤖' : '🔧',
      });
    } catch (err) {
      toast.error('Failed to change mode');
    }
  };

  const handleOnlineToggle = async (chamberId, isOnline) => {
    try {
      await toggleOnline(chamberId, isOnline);
      toast.success(isOnline ? `${chamberId} is now online` : `${chamberId} switched to offline (mock data)`, {
        icon: isOnline ? '🟢' : '🟡',
      });
    } catch (err) {
      toast.error('Failed to toggle online status');
    }
  };

  // ─── Loading State ────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const activeChambers = chambers
    ? Object.entries(chambers).filter(([, d]) => d.active !== false)
    : [];

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
      {/* Title & Info Block */}
      <div className="shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">
          Battery Refill <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time monitoring and control for lead-acid battery water level management
        </p>
      </div>

      {/* System Overview Row */}
      <div className="shrink-0">
        <SystemOverview chambers={chambers} pump={pump} system={system} />
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Column: Chambers Telemetry & Charts */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          
          {/* Chamber Telemetry Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
            {activeChambers.map(([id, data], index) => (
              <TankCard 
                key={id} 
                chamberId={id} 
                data={data} 
                index={index} 
                onToggleOnline={handleOnlineToggle} 
              />
            ))}
          </div>
          
          {/* Recharts Analytics Chart (fills remaining space) */}
          <div className="flex-1 min-h-0">
            <WaterChart history={history} chambers={chambers} />
          </div>
        </div>

        {/* Right Column: Unified Controls & Alerts */}
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
          
          {/* Consolidated Device Control Console */}
          <div className="glass-card p-4 shrink-0 bg-[#121625]/40 border border-white/5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MdTune className="w-4 h-4 text-cyan-400" />
              Device Control Panel
            </h3>
            
            {/* Pump and Mode Controls */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Pump Toggle */}
              <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Refill Pump</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${pump?.status ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  </div>
                  <p className={`text-xs font-black mt-1 font-mono ${pump?.status ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {pump?.status ? 'RUNNING' : 'STOPPED'}
                  </p>
                </div>
                <button
                  onClick={() => handlePumpToggle(!pump?.status)}
                  className={`w-full py-1.5 mt-3 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-1 border ${
                    pump?.status 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  {pump?.status ? <MdPowerOff /> : <MdPower />}
                  {pump?.status ? 'Stop' : 'Start'}
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">System Mode</span>
                    <span className="text-[10px] text-slate-600 font-mono font-bold">MODE</span>
                  </div>
                  <p className="text-xs font-black text-cyan-400 mt-1 font-mono">
                    {system?.mode || 'AUTO'}
                  </p>
                </div>
                <button
                  onClick={() => handleModeToggle(system?.mode === 'AUTO' ? 'MANUAL' : 'AUTO')}
                  className="w-full py-1.5 mt-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-1"
                >
                  {system?.mode === 'AUTO' ? <MdBuild /> : <MdAndroid />}
                  {system?.mode === 'AUTO' ? 'Manual' : 'Auto'}
                </button>
              </div>
            </div>

            {/* Solenoid Valve Switches */}
            <div className="bg-black/25 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2.5">Solenoid Valves</p>
              <div className="space-y-2">
                {activeChambers.map(([id, data]) => (
                  <div key={id} className="flex items-center justify-between text-xs p-1 hover:bg-white/[0.02] rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${data.valve ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span className="text-slate-300 font-medium">{data.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono font-bold ${data.valve ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {data.valve ? 'OPEN' : 'CLOSED'}
                      </span>
                      <div
                        className={`toggle-switch ${data.valve ? 'on' : 'off'}`}
                        onClick={() => handleValveToggle(id, !data.valve)}
                        role="switch"
                        aria-checked={data.valve}
                        style={{ width: '34px', height: '18px' }}
                      >
                        <div className="toggle-knob" style={{ width: '12px', height: '12px', top: '3px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Alerts panel (fills remaining height) */}
          <div className="flex-1 min-h-0">
            <AlertPanel alerts={alerts} />
          </div>
        </div>
      </div>

      {/* Footer Block */}
      <footer className="text-center py-1.5 shrink-0 border-t border-white/5">
        <p className="text-[9px] text-slate-600">
          BatteryGuard IoT Dashboard v1.0 • Cloudless SCADA Layout • <span className="text-cyan-600 font-semibold font-mono">ESP32: Connected</span>
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
