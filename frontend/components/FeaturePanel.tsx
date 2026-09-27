import React, { useState } from "react";
import { GeoJSONFeature, FeatureProperties } from "../lib/geometry";
import { 
  X, Layers, Tag, MapPin, Sparkles, Hash, 
  Copy, Map, CheckCircle2, AlertTriangle, 
  Box, Mountain, Compass, FileText, RefreshCw
} from "lucide-react";
import { generateCadastralDossier } from "../lib/cadastralRegistry";
import { calculateFeatureMetrics } from "../lib/geometry";

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
  
  const dossier = React.useMemo(() => {
    return generateCadastralDossier(String(feature?.id || 'unknown'), currentType, 0);
  }, [feature?.id, currentType]);

  const isEncroachmentFail = isEncroaching || dossier.topologyAudit.mustNotOverlap === 'FAIL';
  const hasZoningDeviation = dossier.zoningStatus.status !== 'conforming';
  
  const mockData = {
    khasra: dossier.khasraNo,
    ownerName: dossier.ownerName,
    tenureType: dossier.tenureType,
    ladmClass: dossier.ladmClass,
    landUse: currentType === "water" ? "Statutory Waterbody & Eco-Buffer Corridor (Master Plan 2031: Zone Conservation)" : dossier.landUse,
    deviation: hasZoningDeviation ? (currentType === "water" ? "Riparian Buffer Violation: Intersects River Margin by 4.8 m" : "Zone R-2 Retail Deviation") : 'None',
    zoningTitle: currentType === "water" ? "Zone Conservation (Waterbody)" : dossier.zoningStatus.title,
    roofElev: dossier.dsmElevation.meanRoofAmsl,
    height: dossier.dsmElevation.structureHeightAgl,
    storeys: dossier.dsmElevation.estimatedStoreys,
    topologyOverlap: isEncroachmentFail,
    overlapDist: dossier.topologyAudit.overlapDetails || '1.2',
    gtStatus: dossier.groundTruthing.fieldStatus,
    corsStation: dossier.groundTruthing.corsStationId,
    rmseH: dossier.groundTruthing.rmseHorizontalCm.toFixed(1),
    rmseV: dossier.groundTruthing.rmseVerticalCm.toFixed(1),
  };
  
  const { area: dynamicArea } = React.useMemo(() => {
    return calculateFeatureMetrics(feature, true);
  }, [feature]);

  const displayArea = props.Area_sq_m || dynamicArea;

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
        
        {/* Dynamic Owner & Tenure Info from Dossier */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Title Holder</div>
            <div className="text-xs font-bold text-slate-800 leading-tight">{mockData.ownerName}</div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tenure Class</div>
            <div className="text-xs font-bold text-slate-800 leading-tight">{mockData.tenureType}</div>
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
              <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 shadow-sm flex items-center justify-between">
                <span>{mockData.landUse}</span>
                <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{mockData.ladmClass}</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border-2 shadow-sm flex items-start gap-3 ${mockData.deviation !== 'None' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              {mockData.deviation !== 'None' ? (
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-slate-900 text-sm">{mockData.zoningTitle}</div>
                {mockData.deviation !== 'None' ? (
                  <div className="text-red-600 font-bold mt-1.5 text-xs">{mockData.deviation}</div>
                ) : (
                  <div className="text-emerald-700 font-bold mt-1.5 text-xs">CONFORMING TO ZONAL REGS</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DSM 3D */}
        {activeTab === "ELEVATION" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* SVG Elevation Cross-Section */}
            <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm p-3 relative">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Photogrammetric Cross-Section Profile</div>
              <svg viewBox="0 0 300 120" className="w-full h-auto overflow-visible">
                {/* DTM Ground Line */}
                <line x1="10" y1="90" x2="290" y2="90" stroke="#78716c" strokeWidth="2" strokeDasharray="4 2" />
                <text x="20" y="105" fontSize="8" fill="#78716c" fontFamily="monospace" fontWeight="bold">DTM Base: {((mockData.roofElev - mockData.height).toFixed(2))}m AMSL</text>
                
                {/* Structure Box */}
                <rect x="100" y="30" width="100" height="60" fill="rgba(245, 158, 11, 0.2)" stroke="#d97706" strokeWidth="1.5" />
                
                {/* Roof Peak Datum */}
                <line x1="60" y1="30" x2="240" y2="30" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="60" y="24" fontSize="8" fill="#0284c7" fontFamily="monospace" fontWeight="bold">Mean Roof: {mockData.roofElev.toFixed(2)}m AMSL</text>
                
                {/* Vertical Dimension Line */}
                <line x1="220" y1="30" x2="220" y2="90" stroke="#10b981" strokeWidth="1.5" />
                <polygon points="220,30 217,35 223,35" fill="#10b981" />
                <polygon points="220,90 217,85 223,85" fill="#10b981" />
                <text x="225" y="63" fontSize="9" fill="#059669" fontFamily="sans-serif" fontWeight="bold">{mockData.height.toFixed(2)}m (AGL)</text>
              </svg>
            </div>

            {/* Volumetric Telemetry Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-[9px] font-bold text-slate-400 uppercase">Footprint Area</div>
                <div className="font-mono font-bold text-slate-800 mt-0.5">{displayArea.toFixed(1)} m²</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-[9px] font-bold text-slate-400 uppercase">Extruded Volume</div>
                <div className="font-mono font-bold text-slate-800 mt-0.5">{(displayArea * mockData.height).toFixed(1)} m³</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm col-span-2 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Storey Classification</div>
                  <div className="font-bold text-slate-800 mt-0.5 text-[11px]">{mockData.storeys}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Sensor / Source</div>
                  <div className="font-bold text-slate-800 mt-0.5 text-[10px]">Drone Ortho (5cm GSD)</div>
                </div>
              </div>
            </div>

            {/* Zoning Elevation Audit */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-start gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide leading-tight">
                Complies with MP Bhumi Vikas Niyam Max Permissible Height (12.0m Limit)
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
                      <div className="text-[10px] text-red-700 font-bold bg-red-100/50 p-2 rounded-lg border border-red-200">
                        {currentType === "water" ? "Riparian Buffer Violation: Intersects River Margin by 4.8 m" : `Intersects Road RoW Corridor by 1.2 m (Area: ${mockData.overlapDist} m²)`}
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
                <span className="text-slate-800 font-mono font-bold bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-lg">{mockData.corsStation}</span>
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
