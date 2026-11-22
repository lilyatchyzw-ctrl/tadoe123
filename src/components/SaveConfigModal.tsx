import React, { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Check, Copy, Lock, Upload, X } from 'lucide-react';
import {
  FieldMode,
  FieldNode,
  SavedConfigPreset,
  SimulationParams,
} from '../types/flux';
import { FREE_PRESET_LIMIT } from '../engine/presetStorage';

interface SaveConfigModalProps {
  open: boolean;
  activeMode: FieldMode;
  params: SimulationParams;
  nodes: FieldNode[];
  savedCount: number;
  isPremium: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onImportJson: (preset: SavedConfigPreset) => void;
  onOpenPremium: () => void;
}

export const SaveConfigModal: React.FC<SaveConfigModalProps> = ({
  open,
  activeMode,
  params,
  nodes,
  savedCount,
  isPremium,
  onClose,
  onSave,
  onImportJson,
  onOpenPremium,
}) => {
  const [name, setName] = useState('');
  const [tab, setTab] = useState<'save' | 'import'>('save');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(`${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Config #${savedCount + 1}`);
    setImportError(null);
    setCopied(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, activeMode, savedCount, onClose]);

  const jsonPreview = useMemo(
    () =>
      JSON.stringify(
        {
          name: name.trim() || 'Untitled Configuration',
          baseMode: activeMode,
          params,
          nodes,
        },
        null,
        2
      ),
    [name, activeMode, params, nodes]
  );

  if (!open) return null;

  const limitReached = !isPremium && savedCount >= FREE_PRESET_LIMIT;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonPreview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    if (limitReached) {
      setImportError('Free preset limit reached. Upgrade to Premium for unlimited presets.');
      return;
    }
    try {
      const parsed = JSON.parse(importText) as Partial<SavedConfigPreset>;
      if (!parsed.params || !Array.isArray(parsed.nodes)) {
        setImportError('JSON must include valid "params" object and "nodes" array.');
        return;
      }
      const preset: SavedConfigPreset = {
        id: `cfg-${Date.now()}`,
        name: parsed.name || 'Imported Preset',
        createdAt: new Date().toISOString(),
        baseMode: parsed.baseMode || 'sandbox',
        params: { ...params, ...parsed.params },
        nodes: parsed.nodes,
      };
      onImportJson(preset);
      onClose();
    } catch {
      setImportError('Invalid JSON syntax. Please check formatting.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-config-title"
    >
      <div
        className="w-full max-w-lg bg-[#0D1119] border border-[#1E293B] rounded-lg p-6 flex flex-col gap-4 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#1E293B] pb-3.5">
          <div>
            <h2 id="save-config-title" className="text-lg font-semibold text-slate-100">
              Save Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Store current parameters and {nodes.length} field node{nodes.length === 1 ? '' : 's'} as a JSON preset in localStorage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close save configuration modal"
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-[#161E2E] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#07090E] border border-[#1E293B] rounded">
          <button
            type="button"
            onClick={() => setTab('save')}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              tab === 'save'
                ? 'bg-[#162032] text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Save Current State
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              tab === 'import'
                ? 'bg-[#162032] text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Import JSON
          </button>
        </div>

        {tab === 'save' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (limitReached) return;
              onSave(name);
              onClose();
            }}
            className="flex flex-col gap-3.5"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="preset-name-input" className="text-xs text-slate-300 font-medium">
                Configuration Name
              </label>
              <input
                id="preset-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Dual Vortex Resonance"
                className="bg-[#07090E] border border-[#1E293B] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">JSON Payload Preview</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="bg-[#07090E] border border-[#1E293B] rounded p-3 text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto">
                {jsonPreview}
              </pre>
            </div>

            {limitReached ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded flex items-center justify-between gap-3">
                <span className="text-xs text-amber-300">
                  Free tier limit reached ({savedCount}/{FREE_PRESET_LIMIT} saved presets).
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPremium();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Unlock Unlimited</span>
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Configuration to localStorage</span>
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={handleImportSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="import-json-input" className="text-xs text-slate-300 font-medium">
                Paste JSON Configuration
              </label>
              <textarea
                id="import-json-input"
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"name":"Custom Field","params":{...},"nodes":[...]}'
                className="bg-[#07090E] border border-[#1E293B] rounded p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                required
              />
            </div>
            {importError && <p className="text-xs text-rose-400">{importError}</p>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import & Save Preset</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
