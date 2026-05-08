import { MdTune, MdSettings } from 'react-icons/md';

/**
 * ManualControls Component
 * Auto/Manual mode toggle and system control buttons.
 */
const ManualControls = ({ system, onToggleMode }) => {
  const isAuto = system?.mode === 'AUTO';

  return (
    <div className="glass-card p-5" id="manual-controls">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <MdTune className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">System Controls</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mode & Configuration</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="mb-5">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Operation Mode</p>
        <div className="flex items-center gap-2 bg-black/20 rounded-xl p-1.5">
          <button
            onClick={() => onToggleMode('AUTO')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isAuto
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <MdSettings className="w-4 h-4 mx-auto mb-1" />
            AUTO
          </button>
          <button
            onClick={() => onToggleMode('MANUAL')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              !isAuto
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <MdTune className="w-4 h-4 mx-auto mb-1" />
            MANUAL
          </button>
        </div>
      </div>

      {/* Status Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
          <span className="text-xs text-slate-400">Current Mode</span>
          <span className={`text-xs font-bold ${isAuto ? 'text-cyan-400' : 'text-amber-400'}`}>
            {system?.mode || 'AUTO'}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
          <span className="text-xs text-slate-400">Manual Override</span>
          <span className={`text-xs font-bold ${!isAuto ? 'text-amber-400' : 'text-slate-600'}`}>
            {!isAuto ? 'ACTIVE' : 'DISABLED'}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
          <span className="text-xs text-slate-400">Safety Cutoff</span>
          <span className="text-xs font-bold text-emerald-400">ENABLED</span>
        </div>
      </div>

      {/* Warning */}
      {!isAuto && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 leading-relaxed">
            ⚠ Manual mode active. Automated safety limits remain enabled but pump and valve operations require manual intervention.
          </p>
        </div>
      )}
    </div>
  );
};

export default ManualControls;
