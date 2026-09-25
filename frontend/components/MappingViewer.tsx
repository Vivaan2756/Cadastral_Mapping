import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  geoJsonToSvg,
  updateFeatureVertexInGeoJSON,
  createPolygonFromSvgPoints,
  createLineFromSvgPoints,
  BoundingBox,
  isPixelSpaceGeoJSON,
} from "../lib/geometry";
import { EditorMode } from "./MappingToolbar";
import { Image as ImageIcon, Sparkles, Activity } from "lucide-react";

interface MappingViewerProps {
  imageUrl: string;
  inputImageUrl?: string | null;
  inputImageName?: string | null;
  geojson: GeoJSONFeatureCollection;
  mode: EditorMode;
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string | null) => void;
  onGeoJsonChange: (newGeoJson: GeoJSONFeatureCollection) => void;
  onDrawingFinish?: () => void;
}

const FEATURE_COLORS: Record<
  string,
  { stroke: string; fill: string; strokeWidth: number; fillOpacity: number }
> = {
  parcel: {
    stroke: "#10b981", // Emerald
    fill: "#10b981",
    strokeWidth: 2,
    fillOpacity: 0.15,
  },
  building: {
    stroke: "#f59e0b", // Amber / Orange
    fill: "#f59e0b",
    strokeWidth: 2,
    fillOpacity: 0.35,
  },
  road: {
    stroke: "#38bdf8", // Sky Blue
    fill: "#38bdf8",
    strokeWidth: 3,
    fillOpacity: 0.2,
  },
  water: {
    stroke: "#06b6d4", // Cyan
    fill: "#06b6d4",
    strokeWidth: 2,
    fillOpacity: 0.4,
  },
  encroachment: {
    stroke: "#f43f5e", // Rose Red
    fill: "#f43f5e",
    strokeWidth: 2.5,
    fillOpacity: 0.4,
  },
  default: {
    stroke: "#a855f7", // Purple
    fill: "#a855f7",
    strokeWidth: 2,
    fillOpacity: 0.2,
  },
};

