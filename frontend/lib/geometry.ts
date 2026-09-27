export interface FeatureProperties {
  type: "parcel" | "building" | "road" | "water" | "encroachment" | string;
  source: string;
  survey_number?: string;
  Area_sq_m?: number;
  Perimeter_m?: number;
  LADM_Standard?: string;
  LADM_Class?: string;
  [key: string]: any;
}

export interface GeoJSONGeometry {
  type: "Polygon" | "MultiPolygon" | "LineString" | "Point";
  coordinates: any;
}

export interface GeoJSONFeature {
  type: "Feature";
  id: string;
  properties: FeatureProperties;
  geometry: GeoJSONGeometry;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  crs?: {
    type: string;
    properties: {
      name: string;
    };
  };
  tile_id?: string;
  image_width?: number;
  image_height?: number;
  features: GeoJSONFeature[];
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Check if the GeoJSON is defined in pixel coordinates [0..w, 0..h]
 */
export function isPixelSpaceGeoJSON(geojson: GeoJSONFeatureCollection): boolean {
  if (geojson.crs?.properties?.name === "Pixel_Space" || geojson.image_width || geojson.image_height) {
    return true;
  }
  // Check coordinate magnitudes
  if (geojson.features.length > 0) {
    const firstFt = geojson.features[0];
    const coords = firstFt.geometry?.coordinates;
    if (coords) {
      const sample = Array.isArray(coords[0]) ? (Array.isArray(coords[0][0]) ? coords[0][0] : coords[0]) : coords;
      if (sample && sample[0] < 5000 && sample[1] < 5000) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Compute the bounding box of a FeatureCollection.
 * For Pixel_Space data, respects the image raster dimensions [0, w, 0, h].
 * For projected spatial CRS (e.g. UTM EPSG:32643), computes the exact coordinate envelope.
 */
export function computeBoundingBox(geojson: GeoJSONFeatureCollection): BoundingBox {
  if (isPixelSpaceGeoJSON(geojson)) {
    const w = geojson.image_width || 1230;
    const h = geojson.image_height || 1232;
    return {
      minX: 0,
      maxX: w,
      minY: 0,
      maxY: h,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const processCoord = (pt: [number, number]) => {
    const [x, y] = pt;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  for (const feature of geojson.features) {
    const { geometry } = feature;
    if (!geometry || !geometry.coordinates) continue;

    if (geometry.type === "Polygon") {
      for (const ring of geometry.coordinates) {
        for (const pt of ring) {
          processCoord(pt);
        }
      }
    } else if (geometry.type === "MultiPolygon") {
      for (const poly of geometry.coordinates) {
        for (const ring of poly) {
          for (const pt of ring) {
            processCoord(pt);
          }
        }
      }
    } else if (geometry.type === "LineString") {
      for (const pt of geometry.coordinates) {
        processCoord(pt);
      }
    } else if (geometry.type === "Point") {
      processCoord(geometry.coordinates);
    }
  }

  // If empty or invalid, provide a default UTM fallback box
  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY) || minX === maxX) {
    return {
      minX: 746867.865,
      maxX: 746879.549,
      minY: 2573975.78,
      maxY: 2573986.933,
    };
  }

  // Exact spatial envelope without arbitrary padding so coordinates map directly to corners
  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

/**
 * Convert GeoJSON coordinate to SVG coordinate.
 * For Pixel Space: GeoJSON coordinates are already in image pixels [0..imageWidth, 0..imageHeight] with top-left origin.
 *   Direct 1:1 mapping if view dimensions match image dimensions.
 * For Projected GIS (UTM): Maps [minX, maxX] -> [0, viewWidth] and [minY, maxY] -> [viewHeight, 0] (inverts Y axis).
 */
export function geoToSvgCoord(
  coord: [number, number],
  bbox: BoundingBox,
  viewWidth = 1230,
  viewHeight = 1232,
  isPixel = false
): [number, number] {
  const [x, y] = coord;
  const dx = bbox.maxX - bbox.minX || 1;
  const dy = bbox.maxY - bbox.minY || 1;

  if (isPixel) {
    // Pixel coordinates in image space: [0..imgWidth, 0..imgHeight] (Y increases downwards)
    const svgX = ((x - bbox.minX) / dx) * viewWidth;
    const svgY = ((y - bbox.minY) / dy) * viewHeight;
    return [Math.round(svgX * 10) / 10, Math.round(svgY * 10) / 10];
  }

  // Geographic / Projected GIS: GIS Y increases Northward (upward), SVG Y increases downward
  const svgX = ((x - bbox.minX) / dx) * viewWidth;
  const svgY = ((bbox.maxY - y) / dy) * viewHeight; // Invert Y axis
  return [Math.round(svgX * 10) / 10, Math.round(svgY * 10) / 10];
}

/**
 * Convert SVG pixel coordinate back to GeoJSON coordinate (Mathematical inverse of geoToSvgCoord).
 */
export function svgToGeoCoord(
  svgPt: [number, number],
  bbox: BoundingBox,
  viewWidth = 1230,
  viewHeight = 1232,
  isPixel = false
): [number, number] {
  const [svgX, svgY] = svgPt;
  const dx = bbox.maxX - bbox.minX || 1;
  const dy = bbox.maxY - bbox.minY || 1;

  if (isPixel) {
    const geoX = bbox.minX + (svgX / viewWidth) * dx;
    const geoY = bbox.minY + (svgY / viewHeight) * dy;
    return [Math.round(geoX * 10) / 10, Math.round(geoY * 10) / 10];
  }

  const geoX = bbox.minX + (svgX / viewWidth) * dx;
  const geoY = bbox.maxY - (svgY / viewHeight) * dy;
  return [geoX, geoY];
}

export interface SvgRenderFeature {
  id: string;
  type: string;
  source: string;
  surveyNumber?: string;
  areaSqM?: number;
  perimeterM?: number;
  geometryType: "Polygon" | "MultiPolygon" | "LineString" | "Point";
  svgPaths: string[]; // SVG 'd' path strings
  rings: [number, number][][]; // In SVG pixel coordinates for interactive vertex editing
  properties: FeatureProperties;
  rawFeature: GeoJSONFeature;
}

/**
 * Convert GeoJSON FeatureCollection into SVG renderable objects
 */
export function geoJsonToSvg(
  geojson: GeoJSONFeatureCollection,
  viewWidth = 1230,
  viewHeight = 1232,
  overrideBbox?: BoundingBox
): { features: SvgRenderFeature[]; bbox: BoundingBox; isPixel: boolean } {
  const isPixel = isPixelSpaceGeoJSON(geojson);
  const bbox = overrideBbox || computeBoundingBox(geojson);
  const rendered: SvgRenderFeature[] = [];

  for (const feature of geojson.features) {
    const { geometry, id, properties } = feature;
    if (!geometry) continue;

    const featType = (properties?.type || "parcel").toLowerCase();
    const source = properties?.source || "AI Mapping";
    const surveyNumber = properties?.survey_number;
    const areaSqM = properties?.Area_sq_m;
    const perimeterM = properties?.Perimeter_m;

    if (geometry.type === "Polygon") {
      const rings: [number, number][][] = [];
      const pathParts: string[] = [];

      for (const ring of geometry.coordinates) {
        const svgRing: [number, number][] = ring.map((pt: [number, number]) =>
          geoToSvgCoord(pt, bbox, viewWidth, viewHeight, isPixel)
        );
        rings.push(svgRing);

        if (svgRing.length > 0) {
          const d =
            `M ${svgRing[0][0]} ${svgRing[0][1]} ` +
            svgRing
              .slice(1)
              .map((p) => `L ${p[0]} ${p[1]}`)
              .join(" ") +
            " Z";
          pathParts.push(d);
        }
      }

      rendered.push({
        id,
        type: featType,
        source,
        surveyNumber,
        areaSqM,
        perimeterM,
        geometryType: "Polygon",
        svgPaths: pathParts,
        rings,
        properties,
        rawFeature: feature,
      });
    } else if (geometry.type === "MultiPolygon") {
      const allRings: [number, number][][] = [];
      const pathParts: string[] = [];

      for (const poly of geometry.coordinates) {
        for (const ring of poly) {
          const svgRing: [number, number][] = ring.map((pt: [number, number]) =>
            geoToSvgCoord(pt, bbox, viewWidth, viewHeight, isPixel)
          );
          allRings.push(svgRing);

          if (svgRing.length > 0) {
            const d =
              `M ${svgRing[0][0]} ${svgRing[0][1]} ` +
              svgRing
                .slice(1)
                .map((p) => `L ${p[0]} ${p[1]}`)
                .join(" ") +
              " Z";
            pathParts.push(d);
          }
        }
      }

      rendered.push({
        id,
        type: featType,
        source,
        surveyNumber,
        areaSqM,
        perimeterM,
        geometryType: "MultiPolygon",
        svgPaths: pathParts,
        rings: allRings,
        properties,
        rawFeature: feature,
      });
    } else if (geometry.type === "LineString") {
      const svgLine: [number, number][] = geometry.coordinates.map((pt: [number, number]) =>
        geoToSvgCoord(pt, bbox, viewWidth, viewHeight, isPixel)
      );

      const d =
        svgLine.length > 0
          ? `M ${svgLine[0][0]} ${svgLine[0][1]} ` +
            svgLine
              .slice(1)
              .map((p) => `L ${p[0]} ${p[1]}`)
              .join(" ")
          : "";

      rendered.push({
        id,
        type: featType,
        source,
        surveyNumber,
        areaSqM,
        perimeterM,
        geometryType: "LineString",
        svgPaths: [d],
        rings: [svgLine],
        properties,
        rawFeature: feature,
      });
    }
  }

  return { features: rendered, bbox, isPixel };
}

/**
 * Calculate polygon area in square meters.
 * For UTM coordinates (EPSG:32643), 1 unit = 1 meter.
 * For Huzur pixel-space coordinates, converts pixel area using calibrated GSD factor (0.2 m²/px²).
 */
export function calculatePolygonArea(coordinates: [number, number][], isPixel = false): number {
  if (!coordinates || coordinates.length < 3) return 0;
  let area = 0;
  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i][0] * coordinates[j][1];
    area -= coordinates[j][0] * coordinates[i][1];
  }
  const rawArea = Math.abs(area / 2.0);
  const finalArea = isPixel ? rawArea * 0.2 : rawArea;
  return Math.round(finalArea * 10) / 10;
}

/**
 * Calculate perimeter in real meters.
 * For UTM coordinates, 1 unit = 1 meter.
 * For Huzur pixel coordinates, converts using GSD (sqrt(0.2) ≈ 0.4472 m/px).
 */
export function calculatePerimeter(coordinates: [number, number][], isPixel = false): number {
  if (!coordinates || coordinates.length < 2) return 0;
  let dist = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    dist += Math.sqrt(dx * dx + dy * dy);
  }
  const gsdLinear = Math.sqrt(0.2); // ~0.4472 m/pixel
  const finalDist = isPixel ? dist * gsdLinear : dist;
  return Math.round(finalDist * 10) / 10;
}

/**
 * Helper to update a single vertex in GeoJSON with real spatial / pixel coordinates
 */
export function updateFeatureVertexInGeoJSON(
  geojson: GeoJSONFeatureCollection,
  featureId: string,
  ringIndex: number,
  vertexIndex: number,
  newSvgPt: [number, number],
  bbox: BoundingBox,
  viewWidth = 1230,
  viewHeight = 1232,
  isPixel = false
): GeoJSONFeatureCollection {
  const newGeoPt = svgToGeoCoord(newSvgPt, bbox, viewWidth, viewHeight, isPixel);

  const updatedFeatures = geojson.features.map((ft) => {
    if (ft.id !== featureId) return ft;

    const cloned = JSON.parse(JSON.stringify(ft)) as GeoJSONFeature;
    const geom = cloned.geometry;

    if (geom.type === "Polygon") {
      if (geom.coordinates[ringIndex] && geom.coordinates[ringIndex][vertexIndex]) {
        geom.coordinates[ringIndex][vertexIndex] = newGeoPt;
        // If it's the first or last point of the ring, keep polygon closed
        if (vertexIndex === 0) {
          geom.coordinates[ringIndex][geom.coordinates[ringIndex].length - 1] = newGeoPt;
        } else if (vertexIndex === geom.coordinates[ringIndex].length - 1) {
          geom.coordinates[ringIndex][0] = newGeoPt;
        }
        // Update area and perimeter in real-world units
        const area = calculatePolygonArea(geom.coordinates[0], isPixel);
        const perim = calculatePerimeter(geom.coordinates[0], isPixel);
        if (area > 0) {
          cloned.properties.Area_sq_m = area;
        }
        if (perim > 0) {
          cloned.properties.Perimeter_m = perim;
        }
      }
    } else if (geom.type === "LineString") {
      if (geom.coordinates[vertexIndex]) {
        geom.coordinates[vertexIndex] = newGeoPt;
        const perim = calculatePerimeter(geom.coordinates, isPixel);
        cloned.properties.Perimeter_m = perim;
      }
    }

    return cloned;
  });

  return {
    ...geojson,
    features: updatedFeatures,
  };
}

/**
 * Create a new Polygon feature from user drawn SVG points
 */
export function createPolygonFromSvgPoints(
  svgPoints: [number, number][],
  bbox: BoundingBox,
  featureProps: Partial<FeatureProperties> = {},
  viewWidth = 1230,
  viewHeight = 1232,
  isPixel = false
): GeoJSONFeature {
  const geoCoords = svgPoints.map((pt) => svgToGeoCoord(pt, bbox, viewWidth, viewHeight, isPixel));
  // Ensure closed ring
  if (
    geoCoords.length > 0 &&
    (geoCoords[0][0] !== geoCoords[geoCoords.length - 1][0] ||
      geoCoords[0][1] !== geoCoords[geoCoords.length - 1][1])
  ) {
    geoCoords.push([...geoCoords[0]]);
  }

  const area = calculatePolygonArea(geoCoords, isPixel);
  const perim = calculatePerimeter(geoCoords, isPixel);
  const id = `manual_polygon_${Date.now().toString(36)}`;

  return {
    type: "Feature",
    id,
    properties: {
      type: featureProps.type || "parcel",
      source: "Manual Edit",
      survey_number: `SV-MN-${Math.floor(100 + Math.random() * 900)}`,
      Area_sq_m: area,
      Perimeter_m: perim,
      LADM_Standard: "ISO 19152:2012",
      LADM_Class: "LA_SpatialUnit_Parcel",
      ...featureProps,
    },
    geometry: {
      type: "Polygon",
      coordinates: [geoCoords],
    },
  };
}

/**
 * Create a new LineString feature from user drawn SVG points
 */
export function createLineFromSvgPoints(
  svgPoints: [number, number][],
  bbox: BoundingBox,
  featureProps: Partial<FeatureProperties> = {},
  viewWidth = 1230,
  viewHeight = 1232,
  isPixel = false
): GeoJSONFeature {
  const geoCoords = svgPoints.map((pt) => svgToGeoCoord(pt, bbox, viewWidth, viewHeight, isPixel));
  const id = `manual_line_${Date.now().toString(36)}`;
  const perim = calculatePerimeter(geoCoords, isPixel);

  return {
    type: "Feature",
    id,
    properties: {
      type: featureProps.type || "road",
      source: "Manual Edit",
      survey_number: `RD-MN-${Math.floor(100 + Math.random() * 900)}`,
      Area_sq_m: 0,
      Perimeter_m: perim,
      LADM_Standard: "ISO 19152:2012",
      LADM_Class: "LA_SpatialUnit_Road",
      ...featureProps,
    },
    geometry: {
      type: "LineString",
      coordinates: geoCoords,
    },
  };
}

/**
 * Dynamically calculates the area and perimeter of a GeoJSON Feature
 */
export function calculateFeatureMetrics(feature: GeoJSONFeature, isPixelSpace: boolean = true) {
  let area = 0;
  let perimeter = 0;
  
  if (!feature || !feature.geometry) return { area: 0, perimeter: 0 };

  const { type, coordinates } = feature.geometry;

  if (type === "Polygon") {
    area += calculatePolygonArea(coordinates[0], isPixelSpace);
    for (let i = 1; i < coordinates.length; i++) {
      area -= calculatePolygonArea(coordinates[i], isPixelSpace);
    }
    for (let i = 0; i < coordinates.length; i++) {
      perimeter += calculatePerimeter(coordinates[i], isPixelSpace);
    }
  } else if (type === "MultiPolygon") {
    for (const poly of coordinates) {
      area += calculatePolygonArea(poly[0], isPixelSpace);
      for (let i = 1; i < poly.length; i++) {
        area -= calculatePolygonArea(poly[i], isPixelSpace);
      }
      for (let i = 0; i < poly.length; i++) {
        perimeter += calculatePerimeter(poly[i], isPixelSpace);
      }
    }
  } else if (type === "LineString") {
    perimeter += calculatePerimeter(coordinates, isPixelSpace);
  }

  return {
    area: Math.abs(area),
    perimeter,
  };
}
