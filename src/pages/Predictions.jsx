import { useState, useMemo } from 'react';
import { useChambers } from '../hooks/useFirebase';
import { predictBatteryMetrics } from '../utils/mlInference';
import modelWeights from '../data/battery_ml_model.json';
import { PredictionsSidebar } from '../components/PredictionsSidebar';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { MdScience, MdTrendingDown, MdFlashOn, MdSpeed, MdThermostat, MdWarning, MdOutlineWaterDrop } from 'react-icons/md';

const Predictions = () => {
  const { chambers, loading } = useChambers();
  
  // Tab routing for internal sections
  const [selectedChamberId, setSelectedChamberId] = useState('tank1');
  
  // What-If Simulator state (initialized to nominal battery conditions)
  const [simVoltage, setSimVoltage] = useState(12.4);
  const [simCurrent, setSimCurrent] = useState(4.0);
  const [simTemp, setSimTemp] = useState(28.0);
  const [simResistance, setSimResistance] = useState(5.0);
  const [simGravity, setSimGravity] = useState(1.24);
  const [simElectrolyte, setSimElectrolyte] = useState(100);

  // Filter out inactive chambers
  const activeChambers = useMemo(() => {
    if (!chambers) return [];
    return Object.entries(chambers)
      .filter(([, d]) => d.active !== false)
      .map(([id, d]) => ({ id, ...d }));
  }, [chambers]);

  // Selected chamber current telemetry
  const selectedChamber = useMemo(() => {
    if (!chambers) return null;
    return chambers[selectedChamberId];
  }, [chambers, selectedChamberId]);

  // Real-time ML predictions for the active chamber (or fallback mock)
  const livePredictions = useMemo(() => {
    if (!selectedChamber || !selectedChamber.batteryParams) {
      // Fallback standard prediction if telemetry loading
      return predictBatteryMetrics(12.3, 4.0, 30.0, 5.2, 1.24, 100);
    }
    const bp = selectedChamber.batteryParams;
    return predictBatteryMetrics(
      bp.voltage,
      bp.current,
      bp.temperature,
      bp.internalResistance,
      bp.specificGravity,
      selectedChamber.waterPercent ?? 100
    );
  }, [selectedChamber]);

  // What-If predictions
  const simulatedPredictions = useMemo(() => {
    return predictBatteryMetrics(simVoltage, simCurrent, simTemp, simResistance, simGravity, simElectrolyte);
  }, [simVoltage, simCurrent, simTemp, simResistance, simGravity, simElectrolyte]);

  // Future Decay Curve Projection (180 Days)
  // Calculates expected capacity fade under current operating temperatures
  const decayData = useMemo(() => {
    const data = [];
    const baseSoh = livePredictions.soh;
    const temp = selectedChamber?.batteryParams?.temperature || 28.0;
    
    // Physical degradation rate factor (degrades 2.5x faster for every 10C above 25C)
    const tempFactor = Math.exp(0.09 * Math.max(0, temp - 25));
    const dailyDegradationRate = 0.04 * tempFactor; // base rate per day

    for (let day = 0; day <= 180; day += 15) {
      const sohVal = Math.max(20, baseSoh - dailyDegradationRate * day);
      data.push({
        day: `Day ${day}`,
        SoH: Math.round(sohVal * 10) / 10,
        Threshold: 80 // replacement threshold
      });
    }
    return data;
  }, [livePredictions, selectedChamber]);

  // Color helper for State of Health
  const getSoHColor = (soh) => {
    if (soh >= 90) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (soh >= 80) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-red-400 border-red-500/20 bg-red-500/5';
  };

  // Color helper for progress bar
  const getProgressColor = (soh) => {
    if (soh >= 90) return 'bg-emerald-500';
    if (soh >= 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading || !selectedChamber) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-500 text-sm">
        Loading battery health predictions...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
      {/* Page Header */}
      <div className="shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2">
          Machine Learning <span className="gradient-text">Predictions</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Predictive State of Health (SoH) diagnostics, Remaining Useful Life (RUL) estimation, and degradation forecasting.
        </p>
      </div>

      {/* Main Split Grid Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        {/* Left Section (ML Diagnostics & Graphs) */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0 overflow-y-auto lg:overflow-hidden pr-0.5">
          {/* Chamber Selector */}
          <div className="flex gap-2 bg-black/20 p-1 rounded-xl w-fit shrink-0">
        {activeChambers.map((chamber) => (
          <button
            key={chamber.id}
            onClick={() => {
              setSelectedChamberId(chamber.id);
              // Synced initial What-If sliders to this chamber's current values
              if (chamber.batteryParams) {
                const bp = chamber.batteryParams;
                setSimVoltage(bp.voltage);
                setSimCurrent(bp.current);
                setSimTemp(bp.temperature);
                setSimResistance(bp.internalResistance);
                setSimGravity(bp.specificGravity);
                setSimElectrolyte(chamber.waterPercent ?? 100);
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedChamberId === chamber.id
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {chamber.name}
          </button>
        ))}
      </div>

      {/* Grid 1: Live Predictions */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {/* State of Health Card */}
        <div className={`glass-card p-4 border ${getSoHColor(livePredictions.soh)}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">State of Health (SoH)</p>
              <h3 className="text-xl font-black mt-0.5 font-mono">{livePredictions.soh}%</h3>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full border border-current font-bold uppercase">
              {livePredictions.soh >= 90 ? 'Healthy' : livePredictions.soh >= 80 ? 'Caution' : 'Replace'}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(livePredictions.soh)}`} 
              style={{ width: `${livePredictions.soh}%` }}
            />
          </div>
          
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Estimation of remaining electrochemical capacity relative to nominal capacity. Values below 80% indicate standard end-of-life condition requiring cell replacement.
          </p>
        </div>

        {/* Remaining Useful Life Card */}
        <div className="glass-card p-4 border border-white/5 bg-[#141b2e]/30">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Remaining Useful Life</p>
              <h3 className="text-xl font-black text-cyan-400 mt-0.5 font-mono">{livePredictions.rul} Days</h3>
            </div>
            <span className="text-[9px] text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 font-bold uppercase font-mono">
              ~{Math.round(livePredictions.rul / 30)} Mos
            </span>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-cyan-500 transition-all duration-1000" 
              style={{ width: `${(livePredictions.rul / 365) * 100}%` }}
            />
          </div>
          
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Forecasted operation days before SoH drops below 80%. Computes degradation rate accelerated by peak charging currents and high core temperatures.
          </p>
        </div>

        {/* Sulfation Index Card */}
        <div className="glass-card p-4 border border-white/5 bg-[#141b2e]/30">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Sulfation Index</p>
              <h3 className="text-xl font-black text-purple-400 mt-0.5 font-mono">{livePredictions.sulfation}%</h3>
            </div>
            <span className="text-[9px] text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/5 font-bold uppercase">
              {livePredictions.sulfation < 20 ? 'Negligible' : livePredictions.sulfation < 50 ? 'Moderate' : 'Severe'}
            </span>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-purple-500 transition-all duration-1000" 
              style={{ width: `${livePredictions.sulfation}%` }}
            />
          </div>
          
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Estimates lead sulfate crystal accumulation on lead plates. Severe sulfation blocks chemical energy conversion, spikes internal resistance, and leads to capacity loss.
          </p>
        </div>

        {/* Electrolyte Level Card */}
        {(() => {
          const elPct = selectedChamber?.waterPercent ?? 0;
          const elStatus = elPct <= 15 ? 'Critical' : elPct <= 30 ? 'Low' : 'Healthy';
          const elColor = elPct <= 15
            ? { text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5', bar: 'bg-red-500' }
            : elPct <= 30
            ? { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5', bar: 'bg-amber-500' }
            : { text: 'text-cyan-400', border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', bar: 'bg-cyan-500' };
          return (
            <div className={`glass-card p-4 border ${elColor.border} ${elColor.bg}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Electrolyte Level</p>
                  <h3 className={`text-xl font-black mt-0.5 font-mono ${elColor.text}`}>{elPct.toFixed(1)}%</h3>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${elColor.text} ${elColor.border} ${elColor.bg}`}>
                  {elStatus}
                </span>
              </div>
              
              <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${elColor.bar}`} 
                  style={{ width: `${Math.min(elPct, 100)}%` }}
                />
              </div>
              
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Live electrolyte fill level from ultrasonic sensor. Low levels expose lead plates, accelerating sulfation and reducing capacity. Directly impacts SoH, RUL, and sulfation predictions.
              </p>
            </div>
          );
        })()}
      </div>

      {/* Grid 2: What-If Simulator & Longevity Projection */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Interactive Simulator */}
        <div className="glass-card p-4 flex flex-col justify-between min-h-0">
          <div className="min-h-0 flex flex-col">
            <h3 className="text-xs font-bold text-slate-200 mb-0.5 flex items-center gap-2">
              <MdScience className="w-4 h-4 text-cyan-400" />
              What-If Stress Simulator
            </h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-3">Simulate custom parameter scenarios to observe ML model output</p>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {/* Voltage Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-400 flex items-center gap-1"><MdFlashOn className="text-yellow-400" /> Voltage</span>
                  <span className="text-slate-300 font-mono font-bold">{simVoltage.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="10.5"
                  max="14.5"
                  step="0.05"
                  value={simVoltage}
                  onChange={(e) => setSimVoltage(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Current Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-400 flex items-center gap-1"><MdSpeed className="text-orange-400" /> Current</span>
                  <span className="text-slate-300 font-mono font-bold">{simCurrent.toFixed(1)} A</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.1"
                  value={simCurrent}
                  onChange={(e) => setSimCurrent(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Temperature Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-400 flex items-center gap-1"><MdThermostat className="text-red-400" /> Temperature</span>
                  <span className="text-slate-300 font-mono font-bold">{simTemp.toFixed(1)} °C</span>
                </div>
                <input
                  type="range"
                  min="15.0"
                  max="55.0"
                  step="0.5"
                  value={simTemp}
                  onChange={(e) => setSimTemp(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Internal Resistance Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-400 flex items-center gap-1"><MdWarning className="text-purple-400" /> Internal Resistance</span>
                  <span className="text-slate-300 font-mono font-bold">{simResistance.toFixed(1)} mΩ</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="10.0"
                  step="0.1"
                  value={simResistance}
                  onChange={(e) => setSimResistance(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Specific Gravity Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-400 flex items-center gap-1"><MdScience className="text-emerald-400" /> Specific Gravity</span>
                  <span className="text-slate-300 font-mono font-bold">{simGravity.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="1.100"
                  max="1.300"
                  step="0.005"
                  value={simGravity}
                  onChange={(e) => setSimGravity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Electrolyte Level Slider */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-400 flex items-center gap-1"><MdOutlineWaterDrop className="text-cyan-400" /> Electrolyte Level</span>
                  <span className="text-slate-300 font-mono font-bold">{simElectrolyte.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={simElectrolyte}
                  onChange={(e) => setSimElectrolyte(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Simulator Predictions Outputs */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-white/5 bg-black/10 p-2 rounded-xl shrink-0">
            <div className="text-center">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Sim SoH</p>
              <p className={`text-xs font-bold mt-0.5 font-mono ${
                simulatedPredictions.soh >= 90 ? 'text-emerald-400' : simulatedPredictions.soh >= 80 ? 'text-amber-400' : 'text-red-400'
              }`}>{simulatedPredictions.soh}%</p>
            </div>
            <div className="text-center border-x border-white/5">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Sim RUL</p>
              <p className="text-xs font-bold mt-0.5 text-cyan-400 font-mono">{simulatedPredictions.rul} Days</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Sim Sulfation</p>
              <p className="text-xs font-bold mt-0.5 text-purple-400 font-mono">{simulatedPredictions.sulfation}%</p>
            </div>
          </div>
        </div>

        {/* Future Projection Graph */}
        <div className="glass-card p-4 flex flex-col min-h-0">
          <h3 className="text-xs font-bold text-slate-200 mb-0.5 flex items-center gap-2">
            <MdTrendingDown className="w-4 h-4 text-cyan-400" />
            180-Day Health Decay Curve
          </h3>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-4">ML projected State of Health fade under current thermal load</p>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={decayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis 
                  dataKey="day" 
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 8, fill: '#64748b' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  stroke="rgba(255,255,255,0.1)"
                  tick={{ fontSize: 8, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="glass-card p-2.5 border border-white/10 shadow-xl text-[10px] font-semibold">
                        <p className="text-slate-400 font-mono">{payload[0].payload.day}</p>
                        <p className="text-cyan-400 font-mono mt-1">SoH: {payload[0].value}%</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={80} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="4 4" label={{ value: 'Replace Threshold (80%)', fill: '#ef4444', fontSize: 8, position: 'top' }} />
                <Line 
                  type="monotone" 
                  dataKey="SoH" 
                  stroke="#22d3ee" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, stroke: '#22d3ee', fill: '#0b1120', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ML Model Details & Coefficients Card */}
      <div className="glass-card p-4 border border-white/5 shrink-0">
        <h3 className="text-xs font-bold text-slate-200 mb-0.5">Mathematical Formula & Coefficients</h3>
        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2.5">Regression equations fitted by ordinary least squares (OLS) on timeseries logs</p>

        <div className="grid grid-cols-3 gap-4 font-mono text-[10px] pt-1">
          {/* SoH Coefficients */}
          <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
            <h4 className="font-bold text-cyan-400">State of Health (SoH)</h4>
            <div className="space-y-0.5 text-slate-400 text-[10px]">
              <p>Intercept: {modelWeights.soh.intercept.toFixed(4)}</p>
              <p>Voltage: {modelWeights.soh.coefficients.voltage.toFixed(4)}</p>
              <p>Current: {modelWeights.soh.coefficients.current.toFixed(4)}</p>
              <p>Temperature: {modelWeights.soh.coefficients.temperature.toFixed(4)}</p>
              <p>Resistance: {modelWeights.soh.coefficients.internalResistance.toFixed(4)}</p>
              <p>Spec Gravity: {modelWeights.soh.coefficients.specificGravity.toFixed(4)}</p>
            </div>
          </div>

          {/* RUL Coefficients */}
          <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
            <h4 className="font-bold text-cyan-400">Remaining Life (RUL)</h4>
            <div className="space-y-0.5 text-slate-400 text-[10px]">
              <p>Intercept: {modelWeights.rul.intercept.toFixed(4)}</p>
              <p>Voltage: {modelWeights.rul.coefficients.voltage.toFixed(4)}</p>
              <p>Current: {modelWeights.rul.coefficients.current.toFixed(4)}</p>
              <p>Temperature: {modelWeights.rul.coefficients.temperature.toFixed(4)}</p>
              <p>Resistance: {modelWeights.rul.coefficients.internalResistance.toFixed(4)}</p>
              <p>Spec Gravity: {modelWeights.rul.coefficients.specificGravity.toFixed(4)}</p>
            </div>
          </div>

          {/* Sulfation Coefficients */}
          <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
            <h4 className="font-bold text-cyan-400">Sulfation Index</h4>
            <div className="space-y-0.5 text-slate-400 text-[10px]">
              <p>Intercept: {modelWeights.sulfation.intercept.toFixed(4)}</p>
              <p>Voltage: {modelWeights.sulfation.coefficients.voltage.toFixed(4)}</p>
              <p>Current: {modelWeights.sulfation.coefficients.current.toFixed(4)}</p>
              <p>Temperature: {modelWeights.sulfation.coefficients.temperature.toFixed(4)}</p>
              <p>Resistance: {modelWeights.sulfation.coefficients.internalResistance.toFixed(4)}</p>
              <p>Spec Gravity: {modelWeights.sulfation.coefficients.specificGravity.toFixed(4)}</p>
            </div>
          </div>
        </div>

        <div className="mt-2.5 bg-black/40 p-2.5 rounded-lg border border-white/5 text-[9px] leading-relaxed">
          <p className="text-slate-400 font-semibold mb-0.5">💡 Training Custom Battery Datasets:</p>
          <p className="text-slate-500">
            To train this model on other batteries, collect time-series telemetry in the same JSON structure and execute the Python pipeline: <code className="text-cyan-500 bg-cyan-950/20 px-1 rounded">python scripts/train_battery_ml.py</code>. The script automatically recalculates the ordinary least squares coefficients and updates the React dashboard's coefficients instantly.
          </p>
        </div>
      </div>
    </div>

    {/* Right Section (Co-Pilot Sidebar) */}
    <div className="lg:col-span-1 min-h-0 h-full">
      <PredictionsSidebar chamber={selectedChamber} predictions={livePredictions} />
    </div>
  </div>
</div>
);
};

export default Predictions;
