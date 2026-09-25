import { GeoJSONFeatureCollection } from "./geometry";

export interface DemoTile {
  id: string;
  name: string;
  imageUrl: string;
  resolution: string;
  featuresCount?: number;
}

// Huzur Bhopal pre-generated mapped cadastre priority list + High Precision tiles
export const KNOWN_TILES: string[] = [
  "huzur_mapped_01",
  "huzur_mapped_02",
  "huzur_mapped_03",
  "00_00", "00_03", "00_05", "00_06", "00_08", "00_09", "00_11", "00_12",
  "00_15", "00_16", "00_17", "00_18", "00_20", "00_21", "00_22", "01_01",
  "01_02", "01_06", "01_07", "01_08", "01_09", "01_10", "01_11", "01_12", "01_13"
];

export const DEFAULT_TILE = "huzur_mapped_01";

/**
 * Deterministically match an uploaded file name or metadata to one of the Huzur pre-generated maps
 */
export function matchUploadedFileToTile(filename?: string): string {
  if (!filename) return DEFAULT_TILE;

  // 1. Direct match if tile id is present in filename (e.g. "huzur_raw_01", "01", "02", "00_00")
  for (const tile of ["huzur_mapped_01", "huzur_mapped_02", "huzur_mapped_03", "00_00", "00_03", "00_05"]) {
    if (filename.includes(tile) || filename.includes(tile.replace("huzur_mapped_", "huzur_raw_"))) {
      return tile;
    }
  }

  if (filename.includes("01")) return "huzur_mapped_01";
  if (filename.includes("02")) return "huzur_mapped_02";
  if (filename.includes("03")) return "huzur_mapped_03";

  // 2. Deterministic hash fallback across Huzur mapped cadastre
  const huzurPool = ["huzur_mapped_01", "huzur_mapped_02", "huzur_mapped_03"];
  let hash = 0;
  for (let i = 0; i < filename.length; i++) {
    hash = (hash << 5) - hash + filename.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % huzurPool.length;
  return huzurPool[index];
}

/**
 * Get the visual map image URL for a tile
 */
export function getTileImageUrl(tileId: string): string {
  // Uses Next.js direct API route that streams from data/Huzur_Bhopal_Cadastre_20Pairs/mapped_cadastre/
  return `/api/tiles/${tileId}/image`;
}

/**
 * Fetch GeoJSON for a tile. First attempts Next.js /api/tiles/:id/geojson, then FastAPI backend, then static dataset bundle.
 */
export async function fetchTileGeoJSON(tileId: string): Promise<GeoJSONFeatureCollection> {
  const cleanTileId = matchUploadedFileToTile(tileId);

  // 1. Try Next.js API route first (directly reads data/Huzur_Bhopal_Cadastre_20Pairs/geojson/)
  try {
    const res = await fetch(`/api/tiles/${cleanTileId}/geojson`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // Continue to next fallback
  }

  // 2. Try FastAPI backend if running on 8000
  try {
    const res = await fetch(`http://localhost:8000/api/tiles/${cleanTileId}/geojson`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.features && data.features.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // Backend might not be running or on different port, proceed to client fallback
  }

  // 3. Try static client dataset bundle
  try {
    const res = await fetch("/data/cadastre_dataset.json");
    if (res.ok) {
      const dataset = await res.json();
      if (dataset[cleanTileId]) {
        return dataset[cleanTileId];
      }
      const mappedId = cleanTileId === "huzur_mapped_02" ? "00_03" : cleanTileId === "huzur_mapped_03" ? "00_05" : "00_00";
      if (dataset[mappedId]) {
        return {
          ...dataset[mappedId],
          tile_id: cleanTileId,
        };
      }
    }
  } catch (e) {
    console.error("Failed to load cadastre dataset fallback:", e);
  }

  // 4. Fallback minimum feature collection
  return {
    type: "FeatureCollection",
    tile_id: cleanTileId,
    crs: { type: "name", properties: { name: "EPSG:32643" } },
    features: [
      {
        type: "Feature",
        id: `parcel_${cleanTileId}_1`,
        properties: {
          type: "parcel",
          source: "AI Mapping",
          Area_sq_m: 34.7,
          survey_number: `SV-HZR-${cleanTileId.replace("huzur_mapped_", "")}-101`,
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [746873.33, 2573980.31],
              [746878.85, 2573977.25],
              [746879.55, 2573983.74],
              [746873.19, 2573982.41],
              [746873.33, 2573980.31],
            ],
          ],
        },
      },
    ],
  };
}

/**
 * Storage helpers for persisting edits per tile and synchronizing with Page 2 (alpha_cadastre_geojson)
 */
export function getSavedTileEdits(tileId: string): GeoJSONFeatureCollection | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `terramap_mapping_${tileId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read localStorage:", e);
  }
  return null;
}

export function saveTileEdits(tileId: string, geojson: GeoJSONFeatureCollection): void {
  if (typeof window === "undefined") return;
  try {
    // 1. Save specific tile
    const key = `terramap_mapping_${tileId}`;
    const serialized = JSON.stringify(geojson);
    localStorage.setItem(key, serialized);

    // 2. Commit as current active AI cadastre for Page 2 synchronization
    localStorage.setItem("alpha_cadastre_geojson", serialized);
    localStorage.setItem("alpha_cadastre_active_tile", tileId);

    // 3. Persist Survey Spatial Records dictionary for Page 2 lookup
    const existingRecordsRaw = localStorage.getItem("alpha_survey_records");
    const records = existingRecordsRaw ? JSON.parse(existingRecordsRaw) : {};

    // Map tile to corresponding Survey/Khasra ID
    const tileToKhasraMap: Record<string, string> = {
      "00_00": "08-412-A",
      "huzur_mapped_01": "08-412-K",
      "00_03": "08-412-B",
      "huzur_mapped_02": "08-412-B",
      "00_05": "08-412-C",
      "huzur_mapped_03": "08-412-C",
      "00_06": "08-412-D",
      "00_08": "08-412-E",
      "00_09": "08-412-F",
      "00_11": "08-412-G",
      "00_12": "08-412-H",
      "01_01": "08-412-I",
      "01_06": "08-412-J",
    };

    const surveyNo = tileToKhasraMap[tileId] || "08-412-K";
    const parcelFeature = geojson.features.find((f) => f.properties?.type === "parcel") || geojson.features[0];
    // Compute WGS84 coordinates and bounding box
    let wgsFeature = parcelFeature;
    try {
      const { projectGeoJsonToWgs84, getWgs84Bbox, deriveImageFootprint } = require("./reconciliation");
      const wgsCol = projectGeoJsonToWgs84({ type: "FeatureCollection", features: [parcelFeature] });
      wgsFeature = wgsCol.features[0] || parcelFeature;
      let [west, south, east, north] = getWgs84Bbox(wgsCol);

      // Guard: If coordinates are outside Bhopal pilot bbox (e.g. raw pixel space [0..1200]), use statutory fixture coords
      if (west < 77.0 || west > 78.0 || south < 22.5 || south > 24.0) {
        const statutoryCenters: Record<string, [number, number, number, number]> = {
          "08-412-A": [77.4128, 23.2564, 77.4133, 23.2568],
          "08-412-B": [77.4140, 23.2564, 77.4145, 23.2568],
          "08-412-C": [77.4149, 23.2563, 77.4154, 23.2567],
          "08-412-D": [77.4153, 23.2563, 77.4158, 23.2568],
          "08-412-E": [77.4161, 23.2563, 77.4166, 23.2567],
          "08-412-F": [77.4165, 23.2563, 77.4170, 23.2567],
          "08-412-G": [77.4174, 23.2563, 77.4179, 23.2567],
          "08-412-H": [77.4179, 23.2563, 77.4184, 23.2568],
          "08-412-I": [77.4132, 23.2560, 77.4137, 23.2564],
          "08-412-J": [77.4153, 23.2559, 77.4158, 23.2563],
          "08-412-K": [77.4196, 23.2563, 77.4201, 23.2567],
        };
        [west, south, east, north] = statutoryCenters[surveyNo] || [77.413, 23.255, 77.419, 23.258];
      }

      const footprint = deriveImageFootprint(wgsFeature, surveyNo);

      records[surveyNo] = {
        surveyNumber: surveyNo,
        image: {
          name: `${tileId}.png`,
          path: `/api/tiles/${tileId}/image`,
          bounds: [west, south, east, north],
          footprint: footprint,
        },
        surveyInfo: {
          village: "Bairagarh Kalan",
          tehsil: "Huzur",
          district: "Bhopal",
          state: "Madhya Pradesh",
          area: parcelFeature?.properties?.Area_sq_m || 1248.3,
          owner: "State Land Registry / Drone Extraction",
          landUse: "AI Ortho Drone Surveyed Parcel",
          featureClass: "AI Ortho Drone Surveyed Parcel",
          khataNumber: "KH-792/2023",
          ulpin: `482910${surveyNo.replace(/[^0-9A-Z]/g, "")}`,
          annualRevenue: "₹ 1,420 / annum",
          soilClassification: "Medium Black (Kali-2)",
          mortgageStatus: "Unencumbered",
          status: "UNDER RECONCILIATION",
          associatedTileId: tileId,
        },
        legalGeometry: wgsFeature,
        aiGeometry: wgsFeature,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      records[surveyNo] = {
        surveyNumber: surveyNo,
        associatedTileId: tileId,
        updatedAt: new Date().toISOString(),
        featuresCount: geojson.features.length,
        aiGeometry: parcelFeature,
      };
    }

    localStorage.setItem("alpha_survey_records", JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

export function getCommittedCadastre(): GeoJSONFeatureCollection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("alpha_cadastre_geojson");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load alpha_cadastre_geojson:", e);
  }
  return null;
}

export function getSurveySpatialRecords(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("alpha_survey_records");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load alpha_survey_records:", e);
  }
  return {};
}

export function clearTileEdits(tileId: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = `terramap_mapping_${tileId}`;
    localStorage.removeItem(key);
    localStorage.removeItem("alpha_cadastre_geojson");
  } catch (e) {}
}
