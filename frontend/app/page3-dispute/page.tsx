"use client";

import React, { useEffect, useState, useMemo } from "react";
import { TopNavbar } from "../../components/layout/TopNavbar";
import { JurisdictionSidebar } from "../../components/layout/JurisdictionSidebar";
import { fetchTileGeoJSON, getTileImageUrl } from "../../lib/demoData";
import { DisputeCase, extractDisputesFromGeoJSON } from "../../utils/disputeDataEngine";
import {
  ShieldAlert,
  Scale,
  Search,
  Filter,
  CheckCircle,
  Clock,
  FileText,
  Map,
  Camera,
  AlertTriangle,
  FileSignature,
  Crosshair,
  Ban,
  CheckCircle2,
  ChevronRight,
  Gavel
} from "lucide-react";

// --- Helper to convert GeoJSON coordinates to a local SVG viewBox string ---
function geojsonToSvgPoints(geometry: any, width: number, height: number, padding: number = 10) {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) return { path1: "", path2: "" };
  
  // Extract all points to find bounding box
  let points: number[][] = [];
  if (geometry.type === "Polygon") {
    points = geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    points = geometry.coordinates[0][0];
  } else if (geometry.type === "LineString") {
    points = geometry.coordinates;
  } else {
    return { path1: "20,20 80,20 80,80 20,80", path2: "20,25 75,25 75,75 25,80" }; // fallback
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  });

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);

  const getSvgStr = (pts: number[][], offset = 0) => pts.map(p => {
    const x = padding + (p[0] - minX) * scale + offset;
    const y = height - padding - (p[1] - minY) * scale + offset; // invert Y for SVG
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return {
    path1: getSvgStr(points, 0),
    path2: getSvgStr(points, 3) // Fake offset for the "claimed" boundary delta visual
  };
}

// --- Helper to calculate the centroid of the geometry in percentage of image dimensions ---
function getCenterPercentage(geometry: any, imgWidth: number = 1230, imgHeight: number = 1232) {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) return { x: 50, y: 50 };
  
  let points: number[][] = [];
  if (geometry.type === "Polygon") points = geometry.coordinates[0];
  else if (geometry.type === "MultiPolygon") points = geometry.coordinates[0][0];
  else if (geometry.type === "LineString") points = geometry.coordinates;
  else return { x: 50, y: 50 };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  return {
    x: (centerX / imgWidth) * 100,
    y: (centerY / imgHeight) * 100
  };
}

