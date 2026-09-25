import React from "react";
import { GeoJSONFeature, FeatureProperties } from "../lib/geometry";
import { X, Layers, Tag, MapPin, Sparkles, Hash, Maximize2 } from "lucide-react";

interface FeaturePanelProps {
  feature: GeoJSONFeature | null;
  onClose: () => void;
  onUpdateProperties: (updatedProps: Partial<FeatureProperties>) => void;
}

export const FeaturePanel: React.FC<FeaturePanelProps> = ({
  feature,
  onClose,
  onUpdateProperties,
}) => {
  if (!feature) return null;

  const props = feature.properties || {};
  const currentType = props.type || "parcel";
  const currentSource = props.source || "AI Mapping";
  const surveyNumber = props.survey_number || "N/A";
  const areaSqM = props.Area_sq_m;
  const perimeterM = props.Perimeter_m;

  return (
    <div className="w-80 bg-zinc-950/95 border-l border-zinc-800 p-5 flex flex-col gap-4 text-zinc-100 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            Feature Properties
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Feature ID Badge */}
      <div className="bg-zinc-900/90 rounded-lg p-3 border border-zinc-800/90">
        <div className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
          <Hash className="w-3 h-3 text-zinc-500" />
          Feature ID
        </div>
        <div className="text-sm font-mono text-emerald-300 font-semibold truncate mt-0.5">
          {feature.id}
        </div>
      </div>

      {/* Editable Fields */}
      <div className="space-y-4 text-xs">
        {/* Type Selection */}
        <div>
          <label className="block font-mono text-zinc-400 mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3 text-zinc-500" />
            Feature Type
          </label>
          <select
            value={currentType}
            onChange={(e) => onUpdateProperties({ type: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="parcel">Parcel</option>
            <option value="building">Building</option>
            <option value="road">Road</option>
            <option value="water">Water Body</option>
            <option value="encroachment">Encroachment</option>
          </select>
        </div>

        {/* Survey Number */}
        <div>
          <label className="block font-mono text-zinc-400 mb-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-zinc-500" />
            Survey Number
          </label>
          <input
            type="text"
            value={surveyNumber}
            onChange={(e) => onUpdateProperties({ survey_number: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Source */}
        <div>
          <label className="block font-mono text-zinc-400 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-zinc-500" />
            Source / Attribution
          </label>
          <select
            value={currentSource}
            onChange={(e) => onUpdateProperties({ source: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="AI Mapping">AI Mapping</option>
            <option value="Manual Edit">Manual Edit</option>
            <option value="Ground Truth Verification">Ground Truth Verification</option>
          </select>
        </div>

        {/* Spatial Measurements (Area & Perimeter) */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
          {areaSqM !== undefined && (
            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Calculated Area</div>
              <div className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                {areaSqM.toFixed(1)} <span className="text-xs text-zinc-400 font-normal">m²</span>
              </div>
            </div>
          )}

          {perimeterM !== undefined && perimeterM > 0 && (
            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Perimeter / Length</div>
              <div className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                {perimeterM.toFixed(1)} <span className="text-xs text-zinc-400 font-normal">m</span>
              </div>
            </div>
          )}
        </div>

        {/* Standard Metadata */}
        {props.LADM_Standard && (
          <div className="pt-2 border-t border-zinc-900 text-[11px] text-zinc-500 space-y-1">
            <div className="flex justify-between">
              <span>Standard:</span>
              <span className="text-zinc-400 font-mono">{props.LADM_Standard}</span>
            </div>
            {props.LADM_Class && (
              <div className="flex justify-between">
                <span>LADM Class:</span>
                <span className="text-zinc-400 font-mono">{props.LADM_Class}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-900">
        <div className="text-[10px] font-mono text-zinc-500 text-center">
          GeoJSON changes auto-sync in real time
        </div>
      </div>
    </div>
  );
};
