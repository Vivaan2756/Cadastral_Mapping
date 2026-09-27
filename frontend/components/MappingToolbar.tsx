import React from "react";
import {
  MousePointer,
  Edit3,
  Pentagon,
  Spline,
  Trash2,
  Undo2,
  Redo2,
  RotateCcw,
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
  onReset: () => void;
  showGCP: boolean;
  onToggleGCP: (val: boolean) => void;
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
  onReset,
  showGCP,
  onToggleGCP,
}) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] rounded-lg border border-slate-700/80 shadow-md text-slate-200 shrink-0 w-full">
      
      {/* Primary Drawing Tools */}
      <div className="flex items-center gap-1">
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
            mode === "select"
              ? "bg-blue-600 text-white font-bold shadow-sm border border-blue-400"
              : "text-slate-300 hover:bg-slate-800 hover:text-white font-medium border border-transparent"
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" /> Select
        </button>
        <button
          onClick={() => onModeChange("edit")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
            mode === "edit"
              ? "bg-blue-600 text-white font-bold shadow-sm border border-blue-400"
              : "text-slate-300 hover:bg-slate-800 hover:text-white font-medium border border-transparent"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" /> Modify
        </button>
        
        <div className="w-px h-5 bg-slate-700 mx-1"></div>

        <button
          onClick={() => onModeChange("add_polygon")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
            mode === "add_polygon"
              ? "bg-blue-600 text-white font-bold shadow-sm border border-blue-400"
              : "text-slate-300 hover:bg-slate-800 hover:text-white font-medium border border-transparent"
          }`}
        >
          <Pentagon className="w-3.5 h-3.5" /> Draw Parcel
        </button>
        
        <button
          onClick={() => onModeChange("add_line")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
            mode === "add_line"
              ? "bg-blue-600 text-white font-bold shadow-sm border border-blue-400"
              : "text-slate-300 hover:bg-slate-800 hover:text-white font-medium border border-transparent"
          }`}
        >
          <Spline className="w-3.5 h-3.5" /> Draw Road
        </button>
      </div>

      {/* Editing Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Delete Selected (Del or Backspace)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${
            hasSelection
              ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 hover:border-red-400 shadow-sm"
              : "bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      <div className="w-px h-6 bg-slate-700"></div>

      {/* History */}
      {/* History */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 rounded-md transition-colors ${
            canUndo
              ? "text-slate-300 hover:text-white hover:bg-slate-800"
              : "text-slate-600 cursor-not-allowed"
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1.5 rounded-md transition-colors ${
            canRedo
              ? "text-slate-300 hover:text-white hover:bg-slate-800"
              : "text-slate-600 cursor-not-allowed"
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>
        
        <div className="w-px h-4 bg-slate-700 mx-1"></div>

        <button
          onClick={onReset}
          title="Reset to Original Topology"
          className="p-1.5 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="w-px h-6 bg-slate-700 mx-2"></div>
      
      {/* GCP Marker Toggle */}
      <button
        onClick={() => onToggleGCP(!showGCP)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-colors border ${
          showGCP 
            ? "bg-slate-800 text-cyan-400 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]" 
            : "bg-transparent text-slate-400 border-slate-700 hover:text-slate-300 hover:bg-slate-800"
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${showGCP ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`}></div>
        GCP/CORS Markers
      </button>

      {/* Contextual Help */}
      {/* Contextual Help */}
      <div className="ml-auto flex items-center text-[10px] font-bold text-slate-400 bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-700 uppercase tracking-wider">
        {mode === "select" && "Click feature to inspect properties"}
        {mode === "edit" && "Drag vertices to modify geometry"}
        {mode === "add_polygon" && "Click to draw corners, double-click to finish"}
        {mode === "add_line" && "Click to draw points, double-click to finish"}
      </div>

    </div>
  );
};
