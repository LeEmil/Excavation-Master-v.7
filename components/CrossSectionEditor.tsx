
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Point2D, ExcavationParams } from '../types';
import { constrainGroundPoints, snapToInterval } from '../utils/geometry';

interface Props {
  params: ExcavationParams;
  points: Point2D[];
  onPointsChange: (points: Point2D[]) => void;
}

const CrossSectionEditor: React.FC<Props> = ({ params, points, onPointsChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  
  // View State
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const pointsRef = useRef(points);
  const paramsRef = useRef(params);
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { paramsRef.current = params; }, [params]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const width = 800;
  const height = 450;
  const padding = 60;
  const baseScale = 30;
  const scale = baseScale * zoom;

  const toSVG = useCallback((x: number, y: number) => ({
    cx: width / 2 + x * scale + offset.x,
    cy: height - padding - y * scale + offset.y
  }), [scale, width, height, padding, offset]);

  const fromSVG = useCallback((cx: number, cy: number) => ({
    x: snapToInterval((cx - width / 2 - offsetRef.current.x) / (baseScale * zoomRef.current)),
    y: snapToInterval((height - padding - cy + offsetRef.current.y) / (baseScale * zoomRef.current))
  }), [height, padding]);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (draggingPointId && svgRef.current) {
      const CTM = svgRef.current.getScreenCTM();
      if (!CTM) return;

      const px = (e.clientX - CTM.e) / CTM.a;
      const py = (e.clientY - CTM.f) / CTM.d;

      const { x, y } = fromSVG(px, py);
      const clampedY = Math.max(0, y);

      const newPoints = pointsRef.current.map(p => {
        if (p.id === draggingPointId) {
          return { ...p, x, y: clampedY };
        }
        return p;
      });

      onPointsChange(constrainGroundPoints(newPoints, paramsRef.current));
    } else if (isPanning) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [draggingPointId, isPanning, fromSVG, onPointsChange]);

  const stopDrag = useCallback(() => {
    setDraggingPointId(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (draggingPointId || isPanning) {
        requestAnimationFrame(() => handleDrag(e));
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [draggingPointId, isPanning, handleDrag, stopDrag]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
    }
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Click to pan
      e.preventDefault();
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    if (!svgRef.current) return;
    if (e.shiftKey && !hoveredPointId) {
      const CTM = svgRef.current.getScreenCTM();
      if (!CTM) return;
      const px = (e.clientX - CTM.e) / CTM.a;
      const py = (e.clientY - CTM.f) / CTM.d;
      const { x, y } = fromSVG(px, py);

      let insertIndex = 1;
      for (let i = 0; i < points.length - 1; i++) {
        if (x > points[i].x && x < points[i+1].x) {
          insertIndex = i + 1;
          break;
        }
      }

      const newPoint: Point2D = { id: Math.random().toString(36).substr(2, 9), x, y: Math.max(0, y) };
      const newPoints = [...points];
      newPoints.splice(insertIndex, 0, newPoint);
      onPointsChange(constrainGroundPoints(newPoints, params));
    }
  };

  const leftStart = toSVG(-params.width / 2, 0);
  const rightStart = toSVG(params.width / 2, 0);
  const metersRange = 25;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative group/canvas">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <h3 className="font-black text-slate-700 uppercase tracking-wider text-xs">Cross Section Canvas</h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded">Zoom: {(zoom * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-slate-200 rounded-lg p-1 gap-1">
              <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-blue-500 hover:text-white transition-all text-xs font-bold">-</button>
              <button onClick={() => { setZoom(1); setOffset({x: 0, y: 0}); }} className="px-2 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-blue-500 hover:text-white transition-all text-[10px] font-bold">RESET</button>
              <button onClick={() => setZoom(z => Math.min(z + 0.2, 5))} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-blue-500 hover:text-white transition-all text-xs font-bold">+</button>
           </div>
           <div className="hidden md:flex gap-4">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <kbd className="bg-slate-200 px-1 rounded text-slate-600 font-bold">SHIFT</kbd> + Click to Add
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <kbd className="bg-slate-200 px-1 rounded text-slate-600 font-bold">ALT/MID</kbd> to Pan
              </div>
           </div>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full h-auto select-none bg-white transition-colors ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        onClick={handleSvgClick}
        onMouseDown={handleSvgMouseDown}
        onWheel={handleWheel}
      >
        {/* Grid Lines */}
        <g stroke="#f8fafc" strokeWidth="1">
          {Array.from({ length: metersRange * 2 + 1 }).map((_, i) => {
            const m = i - metersRange;
            const { cx } = toSVG(m, 0);
            return <line key={`gx-${m}`} x1={cx} y1={-2000} x2={cx} y2={2000} />;
          })}
          {Array.from({ length: metersRange * 2 + 1 }).map((_, i) => {
            const m = i - 10;
            const { cy } = toSVG(0, m);
            return <line key={`gy-${m}`} x1={-2000} y1={cy} x2={2000} y2={cy} />;
          })}
        </g>

        {/* Axes and Labels (Floating) */}
        <g>
           <line x1={width/2 + offset.x} y1={-2000} x2={width/2 + offset.x} y2={2000} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="10,5" />
           
           {Array.from({ length: metersRange * 2 + 1 }).map((_, i) => {
            if (i % 2 !== 0) return null;
            const m = i - metersRange;
            const { cx } = toSVG(m, 0);
            return (
              <g key={`lx-${m}`} transform={`translate(${cx}, ${height - 20})`}>
                <text fontSize="9" fill="#94a3b8" textAnchor="middle" className="font-mono font-bold">{m}m</text>
              </g>
            );
          })}
          {Array.from({ length: metersRange + 1 }).map((_, i) => {
            if (i % 2 !== 0) return null;
            const { cy } = toSVG(metersRange, i);
            return (
              <g key={`ly-${i}`} transform={`translate(${width - 20}, ${cy})`}>
                <text fontSize="9" fill="#94a3b8" textAnchor="end" className="font-mono font-bold">{i}m</text>
              </g>
            );
          })}
        </g>

        {/* Slope reference indicators */}
        <line x1={leftStart.cx} y1={leftStart.cy} x2={toSVG(-params.width/2 - 30*params.slopeRatio, 30).cx} y2={toSVG(0, 30).cy} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,4" />
        <line x1={rightStart.cx} y1={rightStart.cy} x2={toSVG(params.width/2 + 30*params.slopeRatio, 30).cx} y2={toSVG(0, 30).cy} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="6,4" />

        {/* Ground Surface Polyline */}
        <polyline
          points={points.map(p => {
            const pos = toSVG(p.x, p.y);
            return `${pos.cx},${pos.cy}`;
          }).join(' ')}
          fill="none"
          stroke="#ef4444"
          strokeWidth={4 / Math.sqrt(zoom)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Side Walls */}
        <line x1={leftStart.cx} y1={leftStart.cy} x2={toSVG(points[0].x, points[0].y).cx} y2={toSVG(points[0].x, points[0].y).cy} stroke="#64748b" strokeWidth={3 / Math.sqrt(zoom)} />
        <line x1={rightStart.cx} y1={rightStart.cy} x2={toSVG(points[points.length-1].x, points[points.length-1].y).cx} y2={toSVG(points[points.length-1].x, points[points.length-1].y).cy} stroke="#64748b" strokeWidth={3 / Math.sqrt(zoom)} />
        
        {/* Bottom Slab Base */}
        <line x1={leftStart.cx} y1={leftStart.cy} x2={rightStart.cx} y2={rightStart.cy} stroke="#0f172a" strokeWidth={8 / Math.sqrt(zoom)} strokeLinecap="round" />

        {/* Draggable Points */}
        {points.map((p, idx) => {
          const { cx, cy } = toSVG(p.x, p.y);
          const isEndpoint = idx === 0 || idx === points.length - 1;
          const isDragging = draggingPointId === p.id;
          const isHovered = hoveredPointId === p.id;
          
          return (
            <g key={p.id} onMouseEnter={() => setHoveredPointId(p.id)} onMouseLeave={() => setHoveredPointId(null)}>
              {(isDragging || isHovered) && (
                <g className="pointer-events-none">
                  <rect x={cx - 30} y={cy - 45} width={60} height={22} rx="6" fill="#0f172a" />
                  <text x={cx} y={cy - 30} fontSize="10" fill="white" textAnchor="middle" fontWeight="black" className="font-mono">
                    {p.x.toFixed(1)},{p.y.toFixed(1)}
                  </text>
                  <line x1={cx} y1={cy} x2={cx} y2={cy + 500} stroke="#0f172a" strokeWidth="1" strokeDasharray="3,3" />
                </g>
              )}
              {/* Invisible Hit area for better UX */}
              <circle
                cx={cx}
                cy={cy}
                r={20 / Math.sqrt(zoom)}
                fill="transparent"
                className="cursor-move"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDraggingPointId(p.id);
                }}
              />
              {/* Visual circle */}
              <circle
                cx={cx}
                cy={cy}
                r={(isEndpoint ? 9 : 7) / Math.sqrt(zoom)}
                className={`${isEndpoint ? 'fill-blue-500 hover:fill-blue-600' : 'fill-red-500 hover:fill-red-600'} pointer-events-none transition-transform shadow-lg ${isDragging ? 'scale-125 stroke-white stroke-2' : isHovered ? 'scale-110 stroke-white stroke-1' : ''}`}
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-4 left-4 flex gap-2">
         <div className="bg-white/80 backdrop-blur rounded-lg border border-slate-200 p-2 shadow-sm pointer-events-none flex items-center gap-2 opacity-0 group-hover/canvas:opacity-100 transition-opacity">
            <i className="fas fa-mouse text-slate-400 text-xs"></i>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Click & Drag Nodes</span>
         </div>
      </div>
    </div>
  );
};

export default CrossSectionEditor;
