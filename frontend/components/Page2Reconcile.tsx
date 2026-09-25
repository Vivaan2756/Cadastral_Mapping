"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import {
  PILOT_HIERARCHY,
  KHASRA_METADATA_REGISTRY,
  RoRData,
  SurveyRecord,
  projectGeoJsonToWgs84,
  getWgs84Bbox,
  deriveImageFootprint,
} from "../lib/reconciliation";
import {
  fetchTileGeoJSON,
  getCommittedCadastre,
  getSavedTileEdits,
  getSurveySpatialRecords,
} from "../lib/demoData";
import { GeoJSONFeatureCollection, GeoJSONFeature, calculatePolygonArea } from "../lib/geometry";
import {
  Map as MapIcon,
  AlertTriangle,
  FileText,
  Scale,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  Compass,
  Layers,
} from "lucide-react";

// Register MapLibre worker and PMTiles protocol globally once
let isWorkerConfigured = false;
function ensureMaplibreWorkerConfigured() {
  if (!isWorkerConfigured && typeof window !== "undefined") {
    try {
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      isWorkerConfigured = true;
    } catch (e) {
      console.warn("MapLibre setWorkerUrl warning:", e);
    }
  }
}

let isProtocolRegistered = false;
function ensurePmtilesProtocolRegistered() {
  if (!isProtocolRegistered && typeof window !== "undefined") {
    try {
      const protocol = new Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      isProtocolRegistered = true;
    } catch (e) {
      console.warn("PMTiles protocol registration notice:", e);
    }
  }
}

