"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { CadastralIngestionModal } from "../../components/CadastralIngestionModal";
import { MappingViewer } from "../../components/MappingViewer";
import { MappingToolbar, EditorMode } from "../../components/MappingToolbar";
import { FeaturePanel } from "../../components/FeaturePanel";
import {
  matchUploadedFileToTile,
  getTileImageUrl,
  fetchTileGeoJSON,
  getSavedTileEdits,
  saveTileEdits,
  clearTileEdits,
} from "../../lib/demoData";
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  FeatureProperties,
  calculateFeatureMetrics,
} from "../../lib/geometry";
import { Map, Search, Activity, Save, ArrowRight, Download, Ruler, Target } from "lucide-react";

type AppScreen = "UPLOAD" | "PROCESSING" | "RESULT";

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("UPLOAD");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    size: string;
    previewUrl: string;
  } | null>(null);

  const [activeTileId, setActiveTileId] = useState<string>("huzur_mapped_01");
  const [imageUrl, setImageUrl] = useState<string>("/api/tiles/huzur_mapped_01/image");

  const [originalGeoJSON, setOriginalGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
  const [history, setHistory] = useState<GeoJSONFeatureCollection[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [encroachingIds, setEncroachingIds] = useState<Set<string>>(new Set());
  const [showGCP, setShowGCP] = useState(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleProcessingComplete = useCallback(async (tileId: string) => {
    setActiveTileId(tileId);
    setImageUrl(getTileImageUrl(tileId));

    const saved = getSavedTileEdits(tileId);
    const original = await fetchTileGeoJSON(tileId);

    setOriginalGeoJSON(original);

    const initial = saved || original;
    setCurrentGeoJSON(initial);
    setHistory([initial]);
    setHistoryIndex(0);
    setIsSaved(!!saved);

    setScreen("RESULT");
  }, []);

  const handleGeoJsonChange = useCallback(
    (newGeoJson: GeoJSONFeatureCollection) => {
      setCurrentGeoJSON(newGeoJson);
      setIsSaved(false);
      setHistory((prev) => {
        const updated = prev.slice(0, historyIndex + 1);
        return [...updated, newGeoJson];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setCurrentGeoJSON(history[nextIndex]);
      setIsSaved(false);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentGeoJSON(history[nextIndex]);
      setIsSaved(false);
    }
  }, [historyIndex, history]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedFeatureId || !currentGeoJSON) return;
    const updatedFeatures = currentGeoJSON.features.filter((f) => f.id !== selectedFeatureId);
    const updated: GeoJSONFeatureCollection = {
      ...currentGeoJSON,
      features: updatedFeatures,
    };
    setSelectedFeatureId(null);
    handleGeoJsonChange(updated);
  }, [selectedFeatureId, currentGeoJSON, handleGeoJsonChange]);

  const handleSave = useCallback(() => {
    if (!currentGeoJSON) return;
    saveTileEdits(activeTileId, currentGeoJSON);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }, [activeTileId, currentGeoJSON]);

  const handleReset = useCallback(() => {
    if (!originalGeoJSON) return;
    if (confirm("Reset all geometry to the original AI mapping result?")) {
      clearTileEdits(activeTileId);
      setCurrentGeoJSON(originalGeoJSON);
      setHistory([originalGeoJSON]);
      setHistoryIndex(0);
      setSelectedFeatureId(null);
      setIsSaved(false);
    }
  }, [originalGeoJSON, activeTileId]);

  const handleExportGeoJSON = useCallback(() => {
    if (!currentGeoJSON) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentGeoJSON, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `terramap_mapping_${activeTileId}_edited.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [currentGeoJSON, activeTileId]);

  const selectedFeature = useMemo<GeoJSONFeature | null>(() => {
    if (!currentGeoJSON || !selectedFeatureId) return null;
    return currentGeoJSON.features.find((f) => f.id === selectedFeatureId) || null;
  }, [currentGeoJSON, selectedFeatureId]);

  const handleUpdateProperties = useCallback(
    (updatedProps: Partial<FeatureProperties>) => {
      if (!selectedFeatureId || !currentGeoJSON) return;
      const updatedFeatures = currentGeoJSON.features.map((f) => {
        if (f.id === selectedFeatureId) {
          return {
            ...f,
            properties: {
              ...f.properties,
              ...updatedProps,
            },
          };
        }
        return f;
      });

      const updated: GeoJSONFeatureCollection = {
        ...currentGeoJSON,
        features: updatedFeatures,
      };
      handleGeoJsonChange(updated);
    },
    [selectedFeatureId, currentGeoJSON, handleGeoJsonChange]
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden select-none font-sans text-slate-800">
      
      {/* REGION A: Top Header */}
      <header className="h-14 flex-shrink-0 border-b border-slate-200 bg-white z-20 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Map className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="font-extrabold text-slate-900 text-[15px] tracking-tight leading-tight">National Cadastral Portal — Urban Resurvey</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Huzur Tehsil, Bhopal</span>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md text-emerald-700">TILE #{activeTileId}</span>
            </div>
          </div>
        </div>

        {screen === "RESULT" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden h-8 shadow-sm">
              <div className="pl-2.5 pr-1 flex items-center justify-center text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input type="text" placeholder="Search Khasra / Feature ID..." className="px-2 py-1 text-[11px] font-bold bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 w-[200px] outline-none" />
            </div>
            
            <button className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 px-3 h-8 rounded-xl font-bold text-[11px] shadow-sm transition-colors uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" /> Validate Topology
            </button>

            <div className="w-[1px] h-5 bg-slate-200"></div>

            <button onClick={handleSave} className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-4 h-8 rounded-xl font-bold text-[11px] shadow-lg shadow-emerald-500/20 transition-all uppercase">
              {isSaved ? "✓ Saved" : "Save Changes"}
            </button>
            
            <Link href="/page2-reconcile" className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-sky-700 px-3 h-8 rounded-xl font-bold text-[11px] shadow-sm transition-colors uppercase tracking-wider">
              Next: Reconciliation <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </header>

      {/* Upload/Processing Screen */}
      {(screen === "UPLOAD" || screen === "PROCESSING") && (
        <div className="flex-1 bg-gradient-to-br from-slate-100 via-white to-emerald-50/30 relative flex items-center justify-center">
          <CadastralIngestionModal onComplete={handleProcessingComplete} />
        </div>
      )}

      {screen === "RESULT" && currentGeoJSON && (
        <>
          {/* REGION B: Workspace & Inspector */}
          <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative">
            
            {/* WORKSPACE (Left) */}
            <div className="flex-1 min-w-0 flex flex-col p-3 overflow-hidden bg-slate-100">
              
              {/* CAD Tool Ribbon */}
              <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur rounded-xl border border-slate-200 shadow-sm mb-2 w-fit z-10">
                <MappingToolbar
                  mode={editorMode}
                  onModeChange={setEditorMode}
                  onDeleteSelected={handleDeleteSelected}
                  hasSelection={!!selectedFeatureId}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onReset={handleReset}
                  showGCP={showGCP}
                  onToggleGCP={setShowGCP}
                />
              </div>
              
              {/* Dual Map Viewport */}
              <MappingViewer
                imageUrl={imageUrl}
                inputImageUrl={fileDetails?.previewUrl}
                inputImageName={fileDetails?.name}
                geojson={currentGeoJSON}
                mode={editorMode}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={setSelectedFeatureId}
                onGeoJsonChange={handleGeoJsonChange}
                onDrawingFinish={() => setEditorMode("select")}
                onEncroachingChange={setEncroachingIds}
                showGCP={showGCP}
              />
            </div>

            {/* INSPECTOR SIDEBAR (Right) */}
            <aside className="w-[420px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full z-10 shadow-lg overflow-hidden">
              {selectedFeature ? (
                <FeaturePanel
                  feature={selectedFeature}
                  onClose={() => setSelectedFeatureId(null)}
                  onUpdateProperties={handleUpdateProperties}
                  isEncroaching={selectedFeatureId ? encroachingIds.has(selectedFeatureId) : false}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center">
                    <Map className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-bold text-sm text-slate-400">Select a vector feature to inspect</p>
                  <p className="text-xs text-slate-400">Click on any polygon or line on the map</p>
                </div>
              )}
            </aside>
          </div>

          {/* REGION C: Bottom Telemetry & GIS Export Dock */}
          <div className="h-12 flex-shrink-0 border-t border-slate-200 bg-white z-20 px-4 flex items-center justify-between text-xs font-mono shadow-inner">
            <div className="flex items-center gap-4">
              {selectedFeature ? (
                (() => {
                  const { area, perimeter } = calculateFeatureMetrics(selectedFeature, true);
                  return (
                    <>
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                        <span>AREA: {(selectedFeature.properties?.Area_sq_m || area).toFixed(1)} m² <span className="text-slate-400 ml-0.5">({((selectedFeature.properties?.Area_sq_m || area) * 0.000247105).toFixed(3)} Ac)</span></span>
                      </div>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <Ruler className="w-3.5 h-3.5 text-emerald-600" />
                        <span>PERIMETER: {(selectedFeature.properties?.Perimeter_m || perimeter).toFixed(1)} m</span>
                      </div>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <Target className="w-3.5 h-3.5 text-sky-600" />
                        <span>23.2599° N, 77.4126° E</span>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="text-slate-400 font-bold flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" /> READY
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider mr-1">GIS Export:</span>
              <button onClick={handleExportGeoJSON} className="flex items-center gap-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">
                <Download className="w-3 h-3 text-amber-500" /> .SHP
              </button>
              <button onClick={handleExportGeoJSON} className="flex items-center gap-1.5 bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">
                <Download className="w-3 h-3 text-amber-500" /> .DXF
              </button>
              <button onClick={handleExportGeoJSON} className="flex items-center gap-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">
                <Download className="w-3 h-3 text-amber-500" /> .GPKG
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

