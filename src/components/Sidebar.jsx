import { MdDashboard, MdBarChart, MdOutlineWaterDrop } from 'react-icons/md';
import { IoClose } from 'react-icons/io5';
import { MdBatteryChargingFull } from 'react-icons/md';
import { useChambers } from '../hooks/useFirebase';

/**
 * Sidebar Component
 * Slide-out overlay navigation on all screen sizes.
 * Opens via hamburger menu, closes via X button or clicking the backdrop.
 */
const Sidebar = ({ isOpen, onClose, activeTab, onTabChange }) => {
  const { chambers } = useChambers();
  
  const navItems = [
    { id: 'dashboard', icon: MdDashboard, label: 'Dashboard' },
    { id: 'predictions', icon: MdBarChart, label: 'ML Predictions' },
  ];

  // Count active/online chambers
  const activeChambers = chambers
    ? Object.values(chambers).filter(c => c.active).length
    : 0;

  return (
    <>
      {/* Backdrop overlay — visible when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          sidebar fixed top-0 left-0 bottom-0 w-[260px] z-50
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <MdBatteryChargingFull className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold gradient-text tracking-tight">BatteryGuard</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">IoT Dashboard</p>
            </div>
          </div>

          {/* Close button — always visible */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <IoClose className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/5" />

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <p className="px-3 pb-2 text-[10px] text-slate-600 font-semibold tracking-widest uppercase">
            Navigation
          </p>
          {navItems.map((item) => (
            <a
              key={item.id}
              href="#"
              className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onTabChange(item.id);
                onClose();
              }}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* System Info */}
        <div className="px-4 pb-6">
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MdOutlineWaterDrop className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-300">System Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Chambers Active</span>
                <span className="text-cyan-400 font-medium">{activeChambers} / 2</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">ML Model Status</span>
                <span className="text-emerald-400 font-medium">Ready</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Architecture</span>
                <span className="text-slate-400 font-mono text-[10px]">Cloudless LAN</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