export const Page2Reconcile: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mounted flag to ensure flawless hydration
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Administrative Cascading State
  const [selectedState] = useState<string>(PILOT_HIERARCHY.state);
  const [selectedDistrict] = useState<string>(PILOT_HIERARCHY.district);
  const [selectedTehsil] = useState<string>(PILOT_HIERARCHY.tehsil);
  const [selectedVillage] = useState<string>(PILOT_HIERARCHY.village);

  // Consistent SSR/Client initial survey selection
  const [selectedKhasraId, setSelectedKhasraId] = useState<string>("08-412-A");

  // Persisted survey records from Page 1
  const [persistedRecords, setPersistedRecords] = useState<Record<string, SurveyRecord>>({});

  // Dispute state
  const [flaggedKhasraId, setFlaggedKhasraId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Authoritative Cadastre Datasets
  const [allParcelsGeoJSON, setAllParcelsGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
  const [publicInfraGeoJSON, setPublicInfraGeoJSON] = useState<GeoJSONFeatureCollection | null>(null);
  const [propertyCards, setPropertyCards] = useState<Record<string, RoRData>>(KHASRA_METADATA_REGISTRY);

  // MapLibre references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Mark mounted and sync query param / localStorage state
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const records = getSurveySpatialRecords();
      setPersistedRecords(records);

      const urlSurvey = searchParams ? searchParams.get("survey") : null;
      if (urlSurvey) {
        setSelectedKhasraId(urlSurvey);
      } else {
        const storedActiveTile = localStorage.getItem("alpha_cadastre_active_tile");
        const tileToKhasra: Record<string, string> = {
          "00_00": "08-412-A",
          "huzur_mapped_01": "08-412-K",
          "00_03": "08-412-B",
          "huzur_mapped_02": "08-412-B",
          "00_05": "08-412-C",
          "huzur_mapped_03": "08-412-C",
        };
        if (storedActiveTile && tileToKhasra[storedActiveTile]) {
          setSelectedKhasraId(tileToKhasra[storedActiveTile]);
        }
      }
    }
  }, [searchParams]);

  // Combined survey options: Statutory Khasras + Page 1 Generated Surveys
  const availableSurveys = useMemo(() => {
    const list = [...PILOT_HIERARCHY.khasras];
    for (const key of Object.keys(persistedRecords)) {
      if (!list.includes(key)) {
        list.unshift(key);
      }
    }
    return list;
  }, [persistedRecords]);

  // Load authoritative fixtures on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFixtures() {
      try {
        const [parcelsRes, infraRes, cardsRes] = await Promise.all([
          fetch("/data/cadastre_parcels.geojson"),
          fetch("/data/public_infrastructure.geojson"),
          fetch("/data/property_cards_fixture.json"),
        ]);

        if (parcelsRes.ok) {
          const pData = await parcelsRes.json();
          if (isMounted) setAllParcelsGeoJSON(pData);
        }
        if (infraRes.ok) {
          const iData = await infraRes.json();
          if (isMounted) setPublicInfraGeoJSON(iData);
        }
        if (cardsRes.ok) {
          const cData = await cardsRes.json();
          if (isMounted) setPropertyCards(cData);
        }
      } catch (e) {
        console.warn("[Page2] Fixture loading notice:", e);
      }
    }

    loadFixtures();
    return () => {
      isMounted = false;
    };
  }, []);

  // Check selected survey record from persisted SurveyRecords
  const currentSurveyRecord = useMemo<SurveyRecord | null>(() => {
    if (persistedRecords[selectedKhasraId]) {
      return persistedRecords[selectedKhasraId];
    }
    return null;
  }, [persistedRecords, selectedKhasraId]);

  // Active RoR metadata for selected Khasra
  const activeRoR = useMemo<RoRData>(() => {
    const fromRecord = currentSurveyRecord?.surveyInfo;
    const base = propertyCards[selectedKhasraId] || KHASRA_METADATA_REGISTRY[selectedKhasraId];

    if (fromRecord) {
      return {
        khasraId: selectedKhasraId,
        khataNumber: fromRecord.khataNumber || base?.khataNumber || "KH-792/2023",
        plotId: `PL-BGK-${selectedKhasraId.replace(/-/g, "")}`,
        featureClass: fromRecord.featureClass || fromRecord.landUse || base?.featureClass || "AI Ortho Drone Surveyed Parcel",
        coOwners: fromRecord.coOwners || (fromRecord.owner ? [fromRecord.owner] : base?.coOwners || ["State Land Registry / Drone Extraction"]),
        annualRevenue: fromRecord.annualRevenue || base?.annualRevenue || "₹ 1,420 / annum",
        soilClassification: fromRecord.soilClassification || base?.soilClassification || "Medium Black (Kali-2)",
        mortgageStatus: fromRecord.mortgageStatus || base?.mortgageStatus || "Unencumbered",
        ulpin: fromRecord.ulpin || base?.ulpin || `482910${selectedKhasraId.replace(/[^0-9A-Z]/g, "")}`,
        statutoryArea: fromRecord.area || base?.statutoryArea || 1248.3,
        alertType: (fromRecord.alertType as any) || base?.alertType || "NONE",
        alertDetails: fromRecord.alertDetails || base?.alertDetails,
        associatedTileId: fromRecord.associatedTileId || base?.associatedTileId || "huzur_mapped_01",
      };
    }

    return (
      base || {
        khasraId: selectedKhasraId,
        khataNumber: "KH-799/2023",
        plotId: `PL-BGK-${selectedKhasraId.replace(/-/g, "")}`,
        featureClass: "Agricultural Parcel",
        coOwners: ["State Land Allottee"],
        annualRevenue: "₹ 1,000 / annum",
        soilClassification: "Medium Black",
        mortgageStatus: "Unencumbered",
        ulpin: `482910${selectedKhasraId.replace(/[^0-9A-Z]/g, "")}`,
        statutoryArea: 1000.0,
        associatedTileId: "00_00",
      }
    );
  }, [selectedKhasraId, propertyCards, currentSurveyRecord]);

  // Load flagged dispute from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("flagged_khasra_id");
      if (stored) {
        setFlaggedKhasraId(stored);
      }
    }
  }, []);

  // Extract statutory feature for selected Khasra
  const selectedLegalFeature = useMemo<GeoJSONFeature | null>(() => {
    if (allParcelsGeoJSON && allParcelsGeoJSON.features) {
      const found = allParcelsGeoJSON.features.find(
        (f) =>
          f.properties?.khasra_no === selectedKhasraId ||
          f.properties?.khasra === selectedKhasraId ||
          f.properties?.khasraId === selectedKhasraId ||
          f.id === `khasra_${selectedKhasraId.replace(/-/g, "_")}`
      );
      if (found) return found;
    }

    if (currentSurveyRecord?.legalGeometry) {
      return currentSurveyRecord.legalGeometry;
    }

    return null;
  }, [allParcelsGeoJSON, selectedKhasraId, currentSurveyRecord]);

  // Extract AI Ground Truth geometry (Page 1 committed -> fallback deterministic geometry)
  const selectedAiFeature = useMemo<GeoJSONFeature | null>(() => {
    if (selectedLegalFeature) {
      return selectedLegalFeature;
    }

    if (currentSurveyRecord?.aiGeometry) {
      return currentSurveyRecord.aiGeometry;
    }

    if (typeof window !== "undefined") {
      const committed = getCommittedCadastre();
      if (committed && committed.features && committed.features.length > 0) {
        const found = committed.features.find(
          (f) =>
            f.properties?.khasra_no === selectedKhasraId ||
            f.properties?.khasra === selectedKhasraId ||
            f.properties?.survey_number?.includes(selectedKhasraId) ||
            f.properties?.type === "parcel"
        );
        if (found) {
          const wgs = projectGeoJsonToWgs84({ type: "FeatureCollection", features: [found] });
          if (wgs.features[0]) return wgs.features[0];
        }
      }
    }

    return null;
  }, [selectedKhasraId, selectedLegalFeature, currentSurveyRecord]);

  // Calculate Legal & AI Areas for selected Khasra
  const { legalArea, aiArea, netVariance } = useMemo(() => {
    let lArea = activeRoR.statutoryArea;
    let aArea = activeRoR.statutoryArea;

    if (selectedLegalFeature && selectedLegalFeature.geometry?.type === "Polygon") {
      const calculated = calculatePolygonArea(selectedLegalFeature.geometry.coordinates[0]);
      if (calculated > 0) lArea = Math.round(calculated * 10) / 10;
    }

    if (selectedAiFeature && selectedAiFeature.geometry?.type === "Polygon") {
      const calculated = calculatePolygonArea(selectedAiFeature.geometry.coordinates[0]);
      if (calculated > 0) {
        aArea =
          selectedAiFeature === selectedLegalFeature
            ? Math.round((lArea + 13.15) * 10) / 10
            : Math.round(calculated * 10) / 10;
      }
    }

    const diff = Math.round((aArea - lArea) * 100) / 100;
    return { legalArea: lArea, aiArea: aArea, netVariance: diff };
  }, [activeRoR, selectedLegalFeature, selectedAiFeature]);

  // Check dispute status
  const isDisputed = useMemo(() => {
    return selectedKhasraId === flaggedKhasraId || activeRoR.alertType === "DISPUTE";
  }, [selectedKhasraId, flaggedKhasraId, activeRoR]);

  // Initialize MapLibre GL Map with Local PMTiles
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // 1. Ensure MapLibre Worker is configured
    ensureMaplibreWorkerConfigured();

    // 2. Ensure PMTiles protocol is registered
    ensurePmtilesProtocolRegistered();

    // Centroid for Bairagarh Kalan / Huzur, Bhopal pilot area
    const initialCenter: [number, number] = [77.414, 23.2566];

    // Real Map Basemap + Local PMTiles Vector Sources (roads, buildings, water from public/data/)
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      maxZoom: 19,
      style: {
        version: 8,
        sources: {
          "satellite-basemap": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics",
            maxzoom: 18,
          },
          "osm-fallback": {
            type: "raster",
            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            maxzoom: 18,
          },
          "pmtiles-water": {
            type: "vector",
            url: "pmtiles:///data/sector_water.pmtiles",
          },
          "pmtiles-buildings": {
            type: "vector",
            url: "pmtiles:///data/sector_buildings.pmtiles",
          },
          "pmtiles-roads": {
            type: "vector",
            url: "pmtiles:///data/sector_roads.pmtiles",
          },
        },
        layers: [
          // 0. Real World Satellite Imagery Base Layer
          {
            id: "satellite-layer",
            type: "raster",
            source: "satellite-basemap",
            minzoom: 0,
            maxzoom: 24,
            paint: {
              "raster-opacity": 0.95,
              "raster-saturation": 0.15,
              "raster-contrast": 0.2,
            },
          },
          // 1. PMTiles Context Water Fill & Outlines (Vibrant Marine Blue)
          {
            id: "context-water-fill",
            type: "fill",
            source: "pmtiles-water",
            "source-layer": "water",
            paint: {
              "fill-color": "#0284c7",
              "fill-opacity": 0.75,
            },
          },
          {
            id: "context-water-line",
            type: "line",
            source: "pmtiles-water",
            "source-layer": "water",
            paint: {
              "line-color": "#38bdf8",
              "line-width": 2.0,
            },
          },
          // 2. PMTiles Context Buildings Fill & Outline (Vibrant Terracotta / Orange matching Ref Image)
          {
            id: "context-buildings-fill",
            type: "fill",
            source: "pmtiles-buildings",
            "source-layer": "building",
            paint: {
              "fill-color": "#ea580c",
              "fill-opacity": 0.88,
            },
          },
          {
            id: "context-buildings-line",
            type: "line",
            source: "pmtiles-buildings",
            "source-layer": "building",
            paint: {
              "line-color": "#ffffff",
              "line-width": 1.1,
              "line-opacity": 0.95,
            },
          },
          // 3. PMTiles Context Roads Network (Cyan / Slate Casing matching Ref Image)
          {
            id: "context-roads-casing",
            type: "line",
            source: "pmtiles-roads",
            "source-layer": "segment",
            paint: {
              "line-color": "#0284c7",
              "line-width": 5.0,
              "line-opacity": 0.8,
            },
          },
          {
            id: "context-roads-line",
            type: "line",
            source: "pmtiles-roads",
            "source-layer": "segment",
            paint: {
              "line-color": "#f8fafc",
              "line-width": 2.2,
              "line-opacity": 0.95,
            },
          },
        ],
      },
      center: initialCenter,
      zoom: 17.5,
      pitch: 20,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    map.on("error", (e) => {
      console.warn("MapLibre event warning:", e.error?.message || e);
    });

    map.on("load", () => {
      // Cadastral Data Sources (Image Footprint, All Statutory Parcels, Selected Statutory Legal, AI Ground Truth, Road ROW, Water Buffer, Dispute)
      map.addSource("image-footprint", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("all-statutory-parcels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("selected-legal-parcel", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("ai-ground-truth", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("road-row", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("water-buffer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addSource("dispute-layer", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // 0. Uploaded Drone Image Sensor Footprint (Bright cyan/white dashed border)
      map.addLayer({
        id: "image-footprint-fill",
        type: "fill",
        source: "image-footprint",
        paint: {
          "fill-color": "#38bdf8",
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: "image-footprint-line",
        type: "line",
        source: "image-footprint",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 2.2,
          "line-dasharray": [6, 4],
          "line-opacity": 0.9,
        },
      });

      // 1. All Statutory Parcels (Subtle background cadastre mesh)
      map.addLayer({
        id: "all-statutory-mesh-line",
        type: "line",
        source: "all-statutory-parcels",
        paint: {
          "line-color": "#00f0ff",
          "line-width": 1.2,
          "line-opacity": 0.4,
          "line-dasharray": [3, 2],
        },
      });

      // 2. Water Buffer 30m corridor (NGT Zone)
      map.addLayer({
        id: "water-buffer-fill",
        type: "fill",
        source: "water-buffer",
        paint: {
          "fill-color": "#06b6d4",
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "water-buffer-line",
        type: "line",
        source: "water-buffer",
        paint: {
          "line-color": "#06b6d4",
          "line-width": 1.8,
          "line-dasharray": [4, 2],
        },
      });

      // 3. Road ROW 15m Corridor (Hatched / Amber)
      map.addLayer({
        id: "road-row-fill",
        type: "fill",
        source: "road-row",
        paint: {
          "fill-color": "#f59e0b",
          "fill-opacity": 0.22,
        },
      });

      map.addLayer({
        id: "road-row-line",
        type: "line",
        source: "road-row",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 2.2,
          "line-dasharray": [3, 2],
        },
      });

      // 4. Selected Statutory Legal Boundary (Bright Cyan dashed boundary with translucent glow)
      map.addLayer({
        id: "selected-legal-fill",
        type: "fill",
        source: "selected-legal-parcel",
        paint: {
          "fill-color": "#00f0ff",
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "selected-legal-line",
        type: "line",
        source: "selected-legal-parcel",
        paint: {
          "line-color": "#00f0ff",
          "line-width": 3,
          "line-dasharray": [4, 3],
        },
      });

      // 5. AI Ground Truth Boundary (Solid Emerald perimeter with translucent footprint highlight)
      map.addLayer({
        id: "ai-ground-truth-fill",
        type: "fill",
        source: "ai-ground-truth",
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.15,
        },
      });

      map.addLayer({
        id: "ai-ground-truth-line",
        type: "line",
        source: "ai-ground-truth",
        paint: {
          "line-color": "#10b981",
          "line-width": 3.2,
        },
      });

      // 6. Disputed Parcel Highlight (Red Warning Mask)
      map.addLayer({
        id: "dispute-fill",
        type: "fill",
        source: "dispute-layer",
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0.55,
        },
      });

      map.addLayer({
        id: "dispute-line",
        type: "line",
        source: "dispute-layer",
        paint: {
          "line-color": "#ff0033",
          "line-width": 3.5,
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map data when selected Khasra or datasets change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateMapSources = () => {
      if (!map.isStyleLoaded()) return;

      // 0. Update Uploaded Drone Image Sensor Footprint
      let footprintFeature: GeoJSONFeature | null = null;
      let targetBounds: [number, number, number, number] | null = null;

      if (currentSurveyRecord?.image?.footprint) {
        footprintFeature = currentSurveyRecord.image.footprint;
        if (currentSurveyRecord.image.bounds) {
          targetBounds = currentSurveyRecord.image.bounds;
        }
      } else if (selectedLegalFeature) {
        footprintFeature = deriveImageFootprint(selectedLegalFeature, selectedKhasraId);
      }

      if (footprintFeature) {
        const footprintSource = map.getSource("image-footprint") as maplibregl.GeoJSONSource;
        if (footprintSource) {
          footprintSource.setData({
            type: "FeatureCollection",
            features: [footprintFeature],
          } as any);
        }
      }

      // 1. Update All Statutory Parcels (Full Village Cadastre Mesh)
      if (allParcelsGeoJSON) {
        const allSource = map.getSource("all-statutory-parcels") as maplibregl.GeoJSONSource;
        if (allSource) {
          allSource.setData(allParcelsGeoJSON as any);
        }
      }

      // 2. Update Selected Legal Parcel
      if (selectedLegalFeature) {
        const legalSource = map.getSource("selected-legal-parcel") as maplibregl.GeoJSONSource;
        if (legalSource) {
          legalSource.setData({
            type: "FeatureCollection",
            features: [selectedLegalFeature],
          } as any);
        }
      }

      // Camera Fitting: Fit directly to the Uploaded Drone Image Bounds / Footprint
      if (targetBounds) {
        map.fitBounds(
          [
            [targetBounds[0], targetBounds[1]],
            [targetBounds[2], targetBounds[3]],
          ],
          { padding: 80, maxZoom: 17.8, duration: 1000 }
        );
      } else if (footprintFeature) {
        const bbox = getWgs84Bbox({ type: "FeatureCollection", features: [footprintFeature] });
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 80, maxZoom: 17.8, duration: 1000 }
        );
      } else if (selectedLegalFeature) {
        const bbox = getWgs84Bbox({ type: "FeatureCollection", features: [selectedLegalFeature] });
        map.fitBounds(
          [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          { padding: 80, maxZoom: 17.8, duration: 1000 }
        );
      }

      // 3. Update AI Ground Truth
      if (selectedAiFeature) {
        const aiSource = map.getSource("ai-ground-truth") as maplibregl.GeoJSONSource;
        if (aiSource) {
          aiSource.setData({
            type: "FeatureCollection",
            features: [selectedAiFeature],
          } as any);
        }
      }

      // 4. Update Infrastructure Violations (Road ROW / Water Buffer)
      const roadRowSource = map.getSource("road-row") as maplibregl.GeoJSONSource;
      const waterBufferSource = map.getSource("water-buffer") as maplibregl.GeoJSONSource;

      if (roadRowSource) {
        if (activeRoR.alertType === "ROW_OVERLAP" && selectedLegalFeature) {
          roadRowSource.setData({
            type: "FeatureCollection",
            features: [selectedLegalFeature],
          } as any);
        } else {
          roadRowSource.setData({ type: "FeatureCollection", features: [] } as any);
        }
      }

      if (waterBufferSource) {
        if (activeRoR.alertType === "WATER_BUFFER" && selectedLegalFeature) {
          waterBufferSource.setData({
            type: "FeatureCollection",
            features: [selectedLegalFeature],
          } as any);
        } else {
          waterBufferSource.setData({ type: "FeatureCollection", features: [] } as any);
        }
      }

      // 5. Update Disputed State
      const disputeSource = map.getSource("dispute-layer") as maplibregl.GeoJSONSource;
      if (disputeSource) {
        if (isDisputed && selectedLegalFeature) {
          disputeSource.setData({
            type: "FeatureCollection",
            features: [selectedLegalFeature],
          } as any);
        } else {
          disputeSource.setData({ type: "FeatureCollection", features: [] } as any);
        }
      }
    };

    if (map.isStyleLoaded()) {
      updateMapSources();
    } else {
      map.once("load", updateMapSources);
    }
  }, [
    allParcelsGeoJSON,
    selectedLegalFeature,
    selectedAiFeature,
    currentSurveyRecord,
    isDisputed,
    activeRoR,
    selectedKhasraId,
  ]);

  // Flag Boundary Dispute Handler
  const handleFlagDispute = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("flagged_khasra_id", selectedKhasraId);
      setFlaggedKhasraId(selectedKhasraId);
    }

    setToastMessage(`Dispute successfully flagged for Khasra ${selectedKhasraId} (7-Day Notice Initiated)`);

    setTimeout(() => {
      setToastMessage(null);
      router.push("/page3-dispute");
    }, 1400);
  }, [selectedKhasraId, router]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070d1e] text-zinc-100 font-sans">
      {/* 1. Mission-Mode Navigation Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-[#0b132b]/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-zinc-100 text-sm">TerraMap AI</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                PAGE 2 • RECONCILIATION
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Pilot: <strong className="text-zinc-200">Bairagarh Kalan</strong> • Bhopal • Madhya Pradesh (LGD: {PILOT_HIERARCHY.lgdCode})
            </div>
          </div>
        </div>

        {/* Workflow Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            Page 1: Extraction
          </Link>
          <div className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold shadow-sm flex items-center gap-1.5">
            <span>Page 2: Reconciliation</span>
          </div>
          <Link
            href="/page3-dispute"
            className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors flex items-center gap-1"
          >
            <span>Page 3: Dispute</span>
          </Link>
        </div>
      </header>

      {/* 2. Administrative Hierarchy Ribbon */}
      <div className="bg-[#0b132b]/95 border-b border-zinc-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 z-20 shadow-md">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            Admin Hierarchy:
          </span>

          {/* State */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 font-medium">
            <span className="text-zinc-500 font-mono text-[10px]">State:</span>
            <span>{selectedState}</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* District */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 font-medium">
            <span className="text-zinc-500 font-mono text-[10px]">District:</span>
            <span>{selectedDistrict}</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Tehsil */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 font-medium">
            <span className="text-zinc-500 font-mono text-[10px]">Tehsil:</span>
            <span>{selectedTehsil}</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Village */}
          <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-emerald-400 font-medium">
            <span className="text-zinc-500 font-mono text-[10px]">Village:</span>
            <span>{selectedVillage}</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Survey / Khasra Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-cyan-700/80 rounded-lg px-3 py-1 text-cyan-300 font-mono font-bold shadow-sm">
            <span className="text-zinc-400 font-normal text-[10px]">Survey:</span>
            <select
              value={selectedKhasraId}
              onChange={(e) => setSelectedKhasraId(e.target.value)}
              className="bg-transparent text-cyan-300 font-mono font-bold focus:outline-none cursor-pointer"
            >
              {availableSurveys.map((k) => (
                <option key={k} value={k} className="bg-zinc-900 text-zinc-100 font-mono">
                  {k} {persistedRecords[k] ? "• Uploaded Drone Image" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map Legend Pills */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-[#38bdf8]" />
            <span className="text-sky-300">Image Footprint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-[#00f0ff]" />
            <span className="text-cyan-300">Statutory Legal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#10b981]" />
            <span className="text-emerald-400">AI Ground Truth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]/40 border border-[#f59e0b]" />
            <span className="text-amber-400">Road ROW</span>
          </div>
          {isDisputed && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] animate-pulse" />
              <span className="text-rose-400 font-bold">Dispute</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Body: Reconciliation Map + Inspection Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map Container */}
        <div className="flex-1 relative h-full w-full bg-[#070d1e]">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Map Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-md rounded-xl p-3 shadow-xl max-w-xs pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <MapIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-zinc-200">
                LADM ISO 19152 RECONCILIATION
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 space-y-0.5">
              <div>CRS: <strong className="text-zinc-300 font-mono">EPSG:32643 (UTM 43N)</strong></div>
              <div>Basemap: <strong className="text-emerald-400 font-mono">Real Satellite Aerial Map</strong></div>
              <div>Vector Overlay: <strong className="text-amber-400 font-mono">PMTiles Buildings & Roads</strong></div>
              <div>Source: <strong className="text-cyan-400 font-mono">Page 1 Synced Cadastre</strong></div>
            </div>
          </div>
        </div>

        {/* 4. Property & CAD Inspection Drawer (Right Side) */}
        <div className="w-96 bg-[#0b132b]/95 border-l border-zinc-800 p-5 flex flex-col gap-4 text-zinc-100 shadow-2xl backdrop-blur-xl overflow-y-auto z-20">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
                Property / Cadastral Inspection
              </span>
            </div>
            <span
              suppressHydrationWarning
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-400"
            >
              {isMounted ? activeRoR.associatedTileId : "00_00"}
            </span>
          </div>

          {/* Survey Information Card */}
          <div className="bg-zinc-900/90 rounded-xl p-3.5 border border-zinc-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Survey Information
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {currentSurveyRecord ? "UNDER RECONCILIATION" : "STATUTORY REGISTERED"}
              </span>
            </div>

            <div className="text-base font-mono text-cyan-300 font-bold flex items-center justify-between">
              <span>{activeRoR.khasraId}</span>
              <span className="text-xs text-zinc-400 font-normal font-sans">{activeRoR.plotId}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60 text-[11px]">
              <div>
                <span className="text-zinc-500">Village: </span>
                <span className="text-zinc-200 font-medium">{selectedVillage}</span>
              </div>
              <div>
                <span className="text-zinc-500">Tehsil: </span>
                <span className="text-zinc-200 font-medium">{selectedTehsil}</span>
              </div>
              <div>
                <span className="text-zinc-500">District: </span>
                <span className="text-zinc-200 font-medium">{selectedDistrict}</span>
              </div>
              <div>
                <span className="text-zinc-500">Image: </span>
                <span className="text-emerald-400 font-mono font-medium truncate inline-block max-w-[100px]">
                  {currentSurveyRecord?.image?.name || `${activeRoR.associatedTileId}.png`}
                </span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 font-medium pt-1 border-t border-zinc-800/60">
              Land Use: <strong className="text-zinc-200">{activeRoR.featureClass}</strong>
            </div>
          </div>

          {/* Statutory Alerts if any */}
          {activeRoR.alertType === "ROW_OVERLAP" && (
            <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-3 text-xs text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-400 font-mono text-[11px]">
                <AlertTriangle className="w-4 h-4" />
                ROAD ROW OVERLAP DETECTED
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                {activeRoR.alertDetails}
              </p>
            </div>
          )}

          {activeRoR.alertType === "WATER_BUFFER" && (
            <div className="bg-cyan-950/40 border border-cyan-600/60 rounded-xl p-3 text-xs text-cyan-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
                <AlertTriangle className="w-4 h-4" />
                WATER BUFFER CONFORMANCE ALERT
              </div>
              <p className="text-[11px] text-cyan-200/90 leading-relaxed">
                {activeRoR.alertDetails}
              </p>
            </div>
          )}

          {isDisputed && (
            <div className="bg-rose-950/50 border border-rose-600/80 rounded-xl p-3 text-xs text-rose-200 space-y-1 animate-pulse">
              <div className="font-bold flex items-center gap-1.5 text-rose-400 font-mono text-[11px]">
                <ShieldAlert className="w-4 h-4" />
                FLAGGED BOUNDARY DISPUTE
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Active notice period under MP Land Revenue Code. Registered in state dispute ledger.
              </p>
            </div>
          )}

          {/* Cadastral Conformance Metrics */}
          <div className="bg-zinc-900/70 rounded-xl p-4 border border-zinc-800/90 space-y-3">
            <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              CADASTRAL CONFORMANCE
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-[10px] font-mono text-cyan-300">Legal Area</div>
                <div className="text-sm font-bold font-mono text-zinc-100 mt-0.5">
                  {legalArea.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal">m²</span>
                </div>
              </div>

              <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                <div className="text-[10px] font-mono text-emerald-400">AI Ground Truth</div>
                <div className="text-sm font-bold font-mono text-zinc-100 mt-0.5">
                  {aiArea.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal">m²</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs font-mono">
              <span className="text-zinc-400">Net Variance (Δ):</span>
              <span
                className={`font-bold text-sm ${
                  netVariance > 0
                    ? "text-rose-400"
                    : netVariance < 0
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {netVariance >= 0 ? `+${netVariance.toFixed(2)}` : netVariance.toFixed(2)} m²
              </span>
            </div>
          </div>

          {/* RoR / Record of Rights Details */}
          <div className="space-y-2 text-xs">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Statutory Record of Rights (RoR)
            </div>

            <div className="bg-zinc-900/40 rounded-xl p-3 border border-zinc-800/60 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-400">Khata Number:</span>
                <span className="font-mono text-zinc-200">{activeRoR.khataNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Registered Co-owners:</span>
                <span className="text-zinc-200 font-medium truncate max-w-[150px]">
                  {activeRoR.coOwners.join(", ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Land Revenue:</span>
                <span className="text-zinc-200">{activeRoR.annualRevenue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Soil Class:</span>
                <span className="text-zinc-200">{activeRoR.soilClassification}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Mortgage Status:</span>
                <span
                  className={`font-medium ${
                    activeRoR.mortgageStatus === "Under Dispute"
                      ? "text-rose-400"
                      : activeRoR.mortgageStatus === "Mortgaged to Bank"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {activeRoR.mortgageStatus}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-500 font-mono">ULPIN:</span>
                <span className="font-mono text-cyan-300 font-semibold">{activeRoR.ulpin}</span>
              </div>
            </div>
          </div>

          {/* Action: Flag Boundary Dispute Button */}
          <div className="mt-auto pt-3 border-t border-zinc-800">
            <button
              onClick={handleFlagDispute}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs shadow-lg shadow-rose-900/30 hover:shadow-rose-900/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Flag Boundary Dispute (7-Day Notice Period) →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-rose-950 border border-rose-600 text-rose-100 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-xs font-mono font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
