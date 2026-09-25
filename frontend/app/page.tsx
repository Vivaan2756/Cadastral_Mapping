"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ImageUploader } from "../components/ImageUploader";
import { ProcessingAnimation } from "../components/ProcessingAnimation";
import { MappingViewer } from "../components/MappingViewer";
import { MappingToolbar, EditorMode } from "../components/MappingToolbar";
import { FeaturePanel } from "../components/FeaturePanel";
import {
  matchUploadedFileToTile,
  getTileImageUrl,
  fetchTileGeoJSON,
  getSavedTileEdits,
  saveTileEdits,
  clearTileEdits,
} from "../lib/demoData";
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  FeatureProperties,
} from "../lib/geometry";
import { Layers, Map, Sparkles, RefreshCw } from "lucide-react";

type AppScreen = "UPLOAD" | "PROCESSING" | "RESULT";

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("UPLOAD");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    size: string;
    dimensions?: string;
    previewUrl: string;
  } | null>(null);

  // Active Demo Tile
  const [activeTileId, setActiveTileId] = useState<string>("huzur_mapped_01");
  const [imageUrl, setImageUrl] = useState<string>("/api/tiles/huzur_mapped_01/image");

  // GeoJSON & History State
  const [originalGeoJSON, setOriginalGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
  const [currentGeoJSON, setCurrentGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
  const [history, setHistory] = useState<GeoJSONFeatureCollection[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Editor Mode & Selection
  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Handle file selected in Uploader
  const handleFileSelected = (
    file: File,
    details: { name: string; size: string; dimensions?: string; previewUrl: string }
  ) => {
    setSelectedFile(file);
    setFileDetails(details);
    const matched = matchUploadedFileToTile(file.name);
    setActiveTileId(matched);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileDetails(null);
    setActiveTileId("huzur_mapped_01");
  };

  // Start AI Processing
  const handleRunMapping = () => {
    if (!selectedFile && !fileDetails) return;
    setScreen("PROCESSING");
  };

  // Processing Completed -> Load Data and transition to Result Screen
  const handleProcessingComplete = useCallback(async () => {
    const tileId = activeTileId;
    setImageUrl(getTileImageUrl(tileId));

    // Check if saved edits exist in localStorage
    const saved = getSavedTileEdits(tileId);
    const original = await fetchTileGeoJSON(tileId);

    setOriginalGeoJSON(original);

    const initial = saved || original;
    setCurrentGeoJSON(initial);
    setHistory([initial]);
    setHistoryIndex(0);
    setIsSaved(!!saved);

    setScreen("RESULT");
  }, [activeTileId]);

  // Update GeoJSON and push to history
  const handleGeoJsonChange = useCallback(
    (newGeoJson: GeoJSONFeatureCollection) => {
      setCurrentGeoJSON(newGeoJson);
      setIsSaved(false);

      // Trim any future redo states and append new state
      setHistory((prev) => {
        const updated = prev.slice(0, historyIndex + 1);
        return [...updated, newGeoJson];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Undo / Redo
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

  // Delete Selected Feature
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

  // Save Edits to LocalStorage
  const handleSave = useCallback(() => {
    if (!currentGeoJSON) return;
    saveTileEdits(activeTileId, currentGeoJSON);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }, [activeTileId, currentGeoJSON]);

  // Reset to Original Pre-Generated AI Features
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

  // Export current GeoJSON as browser Blob download
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

  // Selected feature object for properties panel
  const selectedFeature = useMemo<GeoJSONFeature | null>(() => {
    if (!currentGeoJSON || !selectedFeatureId) return null;
    return currentGeoJSON.features.find((f) => f.id === selectedFeatureId) || null;
  }, [currentGeoJSON, selectedFeatureId]);

  // Update properties of selected feature
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Map className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-zinc-100 text-sm">
                TerraMap AI
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                PAGE 1 • CADASTRE
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              AI-Powered Urban Cadastral Intelligence
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold shadow-sm">
              Page 1: Extraction
            </div>
            <Link
              href="/page2-reconcile"
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              Page 2: Reconciliation
            </Link>
            <Link
              href="/page3-dispute"
              className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              Page 3: Dispute
            </Link>
          </div>

          {screen === "RESULT" && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="text-zinc-500">TILE:</span>
                <span className="text-emerald-400 font-semibold">{activeTileId}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">FEATURES:</span>
                <span className="text-zinc-200 font-semibold">
                  {currentGeoJSON?.features.length || 0}
                </span>
              </div>

              <button
                onClick={() => {
                  setScreen("UPLOAD");
                  handleClearFile();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Image</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {screen === "UPLOAD" && (
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
            <div className="w-full max-w-2xl text-center mb-8 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-mono mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>HIGH PRECISION URBAN CADASTRE</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
                AI Cadastral Mapping
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto">
                Upload a satellite or drone image to automatically extract cadastral features, parcels, buildings, and roads.
              </p>
            </div>

            <ImageUploader
              onFileSelected={handleFileSelected}
              onRunMapping={handleRunMapping}
              selectedFile={selectedFile}
              fileDetails={fileDetails}
              onClearFile={handleClearFile}
            />
          </div>
        )}

        {screen === "PROCESSING" && (
          <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
            <ProcessingAnimation
              fileName={fileDetails?.name}
              onComplete={handleProcessingComplete}
            />
          </div>
        )}

        {screen === "RESULT" && currentGeoJSON && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Editing Toolbar */}
            <MappingToolbar
              mode={editorMode}
              onModeChange={setEditorMode}
              onDeleteSelected={handleDeleteSelected}
              hasSelection={!!selectedFeatureId}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onSave={handleSave}
              onReset={handleReset}
              onExportGeoJSON={handleExportGeoJSON}
              isSaved={isSaved}
            />

            {/* Editor Body: Dual Workspaces (Input Image + Mapped Vector Workspace) + Contextual Feature Panel */}
            <div className="flex-1 flex overflow-hidden relative">
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
              />

              {/* Contextual Right Feature Properties Panel */}
              {selectedFeature && (
                <FeaturePanel
                  feature={selectedFeature}
                  onClose={() => setSelectedFeatureId(null)}
                  onUpdateProperties={handleUpdateProperties}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
