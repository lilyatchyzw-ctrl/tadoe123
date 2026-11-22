import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { FieldPreset } from '../types/flux';

interface FieldGuideModalProps {
  open: boolean;
  preset: FieldPreset;
  onClose: () => void;
}

export const FieldGuideModal: React.FC<FieldGuideModalProps> = ({
  open,
  preset,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-guide-title"
    >
      <div
        className="w-full max-w-2xl bg-[#0D1119] border border-[#1E293B] rounded-lg p-6 flex flex-col gap-5 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#1E293B] pb-4">
          <div>
            <h2 id="field-guide-title" className="text-xl font-semibold text-slate-100">
              Field Operators & Governing Equations
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Real-time 2nd-order Runge-Kutta advection over coupled vector kernels.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close equations guide"
            className="p-2 rounded text-slate-400 hover:text-slate-100 hover:bg-[#161E2E] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-sm leading-relaxed">
          <div className="p-3.5 bg-[#07090E] border border-[#1E293B] rounded">
            <div className="text-xs text-slate-400 mb-1">Active Model: {preset.title}</div>
            <div className="font-mono text-sm text-cyan-300 overflow-x-auto">
              {preset.equation}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-slate-100">Divergence (∇ · F)</h3>
              <p className="text-xs text-slate-400">
                Measures net outward flux per unit area. Positive near radial sources (+Q), negative near sinks (−Q), and identically zero for pure curl-noise turbulence.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-slate-100">Scalar Curl (∇ × F)</h3>
              <p className="text-xs text-slate-400">
                Measures local rotation rate (∂Fy/∂x − ∂Fx/∂y). Peak vorticity concentrates around clockwise (↻) and counter-clockwise (↺) Biot-Savart vortices.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-slate-100">RK2 Midpoint Advection</h3>
              <p className="text-xs text-slate-400">
                Particles sample the velocity field at the initial point and half-step midpoint each frame, preserving tight closed orbits around vortices without outward spiral drift.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-slate-100">Keyboard Shortcuts</h3>
              <p className="text-xs text-slate-400 font-mono">
                Space: Play/Pause · R: Reseed · V: Vector Grid · H: Heatmap · Esc: Close
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
