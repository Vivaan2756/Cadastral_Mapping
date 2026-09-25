import React from "react";
import {
  MousePointer,
  Edit3,
  Pentagon,
  Spline,
  Trash2,
  Undo2,
  Redo2,
  Save,
  RotateCcw,
  Download,
  CheckCircle2,
} from "lucide-react";

export type EditorMode = "select" | "edit" | "add_polygon" | "add_line";

interface MappingToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onReset: () => void;
  onExportGeoJSON: () => void;
  isSaved?: boolean;
}

export const MappingToolbar: React.FC<MappingToolbarProps> = ({
  mode,
  onModeChange,
  onDeleteSelected,
  hasSelection,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onReset,
  onExportGeoJSON,
  isSaved = false,
}) => {
  return (
    <div className="w-full bg-zinc-900/90 border-b border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md backdrop-blur-md">
      {/* Primary Editor Tools */}
      <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
        <button
          onClick={() => onModeChange("select")}
          title="Select Mode (Click to inspect feature)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            mode === "select"
              ? "bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>

        <button
          onClick={() => onModeChange("edit")}
          title="Edit Mode (Drag vertices of selected feature)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            mode === "edit"
              ? "bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

        <button
          onClick={() => onModeChange("add_polygon")}
          title="Add Polygon (Click points on image, double click to finish)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            mode === "add_polygon"
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Pentagon className="w-3.5 h-3.5" />
          <span>Add Polygon</span>
        </button>

        <button
          onClick={() => onModeChange("add_line")}
          title="Add Line (Click road/boundary points, double click to finish)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
            mode === "add_line"
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          <Spline className="w-3.5 h-3.5" />
          <span>Add Line</span>
        </button>
      </div>

      {/* Action / History Tools */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Delete selected feature"
          className={`p-2 rounded-lg text-xs font-medium border transition-all ${
            hasSelection
              ? "border-rose-900/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60"
              : "border-transparent text-zinc-600 cursor-not-allowed"
          }`}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo edit"
          className={`p-2 rounded-lg text-xs font-medium border transition-all ${
            canUndo
              ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              : "border-transparent text-zinc-600 cursor-not-allowed"
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo edit"
          className={`p-2 rounded-lg text-xs font-medium border transition-all ${
            canRedo
              ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              : "border-transparent text-zinc-600 cursor-not-allowed"
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

        <button
          onClick={onSave}
          title="Save edits to localStorage"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
        >
          {isSaved ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Save className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span>{isSaved ? "Saved" : "Save"}</span>
        </button>

        <button
          onClick={onReset}
          title="Reset to original pre-generated AI geometry"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          onClick={onExportGeoJSON}
          title="Download current edited FeatureCollection as GeoJSON"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors ml-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export</span>
        </button>

        <a
          href="/page2-reconcile?survey=08-412-K"
          onClick={onSave}
          title="Commit Vector Geometries & Reconcile in Page 2"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all ml-1 cursor-pointer"
        >
          <span>Commit & Reconcile →</span>
        </a>
      </div>
    </div>
  );
};
