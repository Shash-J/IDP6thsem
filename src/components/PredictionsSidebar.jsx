import { useMemo, useEffect, useState } from 'react';
import { MdOutlineAnalytics } from 'react-icons/md';
import { IoWarningOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline } from 'react-icons/io5';

/**
 * PredictionsSidebar Component
 * Provides real-time SCADA AI diagnostics and comments on battery cell telemetry and health.
 */
export const PredictionsSidebar = ({ chamber, predictions }) => {
  const [pulse, setPulse] = useState(false);

  // Trigger a brief pulse animation whenever telemetry changes
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 500);
    return () => clearTimeout(timer);
  }, [chamber, predictions]);

  const insights = useMemo(() => {
    if (!chamber || !predictions) return [];

    const bp = chamber.batteryParams || {};
    const list = [];

    // 1. Electrolyte Level Insight
    const waterPct = chamber.waterPercent ?? 0;
    if (waterPct < 15) {
      list.push({
        category: 'ELECTROLYTE',
        status: 'CRITICAL',
        title: 'Dry Cell Warning',
        message: `Electrolyte level is critical (${waterPct.toFixed(0)}%). Plates are dangerously exposed. Refill immediately to prevent plate oxidation.`,
        color: 'text-red-400 border-red-500/20 bg-red-500/5',
        icon: IoCloseCircleOutline
      });
    } else if (waterPct < 30) {
      list.push({
        category: 'ELECTROLYTE',
        status: 'WARNING',
        title: 'Low Electrolyte Level',
        message: `Electrolyte level is low (${waterPct.toFixed(0)}%). Solenoid valve should open to replenish electrolyte levels.`,
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        icon: IoWarningOutline
      });
    } else {
      list.push({
        category: 'ELECTROLYTE',
        status: 'NOMINAL',
        title: 'Electrolyte Stable',
        message: `Electrolyte level is healthy (${waterPct.toFixed(0)}%). Plates are fully submerged in solution.`,
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        icon: IoCheckmarkCircleOutline
      });
    }

    // 2. Thermal Profile Insight
    const temp = bp.temperature ?? 25;
    if (temp > 42) {
      list.push({
        category: 'THERMAL',
        status: 'CRITICAL',
        title: 'Thermal Overload',
        message: `Battery core temperature is high (${temp.toFixed(1)}°C). High temperature accelerates grid corrosion and reduces battery life by 2.5x per 10°C elevation.`,
        color: 'text-red-400 border-red-500/20 bg-red-500/5',
        icon: IoCloseCircleOutline
      });
    } else if (temp > 35) {
      list.push({
        category: 'THERMAL',
        status: 'WARNING',
        title: 'Elevated Temp',
        message: `Core temperature is elevated (${temp.toFixed(1)}°C). Monitor ventilation and charge currents.`,
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        icon: IoWarningOutline
      });
    } else {
      list.push({
        category: 'THERMAL',
        status: 'NOMINAL',
        title: 'Thermal Nominal',
        message: `Temperature is stable (${temp.toFixed(1)}°C). Core heat dissipation is within normal limits.`,
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        icon: IoCheckmarkCircleOutline
      });
    }

    // 3. Plate Sulfation Insight
    const sulfation = predictions.sulfation ?? 0;
    if (sulfation > 50) {
      list.push({
        category: 'SULFATION',
        status: 'CRITICAL',
        title: 'Severe Sulfation',
        message: `Lead sulfate accumulation is severe (${sulfation.toFixed(0)}%). Active surface is blocked. Internal resistance spikes will degrade efficiency.`,
        color: 'text-red-400 border-red-500/20 bg-red-500/5',
        icon: IoCloseCircleOutline
      });
    } else if (sulfation > 25) {
      list.push({
        category: 'SULFATION',
        status: 'WARNING',
        title: 'Moderate Sulfation',
        message: `Lead crystallization detected (${sulfation.toFixed(0)}%). Consider equalizing charge cycles to dissolve large sulfate crystals.`,
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        icon: IoWarningOutline
      });
    } else {
      list.push({
        category: 'SULFATION',
        status: 'NOMINAL',
        title: 'Plates Clean',
        message: `Sulfation index is minimal (${sulfation.toFixed(0)}%). Lead plate chemical conversion is operating efficiently.`,
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        icon: IoCheckmarkCircleOutline
      });
    }

    // 4. State of Health (SoH) Insight
    const soh = predictions.soh ?? 100;
    if (soh < 80) {
      list.push({
        category: 'CAPACITY',
        status: 'CRITICAL',
        title: 'Replace Battery Cell',
        message: `SoH is at ${soh.toFixed(0)}%, which is below the EOL threshold (80%). The cell cannot hold nominal charge and must be replaced.`,
        color: 'text-red-400 border-red-500/20 bg-red-500/5',
        icon: IoCloseCircleOutline
      });
    } else if (soh < 88) {
      list.push({
        category: 'CAPACITY',
        status: 'WARNING',
        title: 'Degraded Capacity',
        message: `SoH is degraded (${soh.toFixed(0)}%). Cell is showing aging characteristics but remains operational.`,
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        icon: IoWarningOutline
      });
    } else {
      list.push({
        category: 'CAPACITY',
        status: 'NOMINAL',
        title: 'Full Capacity',
        message: `SoH is healthy (${soh.toFixed(0)}%). Cell active material volume is preserved.`,
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        icon: IoCheckmarkCircleOutline
      });
    }

    // 5. Voltage Insight
    const volt = bp.voltage ?? 12.0;
    if (volt < 11.5) {
      list.push({
        category: 'VOLTAGE',
        status: 'CRITICAL',
        title: 'Deep Discharge',
        message: `Cell voltage is critically low (${volt.toFixed(2)}V). Avoid keeping cell in this state to prevent rapid plate deterioration.`,
        color: 'text-red-400 border-red-500/20 bg-red-500/5',
        icon: IoCloseCircleOutline
      });
    } else if (volt < 12.0) {
      list.push({
        category: 'VOLTAGE',
        status: 'WARNING',
        title: 'Undercharged Cell',
        message: `Voltage is low (${volt.toFixed(2)}V). Charging cycles should be initiated to prevent early sulfate deposition.`,
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        icon: IoWarningOutline
      });
    } else {
      list.push({
        category: 'VOLTAGE',
        status: 'NOMINAL',
        title: 'Voltage Nominal',
        message: `Voltage is stable at ${volt.toFixed(2)}V. Charge state is healthy.`,
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        icon: IoCheckmarkCircleOutline
      });
    }

    return list;
  }, [chamber, predictions]);

  const recommendations = useMemo(() => {
    const recs = [];
    const hasCritical = insights.some(i => i.status === 'CRITICAL');
    const hasWarning = insights.some(i => i.status === 'WARNING');

    insights.forEach(insight => {
      if (insight.status === 'CRITICAL' || insight.status === 'WARNING') {
        if (insight.category === 'ELECTROLYTE') {
          recs.push('Initiate manual refiller sequence or check solenoid valve connection.');
        }
        if (insight.category === 'THERMAL') {
          recs.push('Decrease charge current or activate cooling fans to reduce thermal stress.');
        }
        if (insight.category === 'SULFATION') {
          recs.push('Execute an equalizing charge cycle (constant voltage, low current) for 12-24 hours.');
        }
        if (insight.category === 'CAPACITY') {
          recs.push('Log battery cell serial number for upcoming preventive replacement.');
        }
        if (insight.category === 'VOLTAGE') {
          recs.push('Verify charger connectivity and start charging immediately.');
        }
      }
    });

    if (recs.length === 0) {
      recs.push('All parameters are nominal. Continue standard cycle monitoring.');
      recs.push('Ensure periodic physical inspection of terminals for corrosion.');
    }

    return {
      list: recs,
      priority: hasCritical ? 'CRITICAL ACTION' : hasWarning ? 'MAINTENANCE ADVISORY' : 'NORMAL MONITORING',
      priorityColor: hasCritical ? 'text-red-400 border-red-500/20 bg-red-500/10' : hasWarning ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
    };
  }, [insights]);

  return (
    <div className="glass-card p-4 h-full flex flex-col min-h-0 bg-[#0d111d]/60 border border-white/5 animate-fade-in" id="co-pilot-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 shrink-0 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <MdOutlineAnalytics className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">SCADA Co-Pilot</h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Dynamic Diagnostics</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-cyan-500/5 border border-cyan-500/10 px-2 py-0.5 rounded-full">
          <div className={`w-1.5 h-1.5 rounded-full bg-cyan-400 ${pulse ? 'scale-125' : 'scale-100'} transition-transform duration-300 animate-pulse`} />
          <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
            {pulse ? 'Analyzing...' : 'Live'}
          </span>
        </div>
      </div>

      {/* Insight Status */}
      <div className="mb-3.5 shrink-0">
        <div className={`text-center py-2 px-3 rounded-lg border text-[10px] font-bold tracking-wider font-mono uppercase ${recommendations.priorityColor}`}>
          Status: {recommendations.priority}
        </div>
      </div>

      {/* Insights List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 mb-3.5 scrollbar-thin">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div 
              key={insight.category} 
              className={`p-3 rounded-xl border transition-all duration-300 ${insight.color}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider">{insight.category}</span>
                <span className="text-[9px] font-bold opacity-60 ml-auto">{insight.title}</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed font-sans font-medium">
                {insight.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* Action Plan */}
      <div className="shrink-0 bg-black/30 p-3 rounded-xl border border-white/5">
        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-white/5 pb-1">
          Recommended Action Plan
        </h4>
        <ul className="space-y-1 text-[9px] text-slate-300 leading-relaxed list-disc list-inside">
          {recommendations.list.map((rec, index) => (
            <li key={index} className="marker:text-cyan-400 pl-1 -indent-3 ml-3 font-sans font-medium">
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
