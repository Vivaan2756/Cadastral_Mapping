import React, { useState } from "react";
import { GeoJSONFeature, FeatureProperties } from "../lib/geometry";
import { 
  X, Layers, Tag, MapPin, Sparkles, Hash, 
  Copy, Map, CheckCircle2, AlertTriangle, 
  Box, Mountain, Compass, FileText, RefreshCw
} from "lucide-react";

interface FeaturePanelProps {
  feature: GeoJSONFeature | null;
  onClose: () => void;
  onUpdateProperties: (updatedProps: Partial<FeatureProperties>) => void;
  isEncroaching?: boolean;
}

export const FeaturePanel: React.FC<FeaturePanelProps> = ({
  feature,
  onClose,
  onUpdateProperties,
  isEncroaching = false,
}) => {
  const [activeTab, setActiveTab] = useState<"ZONING" | "ELEVATION" | "TOPOLOGY" | "GT">("ZONING");
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!feature) return null;

  const props = feature.properties || {};
  const currentType = props.type || "parcel";
  
  const mockData = React.useMemo(() => {
    const idHash = feature?.id ? String(feature.id).split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    const isBuilding = currentType === 'building';
    
    return {
      khasra: `Khasra No. ${100 + (idHash % 50)}/${(idHash % 5) + 1}`,
      landUse: isBuilding ? 'Mixed Residential-Commercial (G+2)' : 'Public Infrastructure / Access Corridor',
      deviation: isBuilding ? '+18.4 m²' : 'None',
      roofElev: 500 + (idHash % 20) + ((idHash % 100) / 100),
      height: isBuilding ? 3 + (idHash % 10) + ((idHash % 10) / 10) : 0,
      storeys: isBuilding ? `G + ${Math.floor((idHash % 10) / 3)}` : 'N/A',
      topologyOverlap: isEncroaching || (idHash % 3) === 0,
      overlapDist: (1 + (idHash % 10)/10).toFixed(1),
      gtStatus: (idHash % 2) === 0 ? 'Verified (Phase 1)' : 'Pending Field Verification (Schedule: Phase 2)',
      corsDist: 100 + (idHash % 200),
      rmseH: (2 + (idHash % 5) + (idHash % 10)/10).toFixed(1),
      rmseV: (3 + (idHash % 5) + (idHash % 10)/10).toFixed(1),
    };
  }, [feature?.id, currentType, isEncroaching]);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(feature.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidate = () => {
    setIsValidating(true);
    setTimeout(() => setIsValidating(false), 1000);
  };

  return (
    <div className="w-full bg-white flex flex-col h-full text-slate-800 font-sans overflow-hidden shrink-0 z-20">
      {/* Header */}
      <div className={`border-b border-slate-200 p-4 shrink-0 flex flex-col gap-3 transition-colors duration-300 ${isEncroaching ? 'bg-gradient-to-r from-red-50 to-rose-50' : 'bg-gradient-to-r from-slate-50 to-emerald-50/40'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technical ID</span>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm">
              {feature.id}
              <button onClick={handleCopy} className="text-slate-400 hover:text-emerald-600 transition-colors ml-1">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-1 rounded-lg transition-colors border border-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5">{mockData.khasra}</div>
            {isEncroaching ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-red-700 bg-red-100/50 px-2.5 py-1 rounded-lg border border-red-300 shadow-sm w-fit animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                ENCROACHMENT / DISPUTE FLAGGED
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm w-fit">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                LADM ISO 19152 Conforming
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segmented Tab Controller */}
      <div className="grid grid-cols-4 bg-slate-50 p-1.5 border-b border-slate-200 shrink-0 gap-1 w-full">
        {[
          { id: "ZONING", label: "Zoning", icon: Map },
          { id: "ELEVATION", label: "DSM 3D", icon: Mountain },
          { id: "TOPOLOGY", label: "Topology", icon: Box },
          { id: "GT", label: "GT & CORS", icon: Compass },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg transition-all text-[10px] font-bold tracking-wider ${
              activeTab === tab.id
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                : "text-slate-400 hover:bg-white/60 hover:text-slate-600 border border-transparent"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 p-5 overflow-y-auto bg-white">
        
        {/* TAB 1: ZONING & USE */}
        {activeTab === "ZONING" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Land-Use</label>
              <select
                value={currentType}
                onChange={(e) => onUpdateProperties({ type: e.target.value })}
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 shadow-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              >
                <option value="parcel">Pure Residential</option>
                <option value="building">Mixed Residential-Commercial (G+2)</option>
                <option value="road">Public Infrastructure / Access Corridor</option>
                <option value="water">Water Body Buffer Zone</option>
                <option value="encroachment">Commercial (Retail/Shopfront)</option>
              </select>
            </div>

            <div className={`p-4 rounded-2xl border-2 shadow-sm flex items-start gap-3 ${mockData.deviation !== 'None' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              {mockData.deviation !== 'None' ? (
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-slate-900 text-sm">Master Plan 2031: Zone R-2</div>
                {mockData.deviation !== 'None' ? (
                  <div className="text-red-600 font-bold mt-1.5 text-xs">COMMERCIAL DEVIATION: {mockData.deviation}</div>
                ) : (
                  <div className="text-emerald-700 font-bold mt-1.5 text-xs">CONFORMING TO ZONAL REGS</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DSM 3D */}
        {activeTab === "ELEVATION" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 rounded-2xl border border-amber-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Mean Roof AMSL</div>
                <div className="text-base font-mono font-extrabold text-amber-700">{mockData.roofElev.toFixed(2)} m</div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 rounded-2xl border border-amber-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Structure (AGL)</div>
                <div className="text-base font-mono font-extrabold text-amber-700">{mockData.height.toFixed(2)} m</div>
              </div>
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-3.5 rounded-2xl border border-sky-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Terrain Base (DTM)</div>
                <div className="text-base font-mono font-extrabold text-sky-700">{(mockData.roofElev - mockData.height).toFixed(2)} m</div>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Est. Storeys</div>
                <div className="text-base font-extrabold text-slate-800">{mockData.storeys}</div>
              </div>
            </div>
            
            <div className="mt-4 p-4 border-2 border-slate-200 rounded-2xl bg-slate-50 shadow-sm">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-3 text-center">Elevation Extrusion Profile</div>
              <div className="h-5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-l-full" style={{ width: '60%' }}></div>
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: '15%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mt-2">
                <span>DTM Base</span>
                <span>Roof Extrusion</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TOPOLOGY */}
        {activeTab === "TOPOLOGY" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className={`p-5 rounded-2xl border-2 shadow-sm ${mockData.topologyOverlap && !isValidating ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="font-extrabold text-[13px] mb-5 flex items-center gap-2">
                {mockData.topologyOverlap && !isValidating ? (
                  <><AlertTriangle className="w-5 h-5 text-red-500" /> <span className="text-red-700">ENCROACHMENT DETECTED</span></>
                ) : (
                  <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> <span className="text-emerald-700">TOPOLOGY VALIDATED</span></>
                )}
              </div>
              
              <ul className="space-y-3.5 font-mono text-xs font-bold text-slate-700">
                <li className="flex flex-col gap-2 border-b border-slate-200 pb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-sans uppercase text-[11px] text-slate-500">Must Not Overlap</span>
                    {mockData.topologyOverlap && !isValidating ? (
                      <span className="text-white bg-red-500 px-2.5 py-1 rounded-lg shadow-sm font-sans uppercase text-[10px]">FAIL — Overlaps adjacent structure</span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg shadow-sm border border-emerald-200">PASS</span>
                    )}
                  </div>
                  {mockData.topologyOverlap && !isValidating && (
                    <div className="bg-red-50 p-2 rounded-lg border border-red-100 mt-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-red-600 font-sans uppercase">Overlap Area</span>
                        <span className="text-red-700">{mockData.overlapDist} m²</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-red-600 font-sans uppercase">Encroachment Severity</span>
                        <span className="text-red-700">High (Statutory Buffer Violation)</span>
                      </div>
                    </div>
                  )}
                </li>
                <li className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="font-sans uppercase text-[11px] text-slate-500">No Gaps / Slivers</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg shadow-sm border border-emerald-200">PASS</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="font-sans uppercase text-[11px] text-slate-500">Closed Boundary</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg shadow-sm border border-emerald-200">PASS</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={handleValidate}
              disabled={isValidating}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
              Re-Run Audit Rules
            </button>
          </div>
        )}

        {/* TAB 4: GT & CORS */}
        {activeTab === "GT" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 rounded-2xl p-5 border-2 border-slate-200 text-xs space-y-4 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="font-bold text-slate-500 uppercase">Field Status</span>
                <span className={`font-bold text-sm ${mockData.gtStatus.includes('Pending') ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {mockData.gtStatus}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="font-bold text-slate-500 uppercase">CORS Station</span>
                <span className="text-slate-800 font-mono font-bold bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg">CORS-MP-BHP-04</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500 uppercase">Est. RMSE</span>
                <span className="text-slate-800 font-mono font-bold bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg">H: ±{mockData.rmseH}cm | V: ±{mockData.rmseV}cm</span>
              </div>
            </div>
            
            <div className="text-xs font-bold text-slate-700 space-y-4 bg-slate-50 p-5 border-2 border-slate-200 rounded-2xl shadow-sm">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2 font-bold">Surveyor Checklist</div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 border-2 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2" />
                Boundary corners verified on ORI
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked={!mockData.gtStatus.includes('Pending')} className="w-4 h-4 text-emerald-600 border-2 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2" />
                On-site physical measurement match
              </label>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
