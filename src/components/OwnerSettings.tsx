import React, { useState } from 'react';
import { Sliders, RotateCcw, Save } from 'lucide-react';

interface OwnerSettingsProps {
  enterpriseName: string;
  lowStockThreshold: number;
  onSaveSettings: (name: string, lowStock: number) => void;
}

export default function OwnerSettings({
  enterpriseName,
  lowStockThreshold,
  onSaveSettings,
}: OwnerSettingsProps) {
  const [name, setName] = useState(enterpriseName);
  const [lowStock, setLowStock] = useState(lowStockThreshold);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(name, lowStock);
  };

  const handleReset = () => {
    setName('TrippleM');
    setLowStock(15);
  };

  return (
    <div id="settings-page" className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      {/* Title Header */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-slate-500" /> Administrative Settings
        </h2>
        <p className="text-slate-500 text-xs mt-0.5">
          Configure general preferences and enterprise operational packaging parameters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
        {/* Setting Item 1: Name */}
        <div className="p-5 md:p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Enterprise Brand Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-medium"
              placeholder="e.g. TrippleM"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
              Sets the global header brand name printed on dashboards, summaries, and receipts.
            </p>
          </div>
        </div>

        {/* Setting Item 2: Stock warnings */}
        <div className="p-5 md:p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Low Stock Threshold Warning
            </label>
            <input
              type="number"
              required
              min={1}
              max={1000}
              value={lowStock}
              onChange={(e) => setLowStock(Number(e.target.value))}
              className="w-full border border-slate-250 p-3 text-sm rounded-xl outline-none focus:border-slate-900 font-sans font-semibold"
              placeholder="e.g. 15"
            />
            <p className="text-[10px] text-slate-400 mt-1.5">
              Triggers warning badges for products whose counts drop below this current quantity.
            </p>
          </div>
        </div>

        {/* Bottom Form Actions */}
        <div className="p-5 md:p-6 flex items-center justify-between gap-4 bg-slate-50/50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
