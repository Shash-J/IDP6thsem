import { IoWarningOutline, IoInformationCircleOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline } from 'react-icons/io5';
import { MdNotificationsActive } from 'react-icons/md';
import { getAlertStyle, timeAgo } from '../utils/helpers';

/**
 * Alert icons by type
 */
const ALERT_ICONS = {
  warning: IoWarningOutline,
  error: IoCloseCircleOutline,
  info: IoInformationCircleOutline,
  success: IoCheckmarkCircleOutline,
};

/**
 * AlertPanel Component
 * Displays system alerts and warnings with color-coded severity.
 */
const AlertPanel = ({ alerts }) => {
  const alertList = Array.isArray(alerts) ? alerts : [];

  return (
    <div className="glass-card p-5 h-full flex flex-col" id="alert-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <MdNotificationsActive className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">System Alerts</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {alertList.length} active alert{alertList.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {alertList.filter((a) => a.type === 'error' || a.type === 'warning').length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold border border-red-500/20">
            Action Required
          </span>
        )}
      </div>

      {/* Alert List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
        {alertList.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">
            <IoCheckmarkCircleOutline className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
            No active alerts
          </div>
        ) : (
          alertList.map((alert) => {
            const style = getAlertStyle(alert.type);
            const Icon = ALERT_ICONS[alert.type] || IoInformationCircleOutline;

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-xl ${style.bg} border ${style.border} transition-all hover:brightness-110`}
                id={`alert-${alert.id}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {alert.message}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {timeAgo(alert.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
