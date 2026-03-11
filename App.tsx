
import React, { useState, useMemo, useEffect } from 'react';
import { Point2D, ExcavationParams } from './types';
import { constrainGroundPoints } from './utils/geometry';
import CrossSectionEditor from './components/CrossSectionEditor';
import Visualizer3D from './components/Visualizer3D';

const DEFAULT_PARAMS: ExcavationParams = {
  length: 10,
  width: 4,
  slopeRatio: 1.5, // 1:1.5 slope
};

const INITIAL_POINTS: Point2D[] = [
  { id: 'start', x: -10, y: 4 },
  { id: 'mid1', x: 0, y: 5 },
  { id: 'end', x: 10, y: 4 },
];

const App: React.FC = () => {
  const [params, setParams] = useState<ExcavationParams>(DEFAULT_PARAMS);
  const [inputValues, setInputValues] = useState({
    length: DEFAULT_PARAMS.length.toString(),
    width: DEFAULT_PARAMS.width.toString(),
    slopeRatio: DEFAULT_PARAMS.slopeRatio.toString(),
  });

  const [points, setPoints] = useState<Point2D[]>(() => 
    constrainGroundPoints(INITIAL_POINTS, DEFAULT_PARAMS)
  );

  // Sync boundary points when width or slope changes
  useEffect(() => {
    setPoints(prev => constrainGroundPoints(prev, params));
  }, [params.width, params.slopeRatio]);

  const volume = useMemo(() => {
    const { length: L, slopeRatio: s, width: W } = params;
    const profile = [
      { x: -W / 2, y: 0 },
      ...points,
      { x: W / 2, y: 0 }
    ];

    let totalVolume = 0;
    for (let i = 0; i < profile.length - 1; i++) {
      const p1 = profile[i];
      const p2 = profile[i + 1];
      const dx = p2.x - p1.x;
      const term1 = L * ((p1.y + p2.y) / 2) * dx;
      const term2 = s * (dx / 3) * (p1.y * p1.y + p1.y * p2.y + p2.y * p2.y);
      totalVolume += term1 + term2;
    }
    return Math.abs(totalVolume);
  }, [points, params]);

  const handleInputChange = (key: keyof ExcavationParams, val: string) => {
    setInputValues(prev => ({ ...prev, [key]: val }));
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setParams(prev => ({ ...prev, [key]: parsed }));
    }
  };

  const updatePointCoordinate = (id: string, axis: 'x' | 'y', val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return;

    setPoints(prev => {
      const newPoints = prev.map(p => p.id === id ? { ...p, [axis]: parsed } : p);
      return constrainGroundPoints(newPoints, params);
    });
  };

  const removePoint = (id: string) => {
    const idx = points.findIndex(p => p.id === id);
    if (idx <= 0 || idx >= points.length - 1 || points.length <= 2) return;
    const newPoints = points.filter(p => p.id !== id);
    setPoints(constrainGroundPoints(newPoints, params));
  };

  const generateAutoCadPoints = () => {
    const { length: L, slopeRatio: s, width: W } = params;
    const profile = [
      { x: -W / 2, y: 0 },
      ...points,
      { x: W / 2, y: 0 }
    ];

    const lines: string[] = [];
    profile.forEach(p => {
      const zOffset = L / 2 + s * p.y;
      lines.push(`${p.x.toFixed(3)},${(-zOffset).toFixed(3)},${p.y.toFixed(3)}`);
    });
    profile.slice().reverse().forEach(p => {
      const zOffset = L / 2 + s * p.y;
      lines.push(`${p.x.toFixed(3)},${zOffset.toFixed(3)},${p.y.toFixed(3)}`);
    });
    return lines.join('\n');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateAutoCadPoints());
  };

  const generateTeklaPoints = () => {
    const { length: L, slopeRatio: s, width: W } = params;
    const profile = [
      { x: -W / 2, y: 0 },
      ...points,
      { x: W / 2, y: 0 }
    ];

    const lines: string[] = [];
    // Front face
    profile.forEach((p, idx) => {
      const zOffset = L / 2 + s * p.y;
      lines.push(`${p.x.toFixed(3)} ${(-zOffset).toFixed(3)} ${p.y.toFixed(3)}`);
    });
    // Back face
    profile.forEach((p, idx) => {
      const zOffset = L / 2 + s * p.y;
      lines.push(`${p.x.toFixed(3)} ${zOffset.toFixed(3)} ${p.y.toFixed(3)}`);
    });
    return lines.join('\n');
  };

  const copyTeklaToClipboard = () => {
    navigator.clipboard.writeText(generateTeklaPoints());
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <header className="bg-slate-900 text-white p-6 shadow-xl border-b-4 border-blue-600 sticky top-0 z-50">
        <div className="container mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-xl rotate-3 shadow-lg">
              <i className="fas fa-mountain text-2xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none uppercase">Excavation Master</h1>
              <p className="text-slate-400 text-xs uppercase tracking-widest mt-1 font-bold">Professional Volume Estimation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-800/80 backdrop-blur px-6 py-3 rounded-2xl border border-slate-700 shadow-inner">
            <div className="text-right">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Net Volume Estimate</div>
              <div className="text-3xl font-black text-blue-400 leading-none">
                {volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-medium">m³</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              Status: <span className="text-emerald-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* HORIZONTAL INSTRUCTION BAR */}
      <div className="bg-blue-600 text-white py-3 px-6 shadow-md z-40">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <i className="fas fa-info-circle"></i>
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Instructions</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border border-white/30 text-[9px]">1</span> Setup Excavation bottom</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border border-white/30 text-[9px]">2</span> Drag red nodes on canvas</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border border-white/30 text-[9px]">3</span> Shift + Click to add nodes</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border border-white/30 text-[9px]">4</span> Copy CAD/Tekla points in sidebar</div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <h2 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2 border-b pb-4 mb-2">
              <i className="fas fa-vector-square text-blue-500"></i> Excavation bottom
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">EXCAVATION LENGTH (Z) [m]</label>
                <div className="relative group">
                  <input type="text" inputMode="decimal" value={inputValues.length} onChange={(e) => handleInputChange('length', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 transition-all" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500">m</div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">EXCAVATION WIDTH (X) [m]</label>
                <div className="relative group">
                  <input type="text" inputMode="decimal" value={inputValues.width} onChange={(e) => handleInputChange('width', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 transition-all" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500">m</div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2">Slope Ratio (1:x)</label>
                <input type="text" inputMode="decimal" value={inputValues.slopeRatio} onChange={(e) => handleInputChange('slopeRatio', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 transition-all" />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col max-h-[500px]">
            <h2 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2 border-b pb-4 mb-4">
              <i className="fas fa-layer-group text-blue-500"></i> Profile Nodes
            </h2>
            <div className="overflow-y-auto pr-1 space-y-3 flex-1 scrollbar-thin scrollbar-thumb-slate-200">
              {points.map((p, idx) => {
                const isEndpoint = idx === 0 || idx === points.length - 1;
                return (
                  <div key={p.id} className={`p-4 rounded-2xl border transition-all ${isEndpoint ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-blue-400 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isEndpoint ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {idx === 0 ? 'LEFT' : idx === points.length - 1 ? 'RIGHT' : `NODE ${idx}`}
                      </span>
                      {!isEndpoint && (
                        <button onClick={() => removePoint(p.id)} className="w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <i className="fas fa-trash text-[10px]"></i>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">X Coord</label>
                        <input
                          type="number"
                          step="0.1"
                          disabled={isEndpoint}
                          value={p.x}
                          onChange={(e) => updatePointCoordinate(p.id, 'x', e.target.value)}
                          className={`w-full text-xs font-mono font-bold p-2.5 border rounded-xl transition-colors ${isEndpoint ? 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed' : 'bg-white text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none border-slate-200'}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Elevation (Y)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={p.y}
                          onChange={(e) => updatePointCoordinate(p.id, 'y', e.target.value)}
                          className="w-full text-xs font-mono font-bold p-2.5 border rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none border-slate-200 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* AUTOCAD POINTS - ALWAYS DISPLAYED */}
          <section className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">AutoCAD 3D Pts</h3>
                <div className="group relative">
                  <i className="fas fa-info-circle text-slate-500 hover:text-white cursor-pointer transition-colors text-xs"></i>
                  <div className="absolute left-0 top-6 w-56 p-3 bg-white text-slate-800 text-[10px] rounded-xl shadow-2xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] leading-relaxed">
                    <p className="font-bold text-blue-600 mb-1 uppercase tracking-wider underline">How to import:</p>
                    1. Click Copy All.<br/>
                    2. In AutoCAD, run <span className="font-bold">3DPOLY</span>.<br/>
                    3. Paste in command line.
                  </div>
                </div>
              </div>
              <button 
                onClick={copyToClipboard} 
                className="text-white bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all active:scale-95"
              >
                COPY ALL
              </button>
            </div>
            <textarea 
              readOnly 
              value={generateAutoCadPoints()} 
              className="w-full h-40 bg-slate-950 text-emerald-400 font-mono text-[9px] p-4 rounded-xl border border-slate-800 focus:outline-none resize-none scrollbar-thin scrollbar-thumb-slate-800" 
              placeholder="Waiting for data..."
            />
            <div className="mt-3 text-[9px] font-bold text-slate-500 uppercase tracking-tighter text-center italic">
              Values automatically update on change
            </div>
          </section>

          {/* TEKLA POINTS */}
          <section className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Tekla Points</h3>
                <div className="group relative">
                  <i className="fas fa-info-circle text-slate-500 hover:text-white cursor-pointer transition-colors text-xs"></i>
                  <div className="absolute left-0 top-6 w-56 p-3 bg-white text-slate-800 text-[10px] rounded-xl shadow-2xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60] leading-relaxed">
                    <p className="font-bold text-emerald-600 mb-1 uppercase tracking-wider underline">How to import:</p>
                    1. Click Copy All.<br/>
                    2. Save as .txt file.<br/>
                    3. In Tekla, use <span className="font-bold">Import Points</span> tool.<br/>
                    4. Format: <span className="font-bold">X Y Z</span> (Space separated).
                  </div>
                </div>
              </div>
              <button 
                onClick={copyTeklaToClipboard} 
                className="text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all active:scale-95"
              >
                COPY ALL
              </button>
            </div>
            <textarea 
              readOnly 
              value={generateTeklaPoints()} 
              className="w-full h-32 bg-slate-950 text-emerald-400 font-mono text-[9px] p-4 rounded-xl border border-slate-800 focus:outline-none resize-none scrollbar-thin scrollbar-thumb-slate-800" 
              placeholder="Waiting for data..."
            />
          </section>
        </aside>

        <div className="lg:col-span-9 flex flex-col gap-8">
          <CrossSectionEditor params={params} points={points} onPointsChange={setPoints} />
          <Visualizer3D params={params} points={points} />
        </div>
      </main>

      <footer className="container mx-auto p-8 pt-0 text-center">
        <div className="inline-flex flex-col items-center gap-2 py-4 px-8 bg-white/50 backdrop-blur rounded-full border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Created by Emil Sjöstedt</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
