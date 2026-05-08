import { useChambers, usePump, useSystem, useAlerts, useValveControl, useHistory } from '../hooks/useFirebase';
import toast from 'react-hot-toast';

import SystemOverview from '../components/SystemOverview';
import TankCard from '../components/TankCard';
import PumpStatus from '../components/PumpStatus';
import ValveControl from '../components/ValveControl';
import WaterChart from '../components/WaterChart';
import AlertPanel from '../components/AlertPanel';
import ManualControls from '../components/ManualControls';
import LoadingSkeleton from '../components/LoadingSkeleton';

/**
 * Dashboard Page
 * Main page assembling all monitoring and control components.
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
      toast.success(status ? 'Pump started successfully' : 'Pump stopped', {
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

  // ─── Main Layout ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="mb-2">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">
          Battery Refill <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Real-time monitoring and control for lead-acid battery water level management
        </p>
      </div>

      {/* System Overview Cards */}
      <SystemOverview chambers={chambers} pump={pump} system={system} />

      {/* Active Chamber Monitoring */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-500 to-blue-500" />
          Active Chambers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chambers &&
            Object.entries(chambers)
              .filter(([, d]) => d.active !== false)
              .map(([id, data], index) => (
                <TankCard key={id} chamberId={id} data={data} index={index} onToggleOnline={handleOnlineToggle} />
              ))}
        </div>
      </section>

      {/* Inactive Chambers */}
      {chambers && Object.entries(chambers).some(([, d]) => d.active === false) && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-slate-600" />
            Inactive Chambers
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(chambers)
              .filter(([, d]) => d.active === false)
              .map(([id, data], index) => (
                <TankCard key={id} chamberId={id} data={data} index={index} />
              ))}
          </div>
        </section>
      )}

      {/* Charts Section */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-purple-500 to-violet-500" />
          Analytics
        </h2>
        <WaterChart history={history} chambers={chambers} />
      </section>

      {/* Controls & Alerts Grid */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
          Controls & Alerts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Pump Status */}
          <PumpStatus pump={pump} onToggle={handlePumpToggle} />

          {/* Manual Controls */}
          <ManualControls system={system} onToggleMode={handleModeToggle} />

          {/* Valve Controls */}
          <ValveControl chambers={chambers} onToggleValve={handleValveToggle} />

          {/* Alerts */}
          <AlertPanel alerts={alerts} />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-white/5">
        <p className="text-[10px] text-slate-600">
          BatteryGuard IoT Dashboard v1.0 • Lead-Acid Battery Water Level Management System •{' '}
          <span className="text-cyan-600">ESP32 Connected</span>
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
