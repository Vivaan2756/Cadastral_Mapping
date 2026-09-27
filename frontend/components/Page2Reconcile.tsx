"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import {
  CADASTRAL_DATASETS,
  CadastralDatasetConfig,
  SelectedParcel,
  AdminEntity,
  AdministrativeHierarchyIndexed,
} from "../lib/cadastralConfig";
import {
  fetchAdminHierarchyIndexed,
  getStateList,
  getDistrictsForState,
  getSubdistrictsForDistrict,
  getVillagesForSubdistrict,
  getDistrictCentroid,
  getSubdistrictCentroid,
  getVillageCentroid,
} from "../lib/adminConfig";
import { getSurveySpatialRecords } from "../lib/demoData";
import {
  Layers,
  ChevronRight,
  Compass,
  CheckCircle2,
  ShieldAlert,
  Search,
  Building2,
  Database,
  Route,
  Droplets,
  Waves,
  Home,
  X,
} from "lucide-react";

// Helper to parse HSTORE / key-value other_tags from OSM PMTiles
function parseOtherTags(otherTagsStr: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof otherTagsStr !== "string" || !otherTagsStr.trim()) return result;
  const regex = /"([^"]+)"=>"([^"]+)"/g;
  let match;
  while ((match = regex.exec(otherTagsStr)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

// Convert property names into clean human-readable labels
function formatPropertyName(key: string): string {
  const specialMap: Record<string, string> = {
    highway: "Road Type",
    building: "Building Type",
    waterway: "Waterway Type",
    natural: "Natural Feature",
    water: "Water Type",
    osm_id: "OSM ID",
    osm_way_id: "OSM Way ID",
    maxspeed: "Speed Limit",
    oneway: "One Way",
    surface: "Surface",
    lanes: "Lanes",
    bridge: "Bridge",
    tunnel: "Tunnel",
    access: "Access",
    ref: "Reference / Route No",
    housenumber: "House Number",
    "addr:housenumber": "House Number",
    "addr:street": "Street",
    "addr:city": "City",
    "addr:postcode": "Postcode",
    postcode: "Postcode",
    amenity: "Amenity",
    intermittent: "Intermittent",
    width: "Width",
  };
  if (specialMap[key]) return specialMap[key];

  return key
    .replace(/_/g, " ")
    .replace(/:/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Register MapLibre worker and PMTiles protocol globally once
let isWorkerConfigured = false;
function ensureMaplibreWorkerConfigured() {
  if (!isWorkerConfigured && typeof window !== "undefined") {
    try {
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      isWorkerConfigured = true;
    } catch (e) {
      console.warn("[TerraMap] MapLibre setWorkerUrl:", e);
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
      console.warn("[TerraMap] PMTiles protocol already registered or notice:", e);
    }
  }
}

export const Page2Reconcile: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mounted flag to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Administrative Registry Data
  const [registry, setRegistry] = useState<AdministrativeHierarchyIndexed | null>(null);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState<boolean>(true);

  // Administrative Selections (Stores both display name and administrative codes)
  const [selectedState, setSelectedState] = useState<AdminEntity | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<AdminEntity | null>(null);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<AdminEntity | null>(null);
  const [selectedVillage, setSelectedVillage] = useState<AdminEntity | null>(null);

  // Parcel & Map state
  const [selectedParcel, setSelectedParcel] = useState<SelectedParcel | null>(null);
  const [mapStatus, setMapStatus] = useState<"INITIALIZING" | "CONNECTED" | "ERROR">("INITIALIZING");
  const [activeCadastralConfig, setActiveCadastralConfig] = useState<CadastralDatasetConfig | null>(null);

  // MapLibre references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Initialize Worker & Protocol & load indexed administrative hierarchy
  useEffect(() => {
    setIsMounted(true);
    ensureMaplibreWorkerConfigured();
    ensurePmtilesProtocolRegistered();

    async function loadData() {
      setIsLoadingRegistry(true);
      const reg = await fetchAdminHierarchyIndexed();
      setRegistry(reg);
      setIsLoadingRegistry(false);
    }
    loadData();
  }, []);

  // Compute Strict Cascading Options
  const stateOptions = useMemo(() => {
    if (!registry) return [];
    return getStateList(registry);
  }, [registry]);

  const districtOptions = useMemo(() => {
    if (!registry || !selectedState) return [];
    return getDistrictsForState(registry, selectedState);
  }, [registry, selectedState]);

  const subdistrictOptions = useMemo(() => {
    if (!registry || !selectedDistrict) return [];
    return getSubdistrictsForDistrict(registry, selectedDistrict);
  }, [registry, selectedDistrict]);

  const villageOptions = useMemo(() => {
    if (!registry || !selectedSubdistrict) return [];
    return getVillagesForSubdistrict(registry, selectedSubdistrict);
  }, [registry, selectedSubdistrict]);

  // Synchronize with URL search params on mount or param change
  useEffect(() => {
    if (!registry) return;
    const qState = searchParams?.get("state") || "";
    const qDistrict = searchParams?.get("district") || "";
    const qTaluka = searchParams?.get("taluka") || searchParams?.get("subdistrict") || "";
    const qVillage = searchParams?.get("village") || "";

    if (qState && !selectedState) {
      const matchState = registry.states.find(
        (s) => s.name.toUpperCase() === qState.toUpperCase() || s.code === qState
      );
      if (matchState) {
        setSelectedState(matchState);

        if (qDistrict) {
          const districts = registry.districtsByState[matchState.code] || [];
          const matchDist = districts.find(
            (d) => d.name.toUpperCase() === qDistrict.toUpperCase() || d.code === qDistrict
          );
          if (matchDist) {
            setSelectedDistrict(matchDist);

            if (qTaluka) {
              const subs = registry.subdistrictsByDistrict[matchDist.code] || [];
              const matchSub = subs.find(
                (s) => s.name.toUpperCase() === qTaluka.toUpperCase() || s.code === qTaluka
              );
              if (matchSub) {
                setSelectedSubdistrict(matchSub);

                if (qVillage) {
                  const vils = registry.villagesBySubdistrict[matchSub.code] || [];
                  const matchVil = vils.find(
                    (v) => v.name.toUpperCase() === qVillage.toUpperCase() || v.code === qVillage
                  );
                  if (matchVil) {
                    setSelectedVillage(matchVil);
                  }
                }
              }
            }
          }
        }
      }
    }
  }, [registry, searchParams, selectedState]);

  // Update Active Cadastral Config when State changes
  useEffect(() => {
    if (!selectedState) {
      setActiveCadastralConfig(null);
      return;
    }
    const norm = selectedState.name.toUpperCase().trim();
    if (CADASTRAL_DATASETS[norm]) {
      setActiveCadastralConfig(CADASTRAL_DATASETS[norm]);
    } else {
      setActiveCadastralConfig(null);
    }
  }, [selectedState]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!isMounted || !mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            "satellite-tiles": {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              attribution: "Esri World Imagery",
              maxzoom: 19,
            },
            "india-states": {
              type: "vector",
              url: "pmtiles:///data/india_states.pmtiles",
            },
            "india-districts": {
              type: "vector",
              url: "pmtiles:///data/india_districts.pmtiles",
            },
            "lgd-subdistricts": {
              type: "vector",
              url: "pmtiles:///data/lgd_subdistricts.pmtiles",
            },
            "lgd-villages": {
              type: "vector",
              url: "pmtiles:///data/lgd_villages.pmtiles",
            },
            "mrsac-cadastrals": {
              type: "vector",
              url: "pmtiles:///data/MRSAC_Cadastrals.pmtiles",
            },
            "mpbhulekh-cadastrals": {
              type: "vector",
              url: "pmtiles:///data/MPBhulekh_MP_Plot_Cadastrals.pmtiles",
            },
            "mp-roads": {
              type: "vector",
              url: "pmtiles:///data/madhya_pradesh_roads.pmtiles",
            },
            "mp-buildings": {
              type: "vector",
              url: "pmtiles:///data/madhya_pradesh_buildings.pmtiles",
            },
            "mp-water": {
              type: "vector",
              url: "pmtiles:///data/madhya_pradesh_water.pmtiles",
            },
            "mp-waterways": {
              type: "vector",
              url: "pmtiles:///data/madhya_pradesh_waterways.pmtiles",
            },
          },
          layers: [
            // 1. Satellite Basemap
            {
              id: "satellite-layer",
              type: "raster",
              source: "satellite-tiles",
              paint: { "raster-opacity": 0.95 },
            },
            // 2. OSM Water (Madhya Pradesh)
            {
              id: "mp-water-fill",
              type: "fill",
              source: "mp-water",
              "source-layer": "water",
              minzoom: 6,
              paint: {
                "fill-color": "#2563eb",
                "fill-opacity": 0.35,
              },
              layout: {
                visibility: "none",
              },
            },
            // 3. OSM Waterways (Madhya Pradesh)
            {
              id: "mp-waterways-line",
              type: "line",
              source: "mp-waterways",
              "source-layer": "waterways",
              minzoom: 8,
              paint: {
                "line-color": "#38bdf8",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8, 0.5,
                  12, 1.2,
                  15, 2.5
                ],
                "line-opacity": 0.8,
              },
              layout: {
                visibility: "none",
              },
            },
            // 4. OSM Roads (Madhya Pradesh)
            {
              id: "mp-roads-line",
              type: "line",
              source: "mp-roads",
              "source-layer": "roads",
              minzoom: 6,
              paint: {
                "line-color": "#f59e0b",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6, 0.4,
                  10, 1,
                  13, 2,
                  15, 3
                ],
                "line-opacity": 0.65,
              },
              layout: {
                visibility: "none",
              },
            },
            // 5. OSM Buildings (Madhya Pradesh)
            {
              id: "mp-buildings-fill",
              type: "fill",
              source: "mp-buildings",
              "source-layer": "buildings",
              minzoom: 12,
              paint: {
                "fill-color": "#ef4444",
                "fill-opacity": 0.35,
              },
              layout: {
                visibility: "none",
              },
            },
            {
              id: "mp-buildings-line",
              type: "line",
              source: "mp-buildings",
              "source-layer": "buildings",
              minzoom: 12,
              paint: {
                "line-color": "#f87171",
                "line-width": 0.8,
                "line-opacity": 0.85,
              },
              layout: {
                visibility: "none",
              },
            },
            // 2. State Boundaries
            {
              id: "admin-state-fill",
              type: "fill",
              source: "india-states",
              "source-layer": "LGD_States",
              paint: {
                "fill-color": "#38bdf8",
                "fill-opacity": 0.02,
              },
            },
            {
              id: "admin-state-line",
              type: "line",
              source: "india-states",
              "source-layer": "LGD_States",
              paint: {
                "line-color": "#38bdf8",
                "line-width": 1.5,
                "line-opacity": 0.4,
              },
            },
            // 3. District Boundaries
            {
              id: "admin-district-line",
              type: "line",
              source: "india-districts",
              "source-layer": "LGD_Districts",
              minzoom: 5,
              paint: {
                "line-color": "#818cf8",
                "line-width": 1.2,
                "line-opacity": 0.5,
                "line-dasharray": [2, 1],
              },
            },
            // 4. Subdistricts / Talukas
            {
              id: "admin-subdistrict-line",
              type: "line",
              source: "lgd-subdistricts",
              "source-layer": "LGD_Subdistricts",
              minzoom: 8,
              paint: {
                "line-color": "#a78bfa",
                "line-width": 1,
                "line-opacity": 0.5,
              },
            },
            // 5. Villages Boundaries
            {
              id: "admin-village-fill",
              type: "fill",
              source: "lgd-villages",
              "source-layer": "LGD_Villages",
              minzoom: 10,
              paint: {
                "fill-color": "#06b6d4",
                "fill-opacity": 0.05,
              },
            },
            {
              id: "admin-village-line",
              type: "line",
              source: "lgd-villages",
              "source-layer": "LGD_Villages",
              minzoom: 10,
              paint: {
                "line-color": "#06b6d4",
                "line-width": 1.5,
                "line-opacity": 0.7,
              },
            },
            // 6. Selected Village Highlight Boundary (Filtered by vilcode11 code)
            {
              id: "selected-village-line",
              type: "line",
              source: "lgd-villages",
              "source-layer": "LGD_Villages",
              paint: {
                "line-color": "#f59e0b",
                "line-width": 3,
                "line-opacity": 0.9,
              },
              filter: ["==", ["get", "vilcode11"], "__NONE__"],
            },
            // 7. Maharashtra Cadastrals
            {
              id: "cadastral-mrsac-fill",
              type: "fill",
              source: "mrsac-cadastrals",
              "source-layer": "MRSAC_Cadastrals",
              minzoom: 11,
              paint: {
                "fill-color": "#10b981",
                "fill-opacity": 0.25,
              },
              layout: {
                visibility: "none",
              },
            },
            {
              id: "cadastral-mrsac-line",
              type: "line",
              source: "mrsac-cadastrals",
              "source-layer": "MRSAC_Cadastrals",
              minzoom: 11,
              paint: {
                "line-color": "#34d399",
                "line-width": 1.2,
                "line-opacity": 0.85,
              },
              layout: {
                visibility: "none",
              },
            },
            // 8. MPBhulekh Cadastrals
            {
              id: "cadastral-mpbhulekh-fill",
              type: "fill",
              source: "mpbhulekh-cadastrals",
              "source-layer": "MPBhulekh_MP_Plot_Cadastrals",
              minzoom: 11,
              paint: {
                "fill-color": "#06b6d4",
                "fill-opacity": 0.25,
              },
              layout: {
                visibility: "none",
              },
            },
            {
              id: "cadastral-mpbhulekh-line",
              type: "line",
              source: "mpbhulekh-cadastrals",
              "source-layer": "MPBhulekh_MP_Plot_Cadastrals",
              minzoom: 11,
              paint: {
                "line-color": "#22d3ee",
                "line-width": 1.2,
                "line-opacity": 0.85,
              },
              layout: {
                visibility: "none",
              },
            },
            // 9. Selected Parcel Highlight Layers
            {
              id: "selected-parcel-mrsac-fill",
              type: "fill",
              source: "mrsac-cadastrals",
              "source-layer": "MRSAC_Cadastrals",
              paint: {
                "fill-color": "#facc15",
                "fill-opacity": 0.45,
              },
              filter: ["==", ["get", "OBJECTID"], -999999],
            },
            {
              id: "selected-parcel-mrsac-line",
              type: "line",
              source: "mrsac-cadastrals",
              "source-layer": "MRSAC_Cadastrals",
              paint: {
                "line-color": "#facc15",
                "line-width": 3,
                "line-opacity": 1.0,
              },
              filter: ["==", ["get", "OBJECTID"], -999999],
            },
            {
              id: "selected-parcel-mp-fill",
              type: "fill",
              source: "mpbhulekh-cadastrals",
              "source-layer": "MPBhulekh_MP_Plot_Cadastrals",
              paint: {
                "fill-color": "#facc15",
                "fill-opacity": 0.45,
              },
              filter: ["==", ["get", "parcel_id"], "__none__"],
            },
            {
              id: "selected-parcel-mp-line",
              type: "line",
              source: "mpbhulekh-cadastrals",
              "source-layer": "MPBhulekh_MP_Plot_Cadastrals",
              paint: {
                "line-color": "#facc15",
                "line-width": 3,
                "line-opacity": 1.0,
              },
              filter: ["==", ["get", "parcel_id"], "__none__"],
            },
          ],
        },
        center: [78.9629, 20.5937],
        zoom: 4.5,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");

      map.on("load", () => {
        setMapStatus("CONNECTED");
      });

      map.on("error", (e) => {
        console.warn("[TerraMap] Map warning:", e);
      });

      // Clickable layers and priority definition
      const clickableLayers = [
        "cadastral-mpbhulekh-fill",
        "cadastral-mrsac-fill",
        "mp-buildings-fill",
        "mp-buildings-line",
        "mp-roads-line",
        "mp-waterways-line",
        "mp-water-fill",
      ];

      const priorityOrder = [
        "cadastral-mpbhulekh-fill",
        "cadastral-mrsac-fill",
        "mp-buildings-fill",
        "mp-buildings-line",
        "mp-roads-line",
        "mp-waterways-line",
        "mp-water-fill",
      ];

      // Unified Interactive Click Handling across Parcels & Physical OSM Layers
      map.on("click", (e) => {
        const availableLayers = clickableLayers.filter((id) => !!map.getLayer(id));
        const features = map.queryRenderedFeatures(e.point, { layers: availableLayers });
        if (!features || features.length === 0) return;

        // Sort by priority order: Parcel -> Building -> Road -> Waterway -> Water
        const sorted = [...features].sort((a, b) => {
          const idxA = priorityOrder.indexOf(a.layer?.id || "");
          const idxB = priorityOrder.indexOf(b.layer?.id || "");
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });

        const winningFeature = sorted[0];
        const layerId = winningFeature.layer?.id;
        const props = (winningFeature.properties || {}) as Record<string, unknown>;

        if (layerId === "cadastral-mpbhulekh-fill") {
          setSelectedParcel({
            source: "Madhya Pradesh",
            properties: props,
            layerId: "cadastral-mpbhulekh-fill",
            featureType: "PARCEL",
            title: "PARCEL INSPECTION",
            geometry: winningFeature.geometry,
          });

          const parcelId = props.parcel_id;
          if (parcelId) {
            map.setFilter("selected-parcel-mp-fill", ["==", ["get", "parcel_id"], String(parcelId)]);
            map.setFilter("selected-parcel-mp-line", ["==", ["get", "parcel_id"], String(parcelId)]);
          }
        } else if (layerId === "cadastral-mrsac-fill") {
          setSelectedParcel({
            source: "Maharashtra",
            properties: props,
            layerId: "cadastral-mrsac-fill",
            featureType: "PARCEL",
            title: "PARCEL INSPECTION",
            geometry: winningFeature.geometry,
          });

          const objId = props.OBJECTID;
          if (objId !== undefined && objId !== null) {
            map.setFilter("selected-parcel-mrsac-fill", ["==", ["get", "OBJECTID"], Number(objId)]);
            map.setFilter("selected-parcel-mrsac-line", ["==", ["get", "OBJECTID"], Number(objId)]);
          }
        } else if (layerId === "mp-buildings-fill" || layerId === "mp-buildings-line") {
          setSelectedParcel({
            source: "OSM Madhya Pradesh",
            properties: props,
            layerId: "mp-buildings-fill",
            featureType: "BUILDING",
            title: "BUILDING INFORMATION",
          });
        } else if (layerId === "mp-roads-line") {
          setSelectedParcel({
            source: "OSM Madhya Pradesh",
            properties: props,
            layerId: "mp-roads-line",
            featureType: "ROAD",
            title: "ROAD INFORMATION",
          });
        } else if (layerId === "mp-waterways-line") {
          setSelectedParcel({
            source: "OSM Madhya Pradesh",
            properties: props,
            layerId: "mp-waterways-line",
            featureType: "WATERWAY",
            title: "WATERWAY INFORMATION",
          });
        } else if (layerId === "mp-water-fill") {
          setSelectedParcel({
            source: "OSM Madhya Pradesh",
            properties: props,
            layerId: "mp-water-fill",
            featureType: "WATER",
            title: "WATER INFORMATION",
          });
        }
      });

      const setPointer = () => { map.getCanvas().style.cursor = "pointer"; };
      const resetPointer = () => { map.getCanvas().style.cursor = ""; };

      clickableLayers.forEach((layerId) => {
        map.on("mouseenter", layerId, setPointer);
        map.on("mouseleave", layerId, resetPointer);
      });

      mapRef.current = map;
      if (typeof window !== "undefined") {
        (window as any)._map = map;
      }
    } catch (err) {
      console.error("[TerraMap] MapLibre initialization failed:", err);
      setMapStatus("ERROR");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isMounted]);

  // Handle State Change: Visibility and Layer Switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const normState = (selectedState?.name || "").toUpperCase().trim();
    const isMP = normState === "MADHYA PRADESH";

    // Toggle MP physical reference layers (Water, Waterways, Roads, Buildings)
    const mpPhysicalLayers = [
      "mp-water-fill",
      "mp-waterways-line",
      "mp-roads-line",
      "mp-buildings-fill",
      "mp-buildings-line",
    ];

    mpPhysicalLayers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", isMP ? "visible" : "none");
      }
    });

    if (normState === "MAHARASHTRA") {
      map.setLayoutProperty("cadastral-mrsac-fill", "visibility", "visible");
      map.setLayoutProperty("cadastral-mrsac-line", "visibility", "visible");
      map.setLayoutProperty("cadastral-mpbhulekh-fill", "visibility", "none");
      map.setLayoutProperty("cadastral-mpbhulekh-line", "visibility", "none");

      const config = CADASTRAL_DATASETS.MAHARASHTRA;
      map.fitBounds(config.bounds, { padding: 40, duration: 1500 });
    } else if (isMP) {
      map.setLayoutProperty("cadastral-mrsac-fill", "visibility", "none");
      map.setLayoutProperty("cadastral-mrsac-line", "visibility", "none");
      map.setLayoutProperty("cadastral-mpbhulekh-fill", "visibility", "visible");
      map.setLayoutProperty("cadastral-mpbhulekh-line", "visibility", "visible");

      const config = CADASTRAL_DATASETS["MADHYA PRADESH"];
      map.fitBounds(config.bounds, { padding: 40, duration: 1500 });
    } else {
      if (map.getLayer("cadastral-mrsac-fill")) {
        map.setLayoutProperty("cadastral-mrsac-fill", "visibility", "none");
        map.setLayoutProperty("cadastral-mrsac-line", "visibility", "none");
      }
      if (map.getLayer("cadastral-mpbhulekh-fill")) {
        map.setLayoutProperty("cadastral-mpbhulekh-fill", "visibility", "none");
        map.setLayoutProperty("cadastral-mpbhulekh-line", "visibility", "none");
      }
    }
  }, [selectedState]);

  // Handle Village Zoom & Code-Based Cadastral Filtering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !selectedVillage) return;

    const normState = (selectedState?.name || "").toUpperCase().trim();

    // Highlight selected village boundary using verified code
    map.setFilter("selected-village-line", ["==", ["get", "vilcode11"], selectedVillage.code]);

    if (normState === "MAHARASHTRA") {
      // Filter MRSAC cadastrals by subdistrict code / village code
      if (selectedVillage.code) {
        map.setFilter("cadastral-mrsac-fill", [
          "any",
          ["==", ["get", "VINCODE"], selectedVillage.code],
          ["==", ["get", "VIL_NAME"], selectedVillage.name],
        ]);
        map.setFilter("cadastral-mrsac-line", [
          "any",
          ["==", ["get", "VINCODE"], selectedVillage.code],
          ["==", ["get", "VIL_NAME"], selectedVillage.name],
        ]);
      }

      // Smooth camera fly-to using precomputed village centroid
      getVillageCentroid(selectedVillage.code).then((centroid) => {
        console.log("[TerraMap] Village selected:", selectedVillage);
        console.log("[TerraMap] Village centroid:", centroid);
        if (centroid && mapRef.current) {
          const m = mapRef.current;
          m.flyTo({
            center: centroid,
            zoom: 14.5,
            speed: 1.2,
          });
          console.log("[TerraMap] Map zoom after village selection flyTo call:", m.getZoom());
          console.log("[TerraMap] Map center:", m.getCenter());

          m.once("moveend", () => {
            console.log("[TerraMap] Final village zoom:", m.getZoom());
            console.log(
              "[TerraMap] Building fill visibility:",
              m.getLayoutProperty("mp-buildings-fill", "visibility")
            );
            console.log(
              "[TerraMap] Building line visibility:",
              m.getLayoutProperty("mp-buildings-line", "visibility")
            );
          });
        }
      });
    } else if (normState === "MADHYA PRADESH") {
      if (selectedVillage.code) {
        map.setFilter("cadastral-mpbhulekh-fill", [
          "any",
          ["==", ["get", "village_lgd_code"], selectedVillage.code],
          ["==", ["get", "village_name_en"], selectedVillage.name],
        ]);
        map.setFilter("cadastral-mpbhulekh-line", [
          "any",
          ["==", ["get", "village_lgd_code"], selectedVillage.code],
          ["==", ["get", "village_name_en"], selectedVillage.name],
        ]);
      }

      getVillageCentroid(selectedVillage.code).then((centroid) => {
        if (centroid && mapRef.current) {
          mapRef.current.flyTo({
            center: centroid,
            zoom: 14.5,
            speed: 1.2,
          });
        }
      });
    }
  }, [selectedVillage, selectedState]);

  // Strict Cascading Dropdown Handlers with Reset Logic
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const match = stateOptions.find((s) => s.code === code) || null;

    // Strict Parent-Child Reset
    setSelectedState(match);
    setSelectedDistrict(null);
    setSelectedSubdistrict(null);
    setSelectedVillage(null);
    setSelectedParcel(null);

    // Reset village highlight line
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && map.getLayer("selected-village-line")) {
      map.setFilter("selected-village-line", ["==", ["get", "vilcode11"], "__NONE__"]);
    }

    const params = new URLSearchParams();
    if (match) params.set("state", match.name);
    router.replace(`/page2-reconcile?${params.toString()}`);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const match = districtOptions.find((d) => d.code === code) || null;

    // Strict Parent-Child Reset
    setSelectedDistrict(match);
    setSelectedSubdistrict(null);
    setSelectedVillage(null);
    setSelectedParcel(null);

    const map = mapRef.current;
    if (map && map.isStyleLoaded() && map.getLayer("selected-village-line")) {
      map.setFilter("selected-village-line", ["==", ["get", "vilcode11"], "__NONE__"]);
    }

    const params = new URLSearchParams();
    if (selectedState) params.set("state", selectedState.name);
    if (match) params.set("district", match.name);
    router.replace(`/page2-reconcile?${params.toString()}`);

    // Zoom camera towards district centroid
    if (match) {
      getDistrictCentroid(match.code).then((centroid) => {
        if (centroid && mapRef.current) {
          mapRef.current.flyTo({ center: centroid, zoom: 9.5, speed: 1.2 });
        }
      });
    }
  };

  const handleSubdistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const match = subdistrictOptions.find((s) => s.code === code) || null;

    // Strict Parent-Child Reset
    setSelectedSubdistrict(match);
    setSelectedVillage(null);
    setSelectedParcel(null);

    const map = mapRef.current;
    if (map && map.isStyleLoaded() && map.getLayer("selected-village-line")) {
      map.setFilter("selected-village-line", ["==", ["get", "vilcode11"], "__NONE__"]);
    }

    const params = new URLSearchParams();
    if (selectedState) params.set("state", selectedState.name);
    if (selectedDistrict) params.set("district", selectedDistrict.name);
    if (match) params.set("taluka", match.name);
    router.replace(`/page2-reconcile?${params.toString()}`);

    // Zoom camera towards subdistrict centroid
    if (match) {
      getSubdistrictCentroid(match.code).then((centroid) => {
        if (centroid && mapRef.current) {
          mapRef.current.flyTo({ center: centroid, zoom: 11.5, speed: 1.2 });
        }
      });
    }
  };

  const handleVillageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const match = villageOptions.find((v) => v.code === code) || null;

    setSelectedVillage(match);
    setSelectedParcel(null);

    const params = new URLSearchParams();
    if (selectedState) params.set("state", selectedState.name);
    if (selectedDistrict) params.set("district", selectedDistrict.name);
    if (selectedSubdistrict) params.set("taluka", selectedSubdistrict.name);
    if (match) params.set("village", match.name);
    router.replace(`/page2-reconcile?${params.toString()}`);
  };

  const subdistrictLabel = activeCadastralConfig?.subdistrictLabel || "Taluka / Tehsil";

  const featureAttributes = useMemo(() => {
    if (!selectedParcel) return [];

    // Cadastral Parcel
    if (!selectedParcel.featureType || selectedParcel.featureType === "PARCEL") {
      if (!activeCadastralConfig) return [];
      const p = selectedParcel.properties;
      return activeCadastralConfig.displayFields
        .filter((field) => p[field.key] !== undefined && p[field.key] !== null && String(p[field.key]).trim() !== "")
        .map((field) => ({
          key: field.key,
          label: field.label,
          value: String(p[field.key]),
        }));
    }

    // Physical Features (Road, Building, Water, Waterway)
    const p = selectedParcel.properties || {};
    const parsedTags = parseOtherTags(p.other_tags);
    const combined: Record<string, string> = {};

    for (const [k, v] of Object.entries(p)) {
      if (v !== undefined && v !== null && String(v).trim() !== "" && k !== "other_tags" && k !== "z_order") {
        combined[k] = String(v);
      }
    }
    for (const [k, v] of Object.entries(parsedTags)) {
      if (v !== undefined && v !== null && String(v).trim() !== "" && !combined[k]) {
        combined[k] = String(v);
      }
    }

    const rows: { key: string; label: string; value: string }[] = [];

    if (selectedParcel.featureType === "ROAD") {
      rows.push({ key: "name", label: "Name", value: combined.name || "Unnamed Road" });
      if (combined.highway) rows.push({ key: "highway", label: "Road Type", value: combined.highway });
      if (combined.surface) rows.push({ key: "surface", label: "Surface", value: combined.surface });
      if (combined.lanes) rows.push({ key: "lanes", label: "Lanes", value: combined.lanes });
      if (combined.maxspeed) rows.push({ key: "maxspeed", label: "Speed Limit", value: combined.maxspeed });
      if (combined.oneway) rows.push({ key: "oneway", label: "One Way", value: combined.oneway });
      if (combined.bridge) rows.push({ key: "bridge", label: "Bridge", value: combined.bridge });
      if (combined.tunnel) rows.push({ key: "tunnel", label: "Tunnel", value: combined.tunnel });
      if (combined.access) rows.push({ key: "access", label: "Access", value: combined.access });
      if (combined.ref) rows.push({ key: "ref", label: "Reference", value: combined.ref });
      if (combined.osm_id) rows.push({ key: "osm_id", label: "OSM ID", value: combined.osm_id });
      else if (combined.osm_way_id) rows.push({ key: "osm_way_id", label: "OSM ID", value: combined.osm_way_id });

      const handled = new Set(["name", "highway", "surface", "lanes", "maxspeed", "oneway", "bridge", "tunnel", "access", "ref", "osm_id", "osm_way_id", "z_order", "other_tags"]);
      for (const [k, v] of Object.entries(combined)) {
        if (!handled.has(k)) {
          rows.push({ key: k, label: formatPropertyName(k), value: v });
        }
      }
    } else if (selectedParcel.featureType === "BUILDING") {
      if (combined.building) rows.push({ key: "building", label: "Building Type", value: combined.building });
      rows.push({ key: "name", label: "Name", value: combined.name || "—" });
      if (combined["addr:housenumber"] || combined.housenumber) {
        rows.push({ key: "housenumber", label: "House Number", value: combined["addr:housenumber"] || combined.housenumber });
      }
      if (combined["addr:street"] || combined.street) {
        rows.push({ key: "street", label: "Street", value: combined["addr:street"] || combined.street });
      }
      if (combined["addr:city"] || combined.city) {
        rows.push({ key: "city", label: "City", value: combined["addr:city"] || combined.city });
      }
      if (combined["addr:postcode"] || combined.postcode) {
        rows.push({ key: "postcode", label: "Postcode", value: combined["addr:postcode"] || combined.postcode });
      }
      if (combined.amenity) rows.push({ key: "amenity", label: "Amenity", value: combined.amenity });
      if (combined.osm_id) rows.push({ key: "osm_id", label: "OSM ID", value: combined.osm_id });
      else if (combined.osm_way_id) rows.push({ key: "osm_way_id", label: "OSM ID", value: combined.osm_way_id });

      const handled = new Set(["name", "building", "addr:housenumber", "housenumber", "addr:street", "street", "addr:city", "city", "addr:postcode", "postcode", "amenity", "osm_id", "osm_way_id", "z_order", "other_tags", "admin_level"]);
      for (const [k, v] of Object.entries(combined)) {
        if (!handled.has(k)) {
          rows.push({ key: k, label: formatPropertyName(k), value: v });
        }
      }
    } else if (selectedParcel.featureType === "WATER") {
      rows.push({ key: "name", label: "Name", value: combined.name || "Unnamed Water Body" });
      if (combined.water) rows.push({ key: "water", label: "Water Type", value: combined.water });
      if (combined.natural) rows.push({ key: "natural", label: "Natural", value: combined.natural });
      if (combined.waterway) rows.push({ key: "waterway", label: "Waterway", value: combined.waterway });
      if (combined.osm_id) rows.push({ key: "osm_id", label: "OSM ID", value: combined.osm_id });
      else if (combined.osm_way_id) rows.push({ key: "osm_way_id", label: "OSM ID", value: combined.osm_way_id });

      const handled = new Set(["name", "water", "natural", "waterway", "osm_id", "osm_way_id", "z_order", "other_tags", "admin_level"]);
      for (const [k, v] of Object.entries(combined)) {
        if (!handled.has(k)) {
          rows.push({ key: k, label: formatPropertyName(k), value: v });
        }
      }
    } else if (selectedParcel.featureType === "WATERWAY") {
      rows.push({ key: "name", label: "Name", value: combined.name || "Unnamed Waterway" });
      if (combined.waterway) rows.push({ key: "waterway", label: "Waterway Type", value: combined.waterway });
      if (combined.intermittent) rows.push({ key: "intermittent", label: "Intermittent", value: combined.intermittent });
      if (combined.width) rows.push({ key: "width", label: "Width", value: combined.width });
      if (combined.bridge) rows.push({ key: "bridge", label: "Bridge", value: combined.bridge });
      if (combined.tunnel) rows.push({ key: "tunnel", label: "Tunnel", value: combined.tunnel });
      if (combined.osm_id) rows.push({ key: "osm_id", label: "OSM ID", value: combined.osm_id });
      else if (combined.osm_way_id) rows.push({ key: "osm_way_id", label: "OSM ID", value: combined.osm_way_id });

      const handled = new Set(["name", "waterway", "intermittent", "width", "bridge", "tunnel", "osm_id", "osm_way_id", "z_order", "other_tags"]);
      for (const [k, v] of Object.entries(combined)) {
        if (!handled.has(k)) {
          rows.push({ key: k, label: formatPropertyName(k), value: v });
        }
      }
    }

    return rows;
  }, [selectedParcel, activeCadastralConfig]);

  const dynamicHeaderTitle = useMemo(() => {
    if (selectedVillage) {
      return `${selectedState?.name} → ${selectedDistrict?.name} → ${selectedSubdistrict?.name} → ${selectedVillage.name}`;
    }
    if (selectedSubdistrict) {
      return `${selectedState?.name} → ${selectedDistrict?.name} → ${selectedSubdistrict?.name}`;
    }
    if (selectedDistrict) {
      return `${selectedState?.name} → ${selectedDistrict?.name}`;
    }
    if (selectedState) {
      return `${selectedState.name} • Select Administrative Hierarchy`;
    }
    return "No administrative region selected";
  }, [selectedState, selectedDistrict, selectedSubdistrict, selectedVillage]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070d1e] text-zinc-100 overflow-hidden select-none font-sans">
      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="flex-shrink-0 h-14 border-b border-zinc-800 bg-[#091124]/90 backdrop-blur px-5 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
            <Compass className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="font-mono font-bold tracking-wider text-sm bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              TERRAMAP AI
            </span>
          </Link>
          <span className="text-zinc-700">/</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              PAGE 2 • CADASTRAL RECONCILIATION
            </span>
            <span className="text-xs text-zinc-400 hidden lg:inline font-mono truncate max-w-md">
              {dynamicHeaderTitle}
            </span>
          </div>
        </div>

        {/* Workflow Steps Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors font-medium flex items-center gap-1.5"
          >
            <span>1. Extraction</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. Reconciliation</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <Link
            href="/page3-dispute"
            className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors font-medium flex items-center gap-1.5"
          >
            <span>3. Dispute</span>
          </Link>
        </div>
      </header>

      {/* 2. ADMINISTRATIVE STRICT CASCADING BAR */}
      <div className="flex-shrink-0 bg-[#0b1426] border-b border-zinc-800/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* State Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-zinc-400 font-mono uppercase text-[10px] tracking-wider">State:</label>
            <select
              value={selectedState?.code || ""}
              onChange={handleStateChange}
              disabled={isLoadingRegistry}
              className="bg-zinc-900/90 border border-zinc-700/80 text-zinc-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 hover:border-zinc-600 transition-colors cursor-pointer"
            >
              <option value="">{isLoadingRegistry ? "Loading States..." : "Select State"}</option>
              {stateOptions.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* District Selector (Only districts strictly matching state code) */}
          <div className="flex items-center gap-1.5">
            <label className="text-zinc-400 font-mono uppercase text-[10px] tracking-wider">District:</label>
            <select
              value={selectedDistrict?.code || ""}
              onChange={handleDistrictChange}
              disabled={!selectedState || districtOptions.length === 0}
              className="bg-zinc-900/90 border border-zinc-700/80 text-zinc-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <option value="">
                {selectedState ? `Select District (${districtOptions.length})` : "—"}
              </option>
              {districtOptions.map((dt) => (
                <option key={dt.code} value={dt.code}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Taluka / Subdistrict Selector (Only subdistricts strictly matching district code) */}
          <div className="flex items-center gap-1.5">
            <label className="text-zinc-400 font-mono uppercase text-[10px] tracking-wider">{subdistrictLabel}:</label>
            <select
              value={selectedSubdistrict?.code || ""}
              onChange={handleSubdistrictChange}
              disabled={!selectedDistrict || subdistrictOptions.length === 0}
              className="bg-zinc-900/90 border border-zinc-700/80 text-zinc-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <option value="">
                {selectedDistrict ? `Select ${subdistrictLabel} (${subdistrictOptions.length})` : "—"}
              </option>
              {subdistrictOptions.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />

          {/* Village Selector (Only villages strictly matching subdistrict code) */}
          <div className="flex items-center gap-1.5">
            <label className="text-zinc-400 font-mono uppercase text-[10px] tracking-wider">Village:</label>
            <select
              value={selectedVillage?.code || ""}
              onChange={handleVillageChange}
              disabled={!selectedSubdistrict || villageOptions.length === 0}
              className="bg-zinc-900/90 border border-zinc-700/80 text-zinc-100 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <option value="">
                {selectedSubdistrict ? `Select Village (${villageOptions.length})` : "—"}
              </option>
              {villageOptions.map((vil) => (
                <option key={vil.code} value={vil.code}>
                  {vil.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dataset Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span
              className={`w-2 h-2 rounded-full ${
                mapStatus === "CONNECTED"
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : mapStatus === "ERROR"
                  ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                  : "bg-amber-400 animate-ping"
              }`}
            />
            <span>
              PMTiles: {activeCadastralConfig ? activeCadastralConfig.sourceLayer : "Administrative"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: MAP (LEFT/CENTER) + INSPECTION DRAWER (RIGHT) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* MAP CONTAINER */}
        <div className="flex-1 h-full relative bg-[#020617]">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Map Overlay Status Note */}
          <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-2 z-10">
            <div className="bg-[#0b1426]/90 backdrop-blur border border-zinc-800/90 rounded-lg p-2.5 shadow-xl text-xs font-mono max-w-sm pointer-events-auto">
              <div className="flex items-center justify-between gap-2 text-zinc-400 border-b border-zinc-800/80 pb-1.5 mb-1.5">
                <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <Layers className="w-3.5 h-3.5" /> Vector Layer Stream
                </span>
                <span className="text-[10px] text-zinc-500">MapLibre GL</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {selectedVillage ? (
                  <>
                    Showing vector parcels for <strong className="text-cyan-300">{selectedVillage.name}</strong> (Code: {selectedVillage.code}). Click any parcel polygon to inspect official records.
                  </>
                ) : selectedState ? (
                  <>
                    Active state: <strong className="text-cyan-300">{selectedState.name}</strong>. Select district, {subdistrictLabel.toLowerCase()}, and village to display cadastral parcels.
                  </>
                ) : (
                  "Select a State from the top bar to initialize official cadastral navigation."
                )}
              </p>
            </div>
          </div>

          {/* Floating Map Legend */}
          <div className="absolute bottom-6 right-6 bg-[#091124]/90 backdrop-blur border border-zinc-800 rounded-lg p-3 text-xs font-mono shadow-2xl z-10">
            <div className="text-zinc-400 font-bold mb-2 uppercase text-[10px] tracking-wider">Map Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-red-400 bg-red-500/35" />
                <span className="text-zinc-300 text-[11px]">OSM Buildings</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-amber-400 bg-amber-500/50" />
                <span className="text-zinc-300 text-[11px]">OSM Roads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-blue-500 bg-blue-600/35" />
                <span className="text-zinc-300 text-[11px]">OSM Water</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-sky-400 bg-sky-400/60" />
                <span className="text-zinc-300 text-[11px]">OSM Waterways</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-emerald-400 bg-emerald-500/30" />
                <span className="text-zinc-300 text-[11px]">MRSAC Cadastral (MH)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-cyan-400 bg-cyan-500/30" />
                <span className="text-zinc-300 text-[11px]">MPBhulekh Cadastral (MP)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-amber-400 bg-yellow-400/40" />
                <span className="text-zinc-300 text-[11px]">Selected Parcel Highlight</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm border border-amber-500 bg-amber-500/20" />
                <span className="text-zinc-300 text-[11px]">Selected Village Boundary</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. RIGHT-SIDE INSPECTION DRAWER */}
        <div className="w-96 flex-shrink-0 border-l border-zinc-800 bg-[#091124] flex flex-col h-full overflow-hidden z-20">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0b1426]">
            <div className="flex items-center gap-2">
              {selectedParcel?.featureType === "ROAD" ? (
                <Route className="w-4 h-4 text-amber-400" />
              ) : selectedParcel?.featureType === "BUILDING" ? (
                <Home className="w-4 h-4 text-red-400" />
              ) : selectedParcel?.featureType === "WATER" ? (
                <Droplets className="w-4 h-4 text-blue-400" />
              ) : selectedParcel?.featureType === "WATERWAY" ? (
                <Waves className="w-4 h-4 text-sky-400" />
              ) : (
                <Building2 className="w-4 h-4 text-cyan-400" />
              )}
              <h2 className="font-semibold text-sm tracking-wide text-zinc-100">
                {selectedParcel?.title || "PARCEL INSPECTION"}
              </h2>
            </div>
            {selectedParcel && (
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80">
                  {selectedParcel.featureType || "PARCEL"}
                </span>
                <button
                  onClick={() => setSelectedParcel(null)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Close panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedParcel ? (
              <>
                {/* Jurisdictional / Geographic Context */}
                {(!selectedParcel.featureType || selectedParcel.featureType === "PARCEL") ? (
                  <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                      Jurisdictional Hierarchy
                    </div>
                    <div className="text-xs space-y-1 font-mono text-zinc-300">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">State:</span>
                        <span className="text-cyan-300 font-semibold">{selectedState?.name || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">District:</span>
                        <span className="text-zinc-200">
                          {selectedDistrict?.name ? `${selectedDistrict.name} (${selectedDistrict.code})` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{subdistrictLabel}:</span>
                        <span className="text-zinc-200">
                          {selectedSubdistrict?.name ? `${selectedSubdistrict.name} (${selectedSubdistrict.code})` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Village:</span>
                        <span className="text-emerald-300 font-semibold">
                          {selectedVillage?.name ? `${selectedVillage.name} (${selectedVillage.code})` : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                      Geographic Reference
                    </div>
                    <div className="text-xs space-y-1 font-mono text-zinc-300">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Region:</span>
                        <span className="text-cyan-300 font-semibold">{selectedState?.name || "Madhya Pradesh"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Feature Class:</span>
                        <span className="text-amber-300 font-semibold">{selectedParcel.featureType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Source:</span>
                        <span className="text-zinc-200 font-mono text-[11px]">{selectedParcel.source}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real Attributes from Vector PMTiles */}
                <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      {(!selectedParcel.featureType || selectedParcel.featureType === "PARCEL")
                        ? "Authoritative PMTiles Attributes"
                        : `${selectedParcel.featureType} Properties`}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {selectedParcel.source}
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {featureAttributes.length > 0 ? (
                      featureAttributes.map((attr) => (
                        <div key={attr.key} className="flex justify-between items-start gap-2 border-b border-zinc-800/40 pb-1.5">
                          <span className="text-zinc-400 text-[11px] flex-shrink-0">{attr.label}</span>
                          <span className="text-zinc-100 font-medium text-right text-[11px] break-all">
                            {attr.value}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-500 text-xs italic py-2">
                        No additional attributes present in this vector tile.
                      </div>
                    )}
                  </div>
                </div>

                {/* AI / Reference Status */}
                {(!selectedParcel.featureType || selectedParcel.featureType === "PARCEL") ? (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                        AI Ground Truth Status
                      </span>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <p className="text-[11px] text-zinc-400">
                        AI Ground Truth: <span className="text-amber-400">Not available</span> for this remote cadastral coordinate.
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Upload drone orthophoto on Page 1 to reconcile AI vector extraction against this parcel boundary.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        Vector Layer Reference
                      </span>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <p className="text-[11px] text-zinc-400">
                        Physical reference layer active. Sourced directly from <span className="text-cyan-300">{selectedParcel.layerId}</span>.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-zinc-500">
                <div className="w-12 h-12 rounded-full bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Search className="w-6 h-6" />
                </div>
                <div className="font-semibold text-sm text-zinc-300">No feature selected</div>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Navigate through the administrative dropdowns above or zoom to a village, and click on any cadastral parcel, building, road, water body, or waterway to view detailed attributes.
                </p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-3 border-t border-zinc-800 bg-[#070d1e] flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-mono text-[10px]">
              Engine: PMTiles Vector + GeoJSON
            </span>
            <Link
              href="/page3-dispute"
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg transition-colors font-mono font-semibold flex items-center gap-1 text-[11px]"
            >
              <span>Dispute Workflow</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
