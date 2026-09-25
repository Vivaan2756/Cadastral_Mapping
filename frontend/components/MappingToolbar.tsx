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
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 flex flex-wrap items-center gap-4 shadow-sm z-10 shrink-0 w-full">
      
      {/* Primary Drawing Tools */}
      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-inner">
        <button
          onClick={() => onModeChange("select")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            mode === "select"
              ? "bg-white text-emerald-700 border border-slate-200 shadow-sm scale-105"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent"
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" /> Select
        </button>
        <button
          onClick={() => onModeChange("edit")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            mode === "edit"
              ? "bg-white text-emerald-700 border border-slate-200 shadow-sm scale-105"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" /> Modify
        </button>
        
        <div className="w-px h-5 bg-slate-300 mx-1"></div>

        <button
          onClick={() => onModeChange("add_polygon")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            mode === "add_polygon"
              ? "bg-white text-emerald-700 border border-slate-200 shadow-sm scale-105"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent"
          }`}
        >
          <Pentagon className="w-3.5 h-3.5" /> Draw Parcel
        </button>
        
        <button
          onClick={() => onModeChange("add_line")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            mode === "add_line"
              ? "bg-white text-emerald-700 border border-slate-200 shadow-sm scale-105"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent"
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
              ? "bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm"
              : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200"></div>

      {/* History */}
      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-inner">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 rounded-md transition-colors ${
            canUndo
              ? "text-slate-700 hover:bg-white hover:shadow-sm"
              : "text-slate-300 cursor-not-allowed"
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
              ? "text-slate-700 hover:bg-white hover:shadow-sm"
              : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>
        
        <div className="w-px h-4 bg-slate-300 mx-1"></div>

        <button
          onClick={onReset}
          title="Reset to Original Topology"
          className="p-1.5 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Contextual Help */}
      <div className="ml-auto flex items-center text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 uppercase tracking-wider">
        {mode === "select" && "Click feature to inspect properties"}
        {mode === "edit" && "Drag vertices to modify geometry"}
        {mode === "add_polygon" && "Click to draw corners, double-click to finish"}
        {mode === "add_line" && "Click to draw points, double-click to finish"}
      </div>

    </div>
  );
};
