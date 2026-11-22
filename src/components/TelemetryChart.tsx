import React, { useState } from 'react';
import { TelemetrySample } from '../types/flux';

interface TelemetryChartProps {
  samples: TelemetrySample[];
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ samples }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 640;
  const height = 112;
  const padX = 8;
  const padY = 12;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const maxEnergy = Math.max(
    0.5,
    ...samples.map((s) => s.energy)
  );
  const maxCurl = Math.max(
    1.5,
    ...samples.map((s) => s.meanCurl)
  );

  const buildPath = (accessor: (s: TelemetrySample) => number, maxVal: number) => {
    if (samples.length < 2) return '';
    return samples
      .map((s, idx) => {
        const x = padX + (idx / Math.max(1, samples.length - 1)) * plotW;
        const norm = Math.min(1, Math.max(0, accessor(s) / maxVal));
        const y = padY + plotH - norm * plotH;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const energyPath = buildPath((s) => s.energy, maxEnergy);
  const curlPath = buildPath((s) => s.meanCurl, maxCurl);

  const hoveredSample =
    hoverIdx !== null && hoverIdx >= 0 && hoverIdx < samples.length
      ? samples[hoverIdx]
      : null;

  const hoverX =
    hoverIdx !== null && samples.length > 1
      ? padX + (hoverIdx / (samples.length - 1)) * plotW
      : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (samples.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (samples.length - 1));
    setHoverIdx(Math.min(samples.length - 1, Math.max(0, idx)));
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-cyan-400" />
            <span>Kinetic Energy (0.5v̄²)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t border-dashed border-amber-400" />
            <span>Mean Vorticity |∇×F|</span>
          </span>
        </div>
        {hoveredSample ? (
          <div className="font-mono text-[11px] text-slate-300 flex items-center gap-3">
            <span>t={hoveredSample.t.toFixed(1)}s</span>
            <span className="text-cyan-400">E={hoveredSample.energy.toFixed(3)}</span>
            <span className="text-amber-400">|ω|={hoveredSample.meanCurl.toFixed(2)}</span>
          </div>
        ) : (
          <span className="font-mono text-[11px] text-slate-500">
            Rolling 90-sample trace
          </span>
        )}
      </div>

      <div className="relative bg-[#07090E] border border-[#1E293B] rounded overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="w-full h-[104px] block cursor-crosshair"
        >
          {/* Reference Grid */}
          {[0.25, 0.5, 0.75].map((frac) => {
            const y = padY + plotH * frac;
            return (
              <line
                key={frac}
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#1E293B"
                strokeWidth="1"
              />
            );
          })}

          {/* Energy Trace (Solid Cyan) */}
          {energyPath && (
            <path
              d={energyPath}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="1.75"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Vorticity Trace (Dashed Amber) */}
          {curlPath && (
            <path
              d={curlPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Hover Crosshair */}
          {hoverX !== null && (
            <line
              x1={hoverX}
              y1={0}
              x2={hoverX}
              y2={height}
              stroke="#64748B"
              strokeWidth="1"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
