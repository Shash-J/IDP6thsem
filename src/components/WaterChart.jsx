import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CHAMBER_NAMES, CHART_COLORS, formatTime } from '../utils/helpers';
import { MdShowChart } from 'react-icons/md';

/**
 * Custom Tooltip for the chart
 */
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass-card p-3 border border-white/10 shadow-xl !backdrop-blur-xl">
      <p className="text-[10px] text-slate-400 mb-2 font-mono">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-slate-200 font-semibold font-mono">
            {entry.value?.toFixed(1)}{unit}
          </span>
        </div>
      ))}
    </div>
  );
};

const METRICS = [
  { id: 'waterPercent', label: 'Water Level', unit: '%', domain: [0, 100] },
  { id: 'voltage', label: 'Voltage', unit: 'V', domain: ['auto', 'auto'] },
  { id: 'current', label: 'Current', unit: 'A', domain: ['auto', 'auto'] },
  { id: 'temperature', label: 'Temperature', unit: '°C', domain: ['auto', 'auto'] },
  { id: 'stateOfCharge', label: 'State of Charge', unit: '%', domain: [0, 100] },
];

/**
 * WaterChart Component
 * Real-time area chart displaying various metrics over time for all chambers.
 */
const WaterChart = ({ history, chambers }) => {
  const [timeRange, setTimeRange] = useState('6h');
  const [selectedMetric, setSelectedMetric] = useState(METRICS[0]);

  const chartData = useMemo(() => {
    if (!history || !chambers) return [];

    // Only chart active chambers that have history
    const chamberIds = Object.entries(chambers)
      .filter(([, d]) => d.active !== false)
      .map(([id]) => id);
    const firstChamber = chamberIds.find((id) => history[id]?.length > 0);
    if (!firstChamber) return [];

    const maxPoints = timeRange === '1h' ? 6 : timeRange === '6h' ? 20 : 48;
    const entries = history[firstChamber]?.slice(-maxPoints) || [];

    return entries.map((entry, idx) => {
      const point = { time: formatTime(entry.timestamp) };
      chamberIds.forEach((id) => {
        const historyEntry = history[id]?.[history[id].length - maxPoints + idx];
        let val = 0;
        if (selectedMetric.id === 'waterPercent') {
          val = historyEntry?.waterPercent;
        } else {
          val = historyEntry?.batteryParams?.[selectedMetric.id];
        }
        point[chambers[id]?.name || CHAMBER_NAMES[id] || id] = val || 0;
      });
      return point;
    });
  }, [history, chambers, timeRange, selectedMetric]);

  const activeChambers = useMemo(() => {
    if (!chambers) return [];
    return Object.entries(chambers)
      .filter(([, d]) => d.active !== false)
      .map(([id, d]) => ({
        id,
        name: d.name || CHAMBER_NAMES[id] || id,
        color: CHART_COLORS[id] || '#06b6d4',
      }));
  }, [chambers]);

  const ranges = [
    { label: '1H', value: '1h' },
    { label: '6H', value: '6h' },
    { label: '24H', value: '24h' },
  ];

  return (
    <div className="glass-card p-5" id="water-chart">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <MdShowChart className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">System Analytics</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Real-time monitoring</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Metric Selector */}
          <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1 overflow-x-auto max-w-full">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedMetric.id === m.id
                    ? 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Time Range Buttons */}
          <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1 shrink-0">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === r.value
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] md:h-[320px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {activeChambers.map((c) => (
                  <linearGradient key={c.id} id={`gradient-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={c.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                stroke="rgba(255,255,255,0.1)"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={selectedMetric.domain}
                stroke="rgba(255,255,255,0.1)"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}${selectedMetric.unit}`}
              />
              <Tooltip content={<CustomTooltip unit={selectedMetric.unit} />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                iconType="circle"
                iconSize={8}
              />
              {activeChambers.map((c) => (
                <Area
                  key={c.id}
                  type="monotone"
                  dataKey={c.name}
                  stroke={c.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${c.id})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: c.color, fill: '#0a0e1a' }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-600 text-sm">
            Loading chart data...
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterChart;
