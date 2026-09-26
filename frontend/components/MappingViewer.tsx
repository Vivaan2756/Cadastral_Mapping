import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as turf from "@turf/turf";
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
import { Image as ImageIcon, Sparkles, Activity, CheckCircle2 } from "lucide-react";

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
  onEncroachingChange?: (ids: Set<string>) => void;
  showGCP?: boolean;
}

const FEATURE_COLORS: Record<
  string,
  { stroke: string; fill: string; strokeWidth: number; fillOpacity: number; dashArray?: string }
> = {
  parcel: {
    stroke: "#059669",
    fill: "#10b981",
    strokeWidth: 1.5,
    fillOpacity: 0.12,
  },
  building: {
    stroke: "#ea580c",
    fill: "#f97316",
    strokeWidth: 1.8,
    fillOpacity: 0.30,
  },
  road: {
    stroke: "#facc15",
    fill: "#facc15",
    strokeWidth: 2.5,
    fillOpacity: 0.15,
  },
  water: {
    stroke: "#0284c7",
    fill: "#0284c7",
    strokeWidth: 2,
    fillOpacity: 0.55,
  },
  encroachment: {
    stroke: "#b91c1c",
    fill: "#ef4444",
    strokeWidth: 3,
    fillOpacity: 0.45,
    dashArray: "4 2",
  },
  default: {
    stroke: "#a855f7",
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
  onEncroachingChange,
  showGCP = true,
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

  // Camera State for Dual Sync
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(c => ({ ...c, scale: Math.max(0.1, Math.min(10, c.scale * scaleAdjust)) }));
  }, []);

  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || mode === "select" || mode === "edit") {
      setIsDraggingMap(true);
      setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    }
  }, [mode, camera]);

  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingMap) {
      setCamera(c => ({ ...c, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    }
  }, [isDraggingMap, dragStart]);

  const handleMapMouseUp = useCallback(() => {
    setIsDraggingMap(false);
  }, []);

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

  // Render SVG features and calculate encroachment overlaps
  const { features: svgFeatures, bbox, isPixel, overlappingFeatureIds, overlapSvgFeatures } = useMemo(() => {

    // Algorithmic Smoothing & Regularization
    const layerOrder: Record<string, number> = {
      parcel: 1,
      water: 2,
      road: 3,
      building: 4,
    };

    let processedFeatures = geojson.features.map(f => {
      if (f.properties?.type === 'road' && f.geometry) {
        try {
          // @ts-ignore
          const smoothed = turf.polygonSmooth(turf.feature(f.geometry), { iterations: 3 });
          return { ...f, geometry: smoothed.features[0].geometry } as GeoJSONFeature;
        } catch (e) {
          return f;
        }
      }
      if (f.properties?.type === 'building' && f.geometry) {
        try {
          // @ts-ignore
          const simplified = turf.simplify(turf.feature(f.geometry), { tolerance: 1.2, highQuality: true, mutate: false });
          return { ...f, geometry: simplified.geometry } as GeoJSONFeature;
        } catch (e) {
          return f;
        }
      }
      return f;
    });

    // Z-Index Sorting
    processedFeatures.sort((a, b) => {
      const typeA = a.properties?.type || 'parcel';
      const typeB = b.properties?.type || 'parcel';
      return (layerOrder[typeA] || 0) - (layerOrder[typeB] || 0);
    });

    const processedGeojson = { ...geojson, features: processedFeatures };
    const res = geoJsonToSvg(processedGeojson, viewWidth, viewHeight, initialBbox || undefined);

    // Calculate Encroachment Overlaps
    const overlappingFeatureIds = new Set<string>();
    const intersectionFeatures: any[] = [];

    const polys = processedGeojson.features.filter(f =>
      f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
    );

    // O(N^2) audit for overlaps between structures
    for (let i = 0; i < polys.length; i++) {
      for (let j = i + 1; j < polys.length; j++) {
        const f1 = polys[i];
        const f2 = polys[j];

        const type1 = f1.properties?.type || 'unknown';
        const type2 = f2.properties?.type || 'unknown';

        // Exclude Building vs Parcel overlap, since buildings natively sit inside parcels.
        // We want to catch Building vs Building, Parcel vs Parcel, Road vs Road, Road vs Building, etc.
        const isBuildingInsideParcel =
          (type1 === 'parcel' && type2 === 'building') ||
          (type1 === 'building' && type2 === 'parcel');

        if (!isBuildingInsideParcel) {
          try {
            // @ts-ignore
            const intersection = turf.intersect(turf.feature(f1.geometry), turf.feature(f2.geometry));
            if (intersection) {
              // Calculate overlap area (mocked metric if pixel space)
              overlappingFeatureIds.add(f1.id as string);
              overlappingFeatureIds.add(f2.id as string);
              intersectionFeatures.push({
                type: "Feature",
                id: `overlap-${f1.id}-${f2.id}`,
                properties: { type: "encroachment" },
                geometry: intersection.geometry
              });
            }
          } catch (e) {
            // Ignore degenerate geometries from manual drawing
          }
        }
      }
    }

    let overlapSvgFeatures: any[] = [];
    if (intersectionFeatures.length > 0) {
      const overlapFc = { type: "FeatureCollection", features: intersectionFeatures } as any;
      const oRes = geoJsonToSvg(overlapFc, viewWidth, viewHeight, initialBbox || undefined);
      overlapSvgFeatures = oRes.features;
    }

    return { ...res, overlappingFeatureIds, overlapSvgFeatures };
  }, [geojson, viewWidth, viewHeight, initialBbox]);

  useEffect(() => {
    if (onEncroachingChange) {
      onEncroachingChange(overlappingFeatureIds);
    }
  }, [overlappingFeatureIds, onEncroachingChange]);

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

  const [leftViewMode, setLeftViewMode] = useState<"RGB" | "DSM">("RGB");

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 grid grid-cols-2 gap-3 items-center justify-center h-full overflow-hidden select-none"
      onMouseUp={handleMouseUp}
    >
      {/* Left Side: Input Drone / Satellite Image */}
      <div className="w-full h-full max-h-full flex flex-col bg-white rounded-2xl border border-slate-200 p-2 shadow-sm overflow-hidden">
        <div className="w-full flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 truncate">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>[RAW ORTHOMOSAIC (ORI)] 5cm GSD</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 bg-slate-50 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setLeftViewMode("RGB"); }}
              className={`text-[10px] font-semibold py-0.5 px-2 rounded transition-colors ${leftViewMode === 'RGB' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              RGB Optical
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setLeftViewMode("DSM"); }}
              className={`text-[10px] font-semibold py-0.5 px-2 rounded transition-colors ${leftViewMode === 'DSM' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              DSM Surface
            </button>
          </div>
        </div>

        <div
          className="relative flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center group"
          style={{ width: "100%", height: "100%", cursor: isDraggingMap ? "grabbing" : "default" }}
          onWheel={handleWheel}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
        >
          <div style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`, transition: isDraggingMap ? 'none' : 'transform 0.1s ease-out', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inputImageUrl || imageUrl || "/hero-cadastral.jpg"}
              alt="Input Aerial Capture"
              className="w-full h-full object-contain pointer-events-none transition-all duration-300"
              style={leftViewMode === "DSM" ? { filter: 'contrast(180%) invert(20%) hue-rotate(190deg) brightness(90%)' } : {}}
            />
          </div>
        </div>
      </div>

      {/* Right Side: Mapped Image + Interactive SVG Vector Overlay Workspace */}
      <div className="w-full h-full max-h-full flex flex-col bg-slate-950 rounded-2xl border-2 border-slate-700/80 p-2 shadow-xl overflow-hidden">
        <div className="w-full flex items-center justify-between pb-2 shrink-0 bg-[#0f172a] px-3 py-2 border-b border-slate-800 rounded-t-xl -mt-2 -mx-2 mb-2 w-[calc(100%+16px)]">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-200 truncate">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>[STATUTORY CADASTRE] LADM ISO 19152</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#10b981" }}></div> PARCEL
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f97316" }}></div> BUILDING
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#facc15" }}></div> ROAD
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#0284c7" }}></div> WATER
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px]" style={{ borderBottomColor: "#ef4444" }}></div> ENCROACHMENT
              </span>
            </div>
          </div>
        </div>

        <div
          className="relative flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center"
          style={{ width: "100%", height: "100%", cursor: isDraggingMap ? "grabbing" : "default" }}
          onWheel={handleWheel}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
        >
          <div style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`, transition: isDraggingMap ? 'none' : 'transform 0.1s ease-out', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
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
              className={`absolute inset-0 w-full h-full z-10 ${mode === "add_polygon" || mode === "add_line"
                ? "cursor-crosshair"
                : mode === "edit"
                  ? (isDraggingMap ? "cursor-grabbing" : "cursor-grab")
                  : (isDraggingMap ? "cursor-grabbing" : "cursor-pointer")
                }`}
              onClick={handleSvgClick}
              onDoubleClick={handleSvgDoubleClick}
              onMouseMove={handleMouseMove}
            >
              <defs>
                <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="8" height="8">
                  <path
                    d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeOpacity="0.8"
                  />
                </pattern>
              </defs>

              {/* Render Features */}
              {svgFeatures.map((feat) => {
                const isSelected = feat.id === selectedFeatureId;
                const isHovered = feat.id === hoveredFeatureId;
                const isEncroaching = overlappingFeatureIds.has(feat.id);

                // Do NOT override the whole style for encroaching base features. Encroachment patches are rendered separately.
                const style = FEATURE_COLORS[feat.type] || FEATURE_COLORS.default;

                // Stroke scaling relative to viewBox dimension
                const baseScale = viewWidth / 512;
                const isSelectedBuilding = isSelected && feat.type === "building";
                const strokeColor = isSelectedBuilding ? "#e11d48" : (isSelected ? "#facc15" : style.stroke);
                const fillColor = isSelectedBuilding && !isEncroaching ? "rgba(225, 29, 72, 0.25)" : (isSelected && !isEncroaching ? "rgba(250, 204, 21, 0.25)" : style.fill);
                const fillOpacity = isSelected ? 1 : isHovered ? 0.3 : style.fillOpacity;
                const strokeWidth = (isSelectedBuilding ? 3 : isSelected ? 3.5 : isHovered ? 2.5 : style.strokeWidth) * baseScale;
                const filter = isSelectedBuilding ? "drop-shadow(0 0 8px rgba(225, 29, 72, 0.8))" : (isSelected ? "drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))" : "none");
                const dashArray = isSelectedBuilding ? `${2 * baseScale}, ${2 * baseScale}` : (style.dashArray ? style.dashArray : undefined);

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
                      strokeDasharray={dashArray}
                      style={{ filter }}
                      className={`transition-all duration-150 ${isEncroaching ? "animate-pulse" : ""}`}
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
                        strokeDasharray={dashArray}
                        strokeLinejoin="round"
                        className={`transition-all duration-150 ${isEncroaching ? "animate-pulse" : ""}`}
                        style={{ filter }}
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

              {/* Render Encroachment Intersections (Hatched / Red Patches) */}
              {overlapSvgFeatures.map((feat) => {
                const style = FEATURE_COLORS.encroachment;
                const baseScale = viewWidth / 512;
                return (
                  <g key={feat.id}>
                    {feat.svgPaths.map((pathD, pIdx) => (
                      <path
                        key={pIdx}
                        d={pathD}
                        fill="url(#diagonalHatch)"
                        fillOpacity="0.8"
                        stroke={style.stroke}
                        strokeWidth={1.5 * baseScale}
                        className="pointer-events-none"
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
                        r={4 * baseScale}
                        fill="#ffffff"
                        stroke="#3b82f6"
                        strokeWidth={1.5 * baseScale}
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

              {/* Centroid Marker for Selected Feature */}
              {selectedFeature && selectedFeature.rings.length > 0 && (
                (() => {
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  selectedFeature.rings.forEach(ring => {
                    ring.forEach(pt => {
                      if (pt[0] < minX) minX = pt[0];
                      if (pt[1] < minY) minY = pt[1];
                      if (pt[0] > maxX) maxX = pt[0];
                      if (pt[1] > maxY) maxY = pt[1];
                    });
                  });
                  const cx = (minX + maxX) / 2;
                  const cy = (minY + maxY) / 2;

                  return (
                    <g transform={`translate(${cx}, ${cy})`} className="pointer-events-none">
                      <circle cx="0" cy="0" r="4" fill="#facc15" className="animate-ping opacity-75" />
                      <circle cx="0" cy="0" r="2" fill="#facc15" />
                      <rect x="-60" y="-18" width="120" height="14" fill="#0f172a" rx="2" stroke="#facc15" strokeWidth="0.8" opacity="0.9" />
                      <text x="0" y="-8.5" fontSize="7" fill="#facc15" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                        Khasra {String(selectedFeature.id).substring(0, 10).replace('khasra_', '')} [Selected]
                      </text>
                    </g>
                  );
                })()
              )}

              {/* Visual GCP & CORS Markers */}
              {showGCP && (
                <>
                  <g transform={`translate(${viewWidth * 0.8}, ${viewHeight * 0.15})`} className="pointer-events-none">
                    <circle cx="0" cy="0" r="10" fill="none" stroke="#ef4444" strokeWidth="1" className="animate-ping" />
                    <circle cx="0" cy="0" r="4" fill="white" stroke="#ef4444" strokeWidth="1.5" />
                    <path d="M-6,0 L6,0 M0,-6 L0,6" stroke="#ef4444" strokeWidth="1" />
                    <rect x="8" y="-14" width="165" height="14" fill="rgba(2, 6, 23, 0.9)" rx="2" stroke="rgba(185, 28, 28, 0.8)" strokeWidth="1" />
                    <text x="14" y="-4" fontSize="7" fill="#fca5a5" fontFamily="monospace" fontWeight="bold">
                      ▲ CORS-MP-BHP-04 [Datum: 501.57m AMSL]
                    </text>
                  </g>
                  <g transform={`translate(${viewWidth * 0.18}, ${viewHeight * 0.85})`} className="pointer-events-none">
                    <polygon points="0,-6 5.2,3 -5.2,3" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="1.5" fill="#06b6d4" />
                    <rect x="8" y="-10" width="110" height="12" fill="rgba(2, 6, 23, 0.9)" rx="2" stroke="rgba(14, 116, 144, 0.8)" strokeWidth="1" />
                    <text x="14" y="-1.5" fontSize="7" fill="#67e8f9" fontFamily="monospace" fontWeight="bold">
                      ▲ GCP-HZR-02 [Base Anchor]
                    </text>
                  </g>
                </>
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

              {/* Survey Tile Neatline Boundary */}
              <g className="pointer-events-none">
                <line x1={0} y1={0} x2={0} y2={viewHeight} stroke="#64748b" strokeWidth={5 * (viewWidth / 512)} strokeDasharray={`${8 * (viewWidth / 512)} ${6 * (viewWidth / 512)}`} />
                <line x1={viewWidth} y1={0} x2={viewWidth} y2={viewHeight} stroke="#64748b" strokeWidth={5 * (viewWidth / 512)} strokeDasharray={`${8 * (viewWidth / 512)} ${6 * (viewWidth / 512)}`} />
                <line x1={0} y1={0} x2={viewWidth} y2={0} stroke="#64748b" strokeWidth={5 * (viewWidth / 512)} strokeDasharray={`${8 * (viewWidth / 512)} ${6 * (viewWidth / 512)}`} />
                <line x1={0} y1={viewHeight} x2={viewWidth} y2={viewHeight} stroke="#64748b" strokeWidth={5 * (viewWidth / 512)} strokeDasharray={`${8 * (viewWidth / 512)} ${6 * (viewWidth / 512)}`} />

                <rect x={10 * (viewWidth / 512)} y={10 * (viewWidth / 512)} width={200 * (viewWidth / 512)} height={20 * (viewWidth / 512)} fill="white" fillOpacity="0.85" rx={4 * (viewWidth / 512)} />
                <text x={16 * (viewWidth / 512)} y={24 * (viewWidth / 512)} fontSize={11 * (viewWidth / 512)} fill="#475569" fontWeight="bold" fontFamily="sans-serif">
                  Survey Tile Boundary (Neatline)
                </text>
              </g>
            </svg>
          </div>
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[10px] font-bold text-emerald-700 z-20 shadow-sm flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Validated
          </div>

          {/* Visual Diagnostics Panel (Section 20) */}
          {showDiagnostics && (
            <div className="absolute top-12 left-3 z-30 p-3.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-mono text-slate-700 shadow-lg space-y-1.5 max-w-[260px]">
              <div className="text-emerald-800 font-bold border-b border-slate-200 pb-1.5 flex justify-between">
                <span>SPATIAL REGISTRATION</span>
                <button onClick={() => setShowDiagnostics(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>
              <div><span className="text-slate-500 font-bold">TILE:</span> <span>{geojson.tile_id || "N/A"}</span></div>
              <div><span className="text-slate-500 font-bold">RASTER:</span> <span>{rasterDims.width} × {rasterDims.height}</span></div>
              <div><span className="text-slate-500 font-bold">CRS:</span> <span className="text-emerald-700">{geojson.crs?.properties?.name || (isPixel ? "Pixel_Space" : "EPSG:32643")}</span></div>
              <div className="pt-1.5 border-t border-slate-200 text-[10px] text-slate-600">
                <div>minX: {bbox.minX.toFixed(2)}</div>
                <div>maxX: {bbox.maxX.toFixed(2)}</div>
                <div>minY: {bbox.minY.toFixed(2)}</div>
                <div>maxY: {bbox.maxY.toFixed(2)}</div>
              </div>
              <div className="pt-1.5 border-t border-slate-200">
                <div><span className="text-slate-500 font-bold">FEATURES:</span> <span>{geojson.features.length}</span></div>
                <div><span className="text-slate-500 font-bold">SVG VIEWBOX:</span> <span>{viewWidth} × {viewHeight}</span></div>
              </div>
            </div>
          )}

          {/* Drawing Helper Hint Badge */}
          {(mode === "add_polygon" || mode === "add_line") && (
            <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-xs text-slate-700 font-mono shadow-lg backdrop-blur-md">
              {mode === "add_polygon"
                ? "Click points • Double-click to close Polygon"
                : "Click points • Double-click to complete Line"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
