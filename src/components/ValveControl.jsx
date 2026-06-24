import { CHAMBER_NAMES, getStatusColor } from '../utils/helpers';
import { MdOutlineToggleOn } from 'react-icons/md';

/**
 * ValveControl Component
 * Displays valve state for all chambers with toggle controls.
 */
const ValveControl = ({ chambers, onToggleValve }) => {
  if (!chambers) return null;

  const chamberEntries = Object.entries(chambers).filter(([, d]) => d.active !== false);

  return (
    <div className="glass-card p-5" id="valve-control-card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <MdOutlineToggleOn className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Valve Controls</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            {chamberEntries.filter(([, d]) => d.valve).length} of {chamberEntries.length} Open
          </p>
        </div>
      </div>

      {/* Valve List */}
      <div className="space-y-2.5">
        {chamberEntries.map(([id, data]) => {
          const colors = getStatusColor(data.status);
          return (
            <div
              key={id}
              className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
              id={`valve-${id}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${data.valve ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                <div>
                  <p className="text-xs font-medium text-slate-300">
                    {CHAMBER_NAMES[id] || id}
                  </p>
                  <p className={`text-[10px] ${colors.text}`}>{data.status}</p>
                </div>
              </div>

              {/* Toggle */}
              <div
                className={`toggle-switch ${data.valve ? 'on' : 'off'}`}
                onClick={() => onToggleValve(id, !data.valve)}
                role="switch"
                aria-checked={data.valve}
                aria-label={`Toggle valve for ${CHAMBER_NAMES[id]}`}
              >
                <div className="toggle-knob" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ValveControl;
