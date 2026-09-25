import proj4 from "proj4";
import { GeoJSONFeatureCollection, GeoJSONFeature, calculatePolygonArea } from "./geometry";

// Register UTM Zone 43N (EPSG:32643) and WGS84 (EPSG:4326)
proj4.defs("EPSG:32643", "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

/**
 * Administrative Hierarchy for Madhya Pradesh pilot
 */
export interface AdminHierarchy {
  state: string;
  district: string;
  tehsil: string;
  village: string;
  lgdCode: string;
  khasras: string[];
}

export const PILOT_HIERARCHY: AdminHierarchy = {
  state: "Madhya Pradesh",
  district: "Bhopal",
  tehsil: "Huzur",
  village: "Bairagarh Kalan",
  lgdCode: "482910",
  khasras: [
    "08-412-K",
    "08-412-A",
    "08-412-B",
    "08-412-C",
    "08-412-D",
    "08-412-E",
    "08-412-F",
    "08-412-G",
    "08-412-H",
    "08-412-I",
    "08-412-J",
  ],
};

/**
 * Spatial Record linking Page 1 uploaded imagery to Page 2 cadastral map
 */
export interface SurveyRecord {
  surveyNumber: string;
  image: {
    name: string;
    path?: string;
    bounds: [number, number, number, number]; // [west, south, east, north] in EPSG:4326
    footprint: GeoJSONFeature;
  };
  surveyInfo: {
    village?: string;
    tehsil?: string;
    district?: string;
    state?: string;
    area?: number;
    perimeter?: number;
    owner?: string;
    coOwners?: string[];
    landUse?: string;
    featureClass?: string;
    status?: string;
    khataNumber?: string;
    ulpin?: string;
    annualRevenue?: string;
    soilClassification?: string;
    mortgageStatus?: "Unencumbered" | "Mortgaged to Bank" | "Under Dispute";
    alertType?: "ROW_OVERLAP" | "WATER_BUFFER" | "DISPUTE" | "NONE";
    alertDetails?: string;
    associatedTileId?: string;
  };
  legalGeometry?: GeoJSONFeature;
  aiGeometry?: GeoJSONFeature;
}

export type SurveySpatialRecord = SurveyRecord;

/**
 * Derive image footprint polygon (expanded bounding envelope) for a parcel feature
 */
export function deriveImageFootprint(
  parcelFeature: GeoJSONFeature,
  surveyNumber: string
): GeoJSONFeature {
  const collection: GeoJSONFeatureCollection = {
    type: "FeatureCollection",
    features: [parcelFeature],
  };
  const [minLng, minLat, maxLng, maxLat] = getWgs84Bbox(collection);

  // Pad by ~25% to represent the drone flight orthophoto envelope
  const deltaLng = (maxLng - minLng) * 0.25 || 0.0001;
  const deltaLat = (maxLat - minLat) * 0.25 || 0.0001;

  const fMinLng = Math.round((minLng - deltaLng) * 1000000) / 1000000;
  const fMaxLng = Math.round((maxLng + deltaLng) * 1000000) / 1000000;
  const fMinLat = Math.round((minLat - deltaLat) * 1000000) / 1000000;
  const fMaxLat = Math.round((maxLat + deltaLat) * 1000000) / 1000000;

  return {
    type: "Feature",
    id: `footprint_${surveyNumber.replace(/-/g, "_")}`,
    properties: {
      type: "image_footprint",
      source: "Drone Orthophoto Sensor",
      surveyNumber,
      description: `Drone Orthophoto Sensor Footprint for Survey ${surveyNumber}`,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [fMinLng, fMinLat],
          [fMaxLng, fMinLat],
          [fMaxLng, fMaxLat],
          [fMinLng, fMaxLat],
          [fMinLng, fMinLat],
        ],
      ],
    },
  };
}

/**
 * Statutory RoR (Record of Rights) metadata
 */
export interface RoRData {
  khasraId: string;
  khataNumber: string;
  plotId: string;
  featureClass: string;
  coOwners: string[];
  annualRevenue: string;
  soilClassification: string;
  mortgageStatus: "Unencumbered" | "Mortgaged to Bank" | "Under Dispute";
  ulpin: string; // 14-char alphanumeric demo format
  statutoryArea: number; // in sq meters
  alertType?: "ROW_OVERLAP" | "WATER_BUFFER" | "DISPUTE" | "NONE";
  alertDetails?: string;
  associatedTileId: string;
}

