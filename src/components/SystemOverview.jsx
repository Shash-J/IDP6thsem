import { useMemo } from 'react';
import { MdSpeed, MdOutlineWaterDrop, MdBatteryFull, MdBatteryAlert } from 'react-icons/md';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

/**
 * SystemOverview Component
 * Summary statistics cards showing key system metrics at a glance.
 */
const SystemOverview = ({ chambers, pump, system }) => {
  const stats = useMemo(() => {
    if (!chambers) return [];

    const allEntries = Object.values(chambers);
    const entries = allEntries.filter((c) => c.active !== false);
    const activeCount = entries.length;
    const totalCount = allEntries.length;
    const onlineCount = entries.filter((c) => c.online !== false).length;
    const avgLevel = entries.length > 0
      ? entries.filter((c) => c.waterPercent != null).reduce((sum, c) => sum + (c.waterPercent || 0), 0) / Math.max(1, entries.filter((c) => c.waterPercent != null).length)
      : 0;
    const lowCount = entries.filter((c) => c.status === 'Low' || (c.waterPercent != null && c.waterPercent < 30)).length;
    const fillingCount = entries.filter((c) => c.status === 'Filling').length;
    const normalCount = entries.filter((c) => c.status === 'Normal' || c.status === 'Full').length;

    return [
      {
        label: 'Avg. Electrolyte Level',
        value: `${avgLevel.toFixed(1)}%`,
        icon: MdOutlineWaterDrop,
        color: 'from-cyan-500 to-blue-500',
        bgColor: 'bg-cyan-500/10',
        textColor: 'text-cyan-400',
        trend: avgLevel > 50 ? 'up' : 'down',
      },
      {
        label: 'Active Chambers',
        value: `${onlineCount}/${activeCount}`,
        icon: MdBatteryFull,
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        subtitle: `${totalCount - activeCount} inactive`,
      },
      {
        label: 'Low Level Alerts',
        value: lowCount.toString(),
        icon: MdBatteryAlert,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        textColor: lowCount > 0 ? 'text-red-400' : 'text-emerald-400',
        subtitle: lowCount > 0 ? 'Attention needed' : 'All normal',
      },
      {
        label: 'System Mode',
        value: system?.mode || 'AUTO',
        icon: MdSpeed,
        color: 'from-purple-500 to-violet-500',
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-400',
        subtitle: pump?.status ? 'Pump Active' : 'Pump Idle',
      },
    ];
  }, [chambers, pump, system]);

  if (stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="system-overview">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="glass-card p-4 animate-fade-in group"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
            </div>
            {stat.trend && (
              <div className={`flex items-center gap-0.5 text-[10px] font-medium ${
                stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {stat.trend === 'up' ? (
                  <FiTrendingUp className="w-3 h-3" />
                ) : (
                  <FiTrendingDown className="w-3 h-3" />
                )}
              </div>
            )}
          </div>

          <p className="text-lg md:text-xl font-bold text-slate-100 font-mono mb-0.5">
            {stat.value}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
            {stat.label}
          </p>
          {stat.subtitle && (
            <p className={`text-[10px] mt-1 ${stat.textColor}`}>{stat.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default SystemOverview;