export const MappingViewer: React.FC<MappingViewerProps> = ({
  imageUrl,
  inputImageUrl,
  inputImageName = "Input Aerial Image",
  geojson,
  mode,
  selectedFeatureId,
  onSelectFeature,
  onGeoJsonChange,
  onDrawingFinish,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Diagnostic panel toggle
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Image natural dimensions
  const [rasterDims, setRasterDims] = useState<{ width: number; height: number }>({
    width: geojson.image_width || 1230,
    height: geojson.image_height || 1232,
  });

  // Keep SVG coordinate space matched to raster / geojson dimensions
  const viewWidth = geojson.image_width || rasterDims.width || 1230;
  const viewHeight = geojson.image_height || rasterDims.height || 1232;

  // Drawing state for Add Polygon / Add Line
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [cursorPos, setCursorPos] = useState<[number, number] | null>(null);

  // Vertex Dragging state for Edit mode
  const [draggingVertex, setDraggingVertex] = useState<{
    featureId: string;
    ringIndex: number;
    vertexIndex: number;
  } | null>(null);

  // Hover state
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);

  // Keep static bounding box once calculated so coordinates stay fixed during editing
  const [initialBbox, setInitialBbox] = useState<BoundingBox | null>(null);

  // Update raster dimensions when image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setRasterDims({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    }
  };

  // Reset initialBbox when tile changes
  useEffect(() => {
    setInitialBbox(null);
  }, [geojson.tile_id]);

  // Render SVG features
  const { features: svgFeatures, bbox, isPixel } = useMemo(() => {
    const res = geoJsonToSvg(geojson, viewWidth, viewHeight, initialBbox || undefined);
    return res;
  }, [geojson, viewWidth, viewHeight, initialBbox]);

  useEffect(() => {
    if (!initialBbox && bbox) {
      setInitialBbox(bbox);
    }
  }, [bbox, initialBbox]);

  // Reset drawing points when mode changes
  useEffect(() => {
    setDrawingPoints([]);
    setDraggingVertex(null);
  }, [mode]);

  // Convert client mouse coordinates to SVG coordinate space [0..viewWidth, 0..viewHeight]
  const getSvgCoordinates = useCallback(
    (e: React.MouseEvent<SVGSVGElement | HTMLElement>): [number, number] | null => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * viewWidth;
      const y = ((e.clientY - rect.top) / rect.height) * viewHeight;
      return [
        Math.max(0, Math.min(viewWidth, Math.round(x * 10) / 10)),
        Math.max(0, Math.min(viewHeight, Math.round(y * 10) / 10)),
      ];
    },
    [viewWidth, viewHeight]
  );

  // Handle vertex drag mouse movement
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoordinates(e);
    if (!coords) return;
    setCursorPos(coords);

    if (mode === "edit" && draggingVertex && (initialBbox || bbox)) {
      const activeBox = initialBbox || bbox;
      const updated = updateFeatureVertexInGeoJSON(
        geojson,
        draggingVertex.featureId,
        draggingVertex.ringIndex,
        draggingVertex.vertexIndex,
        coords,
        activeBox,
        viewWidth,
        viewHeight,
        isPixel
      );
      onGeoJsonChange(updated);
    }
  };

  const handleMouseUp = () => {
    if (draggingVertex) {
      setDraggingVertex(null);
    }
  };

  // Handle clicking on SVG canvas
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoordinates(e);
    if (!coords) return;

    if (mode === "add_polygon" || mode === "add_line") {
      setDrawingPoints((prev) => [...prev, coords]);
    } else if (mode === "select" && e.target === svgRef.current) {
      onSelectFeature(null);
    }
  };

  // Finish polygon or line creation on double click
  const handleSvgDoubleClick = () => {
    const activeBox = initialBbox || bbox;
    if (!activeBox) return;

    if (mode === "add_polygon" && drawingPoints.length >= 3) {
      const newFeature = createPolygonFromSvgPoints(
        drawingPoints,
        activeBox,
        {
          type: "parcel",
          source: "Manual Edit",
        },
        viewWidth,
        viewHeight,
        isPixel
      );
      const updatedGeoJSON: GeoJSONFeatureCollection = {
        ...geojson,
        features: [...geojson.features, newFeature],
      };
      onGeoJsonChange(updatedGeoJSON);
      onSelectFeature(newFeature.id);
      setDrawingPoints([]);
      if (onDrawingFinish) onDrawingFinish();
    } else if (mode === "add_line" && drawingPoints.length >= 2) {
      const newFeature = createLineFromSvgPoints(
        drawingPoints,
        activeBox,
        {
          type: "road",
          source: "Manual Edit",
        },
        viewWidth,
        viewHeight,
        isPixel
      );
      const updatedGeoJSON: GeoJSONFeatureCollection = {
        ...geojson,
        features: [...geojson.features, newFeature],
      };
      onGeoJsonChange(updatedGeoJSON);
      onSelectFeature(newFeature.id);
      setDrawingPoints([]);
      if (onDrawingFinish) onDrawingFinish();
    }
  };

  const selectedFeature = useMemo(() => {
    return svgFeatures.find((f) => f.id === selectedFeatureId) || null;
  }, [svgFeatures, selectedFeatureId]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full flex items-center justify-center p-4 lg:p-6 overflow-hidden bg-zinc-950 select-none"
      onMouseUp={handleMouseUp}
    >
      {/* Side-by-side Dual Workspaces container */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 max-w-full max-h-full">
        {/* Left Side: Input Drone / Satellite Image */}
        {inputImageUrl && (
          <div className="flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-2 px-1 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold">INPUT SATELLITE / DRONE</span>
              </div>
              <span className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                {inputImageName}
              </span>
            </div>

            <div
              className="relative rounded-xl overflow-hidden shadow-2xl border border-zinc-800/90 bg-zinc-900/50 flex items-center justify-center group"
              style={{
                aspectRatio: "1/1",
                width: "min(72vh, 42vw, 512px)",
                height: "min(72vh, 42vw, 512px)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inputImageUrl}
                alt="Input Aerial Capture"
                className="w-full h-full object-contain pointer-events-none"
              />

              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-zinc-300">
                ORIGINAL IMAGE
              </div>
            </div>
          </div>
        )}

        {/* Right Side: Mapped Image + Interactive SVG Vector Overlay Workspace */}
        <div className="flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-2 px-1 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-semibold">AI MAPPED CADASTRAL WORKSPACE</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiagnostics((prev) => !prev)}
                title="Toggle Spatial Registration Diagnostic Panel"
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  showDiagnostics
                    ? "border-emerald-500/60 bg-emerald-950/60 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>Diag</span>
              </button>
              <span className="text-[11px] text-zinc-400">
                {geojson.features.length} Features
              </span>
            </div>
          </div>

          <div
            className="relative rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-black flex items-center justify-center"
            style={{
              aspectRatio: "1/1",
              width: "min(72vh, 42vw, 512px)",
              height: "min(72vh, 42vw, 512px)",
            }}
          >
            {/* Visual Map Image (Source of Truth raster representation) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Cadastral Visual Map"
              onLoad={handleImageLoad}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0"
            />

            {/* Vector SVG Geometry Overlay - viewBox matches exact image raster coordinates */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${viewWidth} ${viewHeight}`}
              className={`absolute inset-0 w-full h-full z-10 ${
                mode === "add_polygon" || mode === "add_line"
                  ? "cursor-crosshair"
                  : mode === "edit"
                  ? "cursor-default"
                  : "cursor-pointer"
              }`}
              onClick={handleSvgClick}
              onDoubleClick={handleSvgDoubleClick}
              onMouseMove={handleMouseMove}
            >
              {/* Render Features */}
              {svgFeatures.map((feat) => {
                const isSelected = feat.id === selectedFeatureId;
                const isHovered = feat.id === hoveredFeatureId;
                const style = FEATURE_COLORS[feat.type] || FEATURE_COLORS.default;

                // Stroke scaling relative to viewBox dimension
                const baseScale = viewWidth / 512;
                const strokeColor = isSelected ? "#38bdf8" : style.stroke;
                const fillColor = isSelected ? "#0284c7" : style.fill;
                const fillOpacity = isSelected ? 0.45 : isHovered ? 0.3 : style.fillOpacity;
                const strokeWidth = (isSelected ? 3.5 : isHovered ? 2.5 : style.strokeWidth) * baseScale;

                if (feat.geometryType === "LineString") {
                  return (
                    <path
                      key={feat.id}
                      d={feat.svgPaths[0]}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFeature(feat.id);
                      }}
                      onMouseEnter={() => setHoveredFeatureId(feat.id)}
                      onMouseLeave={() => setHoveredFeatureId(null)}
                    />
                  );
                }

                return (
                  <g key={feat.id}>
                    {feat.svgPaths.map((pathD, pIdx) => (
                      <path
                        key={pIdx}
                        d={pathD}
                        fill={fillColor}
                        fillOpacity={fillOpacity}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeLinejoin="round"
                        className="transition-all duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFeature(feat.id);
                        }}
                        onMouseEnter={() => setHoveredFeatureId(feat.id)}
                        onMouseLeave={() => setHoveredFeatureId(null)}
                      />
                    ))}
                  </g>
                );
              })}

              {/* Interactive Vertex Handles in Edit Mode */}
              {mode === "edit" &&
                selectedFeature &&
                selectedFeature.rings.map((ring, rIdx) =>
                  ring.map((pt, vIdx) => {
                    const isDragging =
                      draggingVertex?.featureId === selectedFeature.id &&
                      draggingVertex?.ringIndex === rIdx &&
                      draggingVertex?.vertexIndex === vIdx;
                    const baseScale = viewWidth / 512;

                    return (
                      <circle
                        key={`${rIdx}-${vIdx}`}
                        cx={pt[0]}
                        cy={pt[1]}
                        r={(isDragging ? 7 : 5) * baseScale}
                        fill={isDragging ? "#38bdf8" : "#ffffff"}
                        stroke="#0284c7"
                        strokeWidth={2 * baseScale}
                        className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingVertex({
                            featureId: selectedFeature.id,
                            ringIndex: rIdx,
                            vertexIndex: vIdx,
                          });
                        }}
                      />
                    );
                  })
                )}

              {/* User Drawing In-Progress Preview */}
              {drawingPoints.length > 0 && (
                <g className="pointer-events-none">
                  {/* Drawn lines so far */}
                  {drawingPoints.length > 1 && (
                    <path
                      d={
                        `M ${drawingPoints[0][0]} ${drawingPoints[0][1]} ` +
                        drawingPoints
                          .slice(1)
                          .map((p) => `L ${p[0]} ${p[1]}`)
                          .join(" ")
                      }
                      fill={mode === "add_polygon" ? "rgba(16, 185, 129, 0.2)" : "none"}
                      stroke="#10b981"
                      strokeWidth={2.5 * (viewWidth / 512)}
                      strokeDasharray={`${4 * (viewWidth / 512)} ${2 * (viewWidth / 512)}`}
                    />
                  )}

                  {/* Line to current cursor */}
                  {cursorPos && drawingPoints.length > 0 && (
                    <line
                      x1={drawingPoints[drawingPoints.length - 1][0]}
                      y1={drawingPoints[drawingPoints.length - 1][1]}
                      x2={cursorPos[0]}
                      y2={cursorPos[1]}
                      stroke="#10b981"
                      strokeWidth={1.5 * (viewWidth / 512)}
                      strokeDasharray={`${3 * (viewWidth / 512)} ${3 * (viewWidth / 512)}`}
                    />
                  )}

                  {/* Point circles */}
                  {drawingPoints.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt[0]}
                      cy={pt[1]}
                      r={4 * (viewWidth / 512)}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={1.5 * (viewWidth / 512)}
                    />
                  ))}
                </g>
              )}
            </svg>

            {/* Top Badge */}
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-emerald-400 z-20">
              VECTOR CADASTRE
            </div>

            {/* Visual Diagnostics Panel (Section 20) */}
            {showDiagnostics && (
              <div className="absolute top-10 left-2.5 z-30 p-3 rounded-lg bg-black/85 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono text-zinc-300 shadow-2xl space-y-1 max-w-[240px]">
                <div className="text-emerald-400 font-bold border-b border-zinc-800 pb-1 flex justify-between">
                  <span>SPATIAL REGISTRATION</span>
                  <button onClick={() => setShowDiagnostics(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
                </div>
                <div><span className="text-zinc-500">TILE:</span> <span className="text-zinc-200">{geojson.tile_id || "N/A"}</span></div>
                <div><span className="text-zinc-500">RASTER:</span> <span className="text-zinc-200">{rasterDims.width} × {rasterDims.height}</span></div>
                <div><span className="text-zinc-500">CRS:</span> <span className="text-emerald-300">{geojson.crs?.properties?.name || (isPixel ? "Pixel_Space" : "EPSG:32643")}</span></div>
                <div className="pt-1 border-t border-zinc-800/80 text-[9px] text-zinc-400">
                  <div>minX: {bbox.minX.toFixed(2)}</div>
                  <div>maxX: {bbox.maxX.toFixed(2)}</div>
                  <div>minY: {bbox.minY.toFixed(2)}</div>
                  <div>maxY: {bbox.maxY.toFixed(2)}</div>
                </div>
                <div className="pt-1 border-t border-zinc-800/80">
                  <div><span className="text-zinc-500">FEATURES:</span> <span className="text-zinc-200">{geojson.features.length}</span></div>
                  <div><span className="text-zinc-500">SVG VIEWBOX:</span> <span className="text-zinc-200">{viewWidth} × {viewHeight}</span></div>
                </div>
              </div>
            )}

            {/* Drawing Helper Hint Badge */}
            {(mode === "add_polygon" || mode === "add_line") && (
              <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs text-zinc-200 font-mono shadow-lg backdrop-blur-md">
                {mode === "add_polygon"
                  ? "Click points • Double-click to close Polygon"
                  : "Click points • Double-click to complete Line"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