export const KHASRA_METADATA_REGISTRY: Record<string, RoRData> = {
  "08-412-K": {
    khasraId: "08-412-K",
    khataNumber: "KH-792/2023",
    plotId: "PL-BGK-08412K",
    featureClass: "AI Ortho Drone Surveyed Parcel",
    coOwners: ["State Land Registry / Drone Extraction"],
    annualRevenue: "₹ 1,420 / annum",
    soilClassification: "Medium Black (Kali-2)",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841211K",
    statutoryArea: 1248.3,
    alertType: "NONE",
    associatedTileId: "huzur_mapped_01",
  },
  "08-412-A": {
    khasraId: "08-412-A",
    khataNumber: "KH-782/2023",
    plotId: "PL-BGK-08412A",
    featureClass: "Agricultural / Semi-Urban",
    coOwners: ["Rameshwar P. (50%)", "Sunita Bai (50%)"],
    annualRevenue: "₹ 1,420 / annum",
    soilClassification: "Medium Black (Kali-2)",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841201A",
    statutoryArea: 1248.3,
    alertType: "ROW_OVERLAP",
    alertDetails: "Parcel intersects the statutory 15m Road Right-of-Way (ROW) corridor.",
    associatedTileId: "00_00",
  },
  "08-412-B": {
    khasraId: "08-412-B",
    khataNumber: "KH-783/2023",
    plotId: "PL-BGK-08412B",
    featureClass: "Residential / Homestead",
    coOwners: ["Devendra Verma (100%)"],
    annualRevenue: "₹ 2,150 / annum",
    soilClassification: "Alluvial Silty",
    mortgageStatus: "Under Dispute",
    ulpin: "4829100841202B",
    statutoryArea: 864.5,
    alertType: "DISPUTE",
    alertDetails: "Flagged boundary dispute under Section 129 MP Land Revenue Code.",
    associatedTileId: "00_03",
  },
  "08-412-C": {
    khasraId: "08-412-C",
    khataNumber: "KH-784/2023",
    plotId: "PL-BGK-08412C",
    featureClass: "Agricultural Irrigated",
    coOwners: ["Kamla Devi (100%)"],
    annualRevenue: "₹ 980 / annum",
    soilClassification: "Deep Black Clayey",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841203C",
    statutoryArea: 1540.2,
    alertType: "NONE",
    associatedTileId: "00_05",
  },
  "08-412-D": {
    khasraId: "08-412-D",
    khataNumber: "KH-785/2023",
    plotId: "PL-BGK-08412D",
    featureClass: "Commercial / Warehouse",
    coOwners: ["Bhopal Agro Logistics Ltd."],
    annualRevenue: "₹ 5,800 / annum",
    soilClassification: "Constructed Mixed",
    mortgageStatus: "Mortgaged to Bank",
    ulpin: "4829100841204D",
    statutoryArea: 2110.0,
    alertType: "NONE",
    associatedTileId: "00_06",
  },
  "08-412-E": {
    khasraId: "08-412-E",
    khataNumber: "KH-786/2023",
    plotId: "PL-BGK-08412E",
    featureClass: "Riparian / Wetland Buffer",
    coOwners: ["Madhya Pradesh State Revenue Dept."],
    annualRevenue: "₹ 0 (Government)",
    soilClassification: "Riverine Silt",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841205E",
    statutoryArea: 950.4,
    alertType: "WATER_BUFFER",
    alertDetails: "Parcel intersects the 30m NGT statutory water-body buffer envelope.",
    associatedTileId: "00_08",
  },
  "08-412-F": {
    khasraId: "08-412-F",
    khataNumber: "KH-787/2023",
    plotId: "PL-BGK-08412F",
    featureClass: "Agricultural Single Crop",
    coOwners: ["Harishankar Sharma (100%)"],
    annualRevenue: "₹ 1,120 / annum",
    soilClassification: "Medium Black",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841206F",
    statutoryArea: 1320.0,
    alertType: "NONE",
    associatedTileId: "00_09",
  },
  "08-412-G": {
    khasraId: "08-412-G",
    khataNumber: "KH-788/2023",
    plotId: "PL-BGK-08412G",
    featureClass: "Residential Abadi",
    coOwners: ["Mohd. Imran (50%)", "Zubair Ahmed (50%)"],
    annualRevenue: "₹ 1,750 / annum",
    soilClassification: "Red Gravel Mixed",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841207G",
    statutoryArea: 720.6,
    alertType: "NONE",
    associatedTileId: "00_11",
  },
  "08-412-H": {
    khasraId: "08-412-H",
    khataNumber: "KH-789/2023",
    plotId: "PL-BGK-08412H",
    featureClass: "Industrial Facility",
    coOwners: ["Kalan Precision Tools LLP"],
    annualRevenue: "₹ 8,400 / annum",
    soilClassification: "Engineered Subgrade",
    mortgageStatus: "Mortgaged to Bank",
    ulpin: "4829100841208H",
    statutoryArea: 3450.0,
    alertType: "NONE",
    associatedTileId: "00_12",
  },
  "08-412-I": {
    khasraId: "08-412-I",
    khataNumber: "KH-790/2023",
    plotId: "PL-BGK-08412I",
    featureClass: "Orchard / Horticulture",
    coOwners: ["Lata Bai (100%)"],
    annualRevenue: "₹ 1,350 / annum",
    soilClassification: "Deep Loamy Black",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841209I",
    statutoryArea: 1680.0,
    alertType: "NONE",
    associatedTileId: "01_01",
  },
  "08-412-J": {
    khasraId: "08-412-J",
    khataNumber: "KH-791/2023",
    plotId: "PL-BGK-08412J",
    featureClass: "Public Utility / Panchayat",
    coOwners: ["Gram Panchayat Bairagarh Kalan"],
    annualRevenue: "₹ 0 (Public)",
    soilClassification: "Alluvial Loam",
    mortgageStatus: "Unencumbered",
    ulpin: "4829100841210J",
    statutoryArea: 1100.0,
    alertType: "NONE",
    associatedTileId: "01_06",
  },
};