export default function Page3Dispute() {
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingDoc, setViewingDoc] = useState<{ title: string, type: string } | null>(null);
  const [activeTileId, setActiveTileId] = useState("huzur_mapped_01");
  const [imageUrl, setImageUrl] = useState("");
  const [fullGeoJson, setFullGeoJson] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      // Use active dataset based on sidebar selection
      const data = await fetchTileGeoJSON(activeTileId);
      setFullGeoJson(data);
      setImageUrl(getTileImageUrl(activeTileId));
      const extracted = extractDisputesFromGeoJSON(data);
      setDisputes(extracted);
      if (extracted.length > 0) {
        setSelectedDisputeId(extracted[0].dispute_id);
      } else {
        setSelectedDisputeId(null);
      }
    }
    loadData();
  }, [activeTileId]);

  const activeDispute = useMemo(() => {
    return disputes.find(d => d.dispute_id === selectedDisputeId) || null;
  }, [disputes, selectedDisputeId]);

  const filteredDisputes = useMemo(() => {
    return disputes.filter(d => {
      const matchesFilter = filter === "All" || d.hearing_status === filter;
      const matchesSearch = d.khasra_no.includes(searchQuery) || d.dispute_id.includes(searchQuery);
      return matchesFilter && matchesSearch;
    });
  }, [disputes, filter, searchQuery]);

  const handleAction = (status: DisputeCase["hearing_status"]) => {
    if (!selectedDisputeId) return;
    setDisputes(prev => prev.map(d => 
      d.dispute_id === selectedDisputeId ? { ...d, hearing_status: status } : d
    ));
    if (status === "DISPOSED" || status === "MUTATION_SANCTIONED") {
      // Optional: automatically select the next pending item
      const nextPending = disputes.find(d => d.dispute_id !== selectedDisputeId && d.hearing_status !== "DISPOSED" && d.hearing_status !== "MUTATION_SANCTIONED");
      if (nextPending) setSelectedDisputeId(nextPending.dispute_id);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-800 font-sans overflow-hidden select-none">
      <JurisdictionSidebar onTileChange={(tileId) => setActiveTileId(tileId)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar />
        
        {/* HEADER RIBBON */}
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              <span>Madhya Pradesh {'>'} Bhopal {'>'} Huzur {'>'} Ward 14 {'>'} Sheet #03</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Statutory Dispute Resolution Desk
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full border border-amber-200 ml-2">
                Section 129 MP LRC
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <div className="flex justify-between w-48 text-[11px] font-bold text-slate-600 mb-1">
                <span>Statutory Window</span>
                <span className="text-rose-600">Day 18 of 30</span>
              </div>
              <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 w-[60%]"></div>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200"></div>
            <div className="flex gap-4 text-xs font-bold">
              <div className="flex flex-col"><span className="text-slate-400">Claims</span><span className="text-slate-700 text-sm">{disputes.length}</span></div>
              <div className="flex flex-col"><span className="text-slate-400">Hearings</span><span className="text-slate-700 text-sm">6</span></div>
              <div className="flex flex-col"><span className="text-slate-400">Summons</span><span className="text-amber-600 text-sm">{disputes.filter(d=>d.hearing_status==="NOTICE_DISPATCHED").length}</span></div>
            </div>
          </div>
        </header>

        {/* MAIN COCKPIT */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANEL: WORKLIST (40%) */}
          <div className="w-[40%] border-r border-slate-200 bg-white flex flex-col">
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search by Khasra or ID..." 
                  className="bg-transparent border-none outline-none text-sm w-full font-medium"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {["All", "NOTICE_DISPATCHED", "HEARING_SCHEDULED"].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-full transition-colors ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
              {filteredDisputes.map(dispute => {
                const isActive = dispute.dispute_id === selectedDisputeId;
                return (
                  <div 
                    key={dispute.dispute_id}
                    onClick={() => setSelectedDisputeId(dispute.dispute_id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-[10px] font-mono font-bold text-slate-400">{dispute.dispute_id}</div>
                        <div className="font-extrabold text-slate-900">Khasra {dispute.khasra_no}</div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${dispute.category.includes('Road') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {dispute.category}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-600 mb-3 truncate">
                      {dispute.complainant} <span className="text-slate-400 mx-1">vs</span> {dispute.respondent}
                    </div>
                    <div className="flex justify-between items-center text-[11px] border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-slate-500"><b className="text-slate-700">{dispute.disputed_area_sqm.toFixed(1)}</b> m² Area</span>
                        <span className="font-mono text-slate-500"><b className="text-slate-700">{dispute.max_lateral_offset_m}</b> m Offset</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Clock className="w-3.5 h-3.5" /> Notice Expires: 12 days
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: DOSSIER (60%) */}
          <div className="w-[60%] bg-slate-100 flex flex-col p-4 overflow-y-auto">
            {activeDispute ? (
              <div className="space-y-4 max-w-4xl mx-auto w-full pb-20">
                
                {/* SPATIAL DELTA VIEWER */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-72 relative">
                  <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur rounded-lg border border-slate-200 p-2 shadow-sm">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Spatial Differential Overlay</div>
                    <div className="flex flex-col gap-1 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> AI Baseline (LADM)</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-rose-500 border-dashed"></div> Claimed Boundary</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-rose-500/20 border border-rose-500"></div> Disputed Area ({activeDispute.disputed_area_sqm.toFixed(1)} m²)</div>
                    </div>
                  </div>
                  
                  {/* Map Canvas */}
                  <div className="flex-1 bg-[#f8fafc] relative overflow-hidden flex items-center justify-center">
                    {(() => {
                      const { path1, path2 } = geojsonToSvgPoints(activeDispute.ai_geometry, 100, 100, 15);
                      return (
                        <svg viewBox="0 0 100 100" className="w-64 h-64 overflow-visible drop-shadow-md transition-all duration-500">
                          <polygon points={path1} fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1.5" />
                          {/* Claimed offset and disputed delta overlap shading */}
                          <polygon points={path2} fill="#ef4444" fillOpacity="0.25" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
                        </svg>
                      );
                    })()}
                  </div>
                </div>

                {/* DOC VAULT & EVIDENCE */}
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    onClick={() => setViewingDoc({ title: "Registered Sale Deed (1998)", type: "deed" })}
                    className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">Registered Sale Deed (1998)</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">Vol 412 / Pg 88</div>
                  </div>
                  <div 
                    onClick={() => setViewingDoc({ title: "Legacy Settlement Sheet", type: "map" })}
                    className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Map className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">Legacy Settlement Sheet</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">Scanned & Georef (1972)</div>
                  </div>
                  <div 
                    onClick={() => setViewingDoc({ title: "Site Inspection Photo", type: "photo" })}
                    className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-teal-400 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">Site Inspection Photo</div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">GPS Timestamped</div>
                  </div>
                </div>

                {/* RI PANCHNAMA */}
                <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
                      <FileSignature className="w-4 h-4" />
                      Field Revenue Inspector (RI) Panchnama Report
                    </h3>
                    <div className="text-xs font-bold text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded">S.K. Verma (RI Circle-4)</div>
                  </div>
                  <p className="text-sm text-amber-900/80 italic leading-relaxed bg-white/50 p-4 rounded-xl border border-amber-100 font-serif">
                    "Physical masonry foundation constructed in 2021 matches the AI drone orthomosaic plinth footprint precisely. The citizen's claimed ancestral fence line actually encroaches {activeDispute.max_lateral_offset_m} meters into the statutory public Road Right-of-Way. Recommend rejection of claim."
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4">
                <Gavel className="w-12 h-12 text-slate-300" />
                <div className="text-sm font-bold">Select a dispute case from the docket.</div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        {activeDispute && (
          <div className="absolute bottom-0 right-0 w-[60%] h-20 bg-white border-t border-slate-200 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] px-6 flex items-center justify-between z-20">
            <div className="flex gap-3">
              <button 
                onClick={() => handleAction("NOTICE_DISPATCHED")}
                className="flex items-center justify-center flex-col gap-1 w-32 h-14 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
              >
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-bold">Form-IX Notice</span>
              </button>
              <button 
                onClick={() => handleAction("UNDER_FIELD_INQUIRY")}
                className="flex items-center justify-center flex-col gap-1 w-32 h-14 rounded-xl hover:bg-slate-100 transition-colors text-blue-600"
              >
                <Crosshair className="w-5 h-5" />
                <span className="text-[10px] font-bold">DGPS Re-Survey</span>
              </button>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleAction("DISPOSED")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 font-bold text-xs transition-colors"
              >
                <Ban className="w-4 h-4" /> Reject Claim
              </button>
              <button 
                onClick={() => handleAction("MUTATION_SANCTIONED")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-500 font-bold text-xs transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Sanction Mutation
              </button>
            </div>
          </div>
        )}

        {/* DOCUMENT MODAL */}
        {viewingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="h-14 bg-slate-50 border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {viewingDoc.type === 'deed' ? <FileText className="w-5 h-5 text-blue-600" /> : viewingDoc.type === 'map' ? <Map className="w-5 h-5 text-amber-600" /> : <Camera className="w-5 h-5 text-teal-600" />}
                  {viewingDoc.title}
                </div>
                <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                  ✕
                </button>
              </div>
              <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-y-auto p-8 relative">
                {/* Simulated Document Content */}
                {viewingDoc.type === 'deed' && (
                  <div className="bg-white w-[500px] min-h-[700px] shadow-sm border border-slate-200 p-12 text-slate-800 font-serif">
                    <div className="text-center font-bold text-xl mb-8 border-b-2 border-slate-800 pb-4">SALE DEED (REGISTRATION)</div>
                    <div className="space-y-4 text-sm leading-loose">
                      <p>This DEED OF SALE is made on this 14th day of October, 1998, between...</p>
                      <p>Whereas the Vendor is the absolute owner of the property bearing Khasra {activeDispute?.khasra_no} situated at Huzur, Bhopal...</p>
                      <p>The total area conveyed under this instrument is {activeDispute?.disputed_area_sqm} sq. meters as per the boundaries described below:</p>
                      <ul className="list-disc pl-8">
                        <li>North: Municipal Road</li>
                        <li>South: Agricultural Land</li>
                      </ul>
                      <div className="mt-12 flex justify-between border-t border-slate-300 pt-8">
                        <div className="text-center">Signature of Vendor<br/>(Seal)</div>
                        <div className="text-center text-blue-800 font-bold italic">Digitally Verified OCR</div>
                      </div>
                    </div>
                  </div>
                )}
                {viewingDoc.type === 'map' && (
                  <div className="bg-amber-50 w-full h-full shadow-sm border border-amber-200 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] mix-blend-multiply"></div>
                    <Map className="w-32 h-32 text-amber-900/30 mb-4" />
                    <div className="text-amber-900/60 font-serif font-bold text-2xl tracking-widest uppercase">Legacy Settlement Map 1972</div>
                    <div className="mt-4 px-4 py-2 border-2 border-amber-900/30 text-amber-900/60 font-mono rotate-[-5deg]">CONFIDENTIAL COPY</div>
                  </div>
                )}
                {viewingDoc.type === 'photo' && (
                  <div className="w-full max-w-lg bg-white p-4 shadow-sm border border-slate-200 rounded-lg">
                    <div className="w-full aspect-video bg-slate-200 rounded overflow-hidden flex items-center justify-center relative">
                      {(() => {
                        const center = activeDispute ? getCenterPercentage(activeDispute.ai_geometry, fullGeoJson?.image_width, fullGeoJson?.image_height) : { x: 50, y: 50 };
                        return (
                          <img 
                            src={imageUrl} 
                            alt="Site Inspection" 
                            className="w-full h-full object-cover transition-transform duration-1000 ease-out" 
                            style={{
                              transformOrigin: `${center.x}% ${center.y}%`,
                              transform: "scale(5)"
                            }}
                          />
                        );
                      })()}
                      {/* Simulated AI Detection Box overlay centered on the zoomed centroid */}
                      <div className="absolute top-[35%] left-[35%] w-[30%] h-[30%] border-2 border-rose-500 bg-rose-500/20 shadow-[0_0_20px_rgba(225,29,72,0.6)] flex items-center justify-center animate-pulse z-10 pointer-events-none">
                        <Crosshair className="text-white w-8 h-8 drop-shadow-md opacity-90" />
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-mono px-2 py-1 rounded backdrop-blur-sm">
                        GPS: 23.2599° N, 77.4126° E • Oct 24, 2026
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1"><Camera className="w-4 h-4" /> Drone Survey Feed</div>
                      <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Encroachment Validated</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
