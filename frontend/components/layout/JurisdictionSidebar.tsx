import React, { useState } from 'react';
import { ChevronRight, Filter, ChevronLeft, MapPin } from 'lucide-react';

interface JurisdictionSidebarProps {
  onTileChange: (tileId: string) => void;
}

export const JurisdictionSidebar: React.FC<JurisdictionSidebarProps> = ({ onTileChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [state, setState] = useState('Madhya Pradesh');
  const [district, setDistrict] = useState('Bhopal');
  const [tehsil, setTehsil] = useState('Huzur');
  const [ward, setWard] = useState('Ward 14 (Urban)');
  const [sheet, setSheet] = useState('Khasra Sheet #01');

  const sheets = [
    { id: 'huzur_mapped_01', name: 'Khasra Sheet #01' },
    { id: 'huzur_mapped_02', name: 'Khasra Sheet #02' },
    { id: 'huzur_mapped_03', name: 'Khasra Sheet #03' },
  ];

  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const selectedSheet = sheets.find(s => s.id === val);
    if (selectedSheet) {
      setSheet(selectedSheet.name);
      onTileChange(val);
    }
  };

  if (collapsed) {
    return (
      <div className="w-16 bg-[#1e3a8a] border-r border-blue-800/50 flex flex-col items-center py-6 shrink-0 transition-all z-40 relative">
        <button onClick={() => setCollapsed(false)} className="p-2 text-blue-200 hover:text-white bg-blue-800/50 hover:bg-blue-700/50 rounded transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-8 flex flex-col gap-6 text-blue-300">
          <MapPin className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
          <Filter className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-[#1e3a8a] border-r border-blue-800/50 flex flex-col shrink-0 transition-all z-40 relative">
      <div className="h-16 border-b border-blue-800/50 flex items-center justify-between px-5 shrink-0 bg-[#1e3a8a]">
        <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-4 h-4 text-white" />
          Jurisdiction
        </span>
        <button onClick={() => setCollapsed(true)} className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-blue-200 uppercase tracking-widest">State</label>
          <select value={state} onChange={e => setState(e.target.value)} className="w-full bg-[#1e40af] border border-blue-600/50 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors hover:border-blue-400">
            <option value="Madhya Pradesh">Madhya Pradesh</option>
            <option value="Maharashtra">Maharashtra</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-blue-200 uppercase tracking-widest">District</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} className="w-full bg-[#1e40af] border border-blue-600/50 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors hover:border-blue-400">
            <option value="Bhopal">Bhopal</option>
            <option value="Indore">Indore</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-blue-200 uppercase tracking-widest">Tehsil / Taluka</label>
          <select value={tehsil} onChange={e => setTehsil(e.target.value)} className="w-full bg-[#1e40af] border border-blue-600/50 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors hover:border-blue-400">
            <option value="Huzur">Huzur</option>
            <option value="Berasia">Berasia</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-blue-200 uppercase tracking-widest">Revenue Circle / Ward</label>
          <select value={ward} onChange={e => setWard(e.target.value)} className="w-full bg-[#1e40af] border border-blue-600/50 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-white transition-colors hover:border-blue-400">
            <option value="Ward 14 (Urban)">Ward 14 (Urban)</option>
            <option value="Ward 15">Ward 15</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-extrabold text-white uppercase tracking-widest">Village / Survey Sheet</label>
          <select value={sheets.find(s => s.name === sheet)?.id || 'huzur_mapped_01'} onChange={handleSheetChange} className="w-full bg-white border border-white rounded-md px-3 py-2.5 text-sm font-bold text-[#1e3a8a] outline-none cursor-pointer hover:bg-blue-50 transition-colors shadow-sm">
            {sheets.map(s => (
              <option key={s.id} value={s.id} className="bg-white text-slate-800">{s.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="p-5 border-t border-blue-800/50 bg-[#1e3a8a]">
        <button className="w-full py-2.5 bg-transparent border border-blue-500/50 hover:bg-white/10 rounded-md text-sm font-bold text-blue-100 hover:text-white transition-colors">
          Reset Filters
        </button>
      </div>
    </div>
  );
};