/**
 * Transform a coordinate [utmX, utmY] from EPSG:32643 to WGS84 [lng, lat]
 */
export function utmToWgs84(coord: [number, number]): [number, number] {
  try {
    const [x, y] = coord;
    // If already in lat/long range, return directly
    if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
      return [x, y];
    }
    const [lng, lat] = proj4("EPSG:32643", "EPSG:4326", [x, y]);
    return [Math.round(lng * 1000000) / 1000000, Math.round(lat * 1000000) / 1000000];
  } catch (e) {
    console.error("Coordinate projection failed:", e);
    return [coord[0], coord[1]];
  }
}

/**
 * Transform an entire GeoJSON FeatureCollection to WGS84 for MapLibre rendering
 */
export function projectGeoJsonToWgs84(geojson: GeoJSONFeatureCollection): GeoJSONFeatureCollection {
  const transformedFeatures = geojson.features.map((feature) => {
    const cloned = JSON.parse(JSON.stringify(feature)) as GeoJSONFeature;
    const geom = cloned.geometry;

    if (geom.type === "Polygon") {
      geom.coordinates = geom.coordinates.map((ring: [number, number][]) =>
        ring.map((pt: [number, number]) => utmToWgs84(pt))
      );
    } else if (geom.type === "MultiPolygon") {
      geom.coordinates = geom.coordinates.map((poly: [number, number][][]) =>
        poly.map((ring: [number, number][]) => ring.map((pt: [number, number]) => utmToWgs84(pt)))
      );
    } else if (geom.type === "LineString") {
      geom.coordinates = geom.coordinates.map((pt: [number, number]) => utmToWgs84(pt));
    }

    return cloned;
  });

  return {
    ...geojson,
    crs: { type: "name", properties: { name: "EPSG:4326" } },
    features: transformedFeatures,
  };
}

/**
 * Compute the WGS84 bounding box [minLng, minLat, maxLng, maxLat]
 */
export function getWgs84Bbox(wgs84Geojson: GeoJSONFeatureCollection): [number, number, number, number] {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  const check = (pt: [number, number]) => {
    const [lng, lat] = pt;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  };

  for (const ft of wgs84Geojson.features) {
    const geom = ft.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) {
        for (const pt of ring) check(pt);
      }
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        for (const ring of poly) {
          for (const pt of ring) check(pt);
        }
      }
    } else if (geom.type === "LineString") {
      for (const pt of geom.coordinates) check(pt);
    }
  }

  if (!isFinite(minLng) || !isFinite(maxLng)) {
    // Exact Bairagarh Kalan / Huzur, Bhopal pilot coordinates
    return [77.412, 23.255, 77.419, 23.258];
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Calculate parcel metric area from raw coordinates (using UTM if available, or geometry helper)
 */
export function getCalculatedMetricArea(feature: GeoJSONFeature): number {
  const geom = feature.geometry;
  if (!geom) return 0;
  if (feature.properties?.Area_sq_m) {
    return feature.properties.Area_sq_m;
  }
  if (geom.type === "Polygon" && geom.coordinates[0]) {
    return Math.round(calculatePolygonArea(geom.coordinates[0]) * 10) / 10;
  }
  return 0;
}
