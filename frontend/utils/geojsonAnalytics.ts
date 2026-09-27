import { GeoJSONFeatureCollection } from '../lib/geometry';

export interface EnrichedCadastralFeature {
  id: string;
  type: 'Feature';
  geometry: any;
  properties: {
    type?: string;
    khasra_no?: string;
    survey_number?: string;
    title_holder?: string;
    tenure_class?: string;
    primary_land_use?: string;
    floors_dsm?: string;
    unassessed_sqm?: number;
    recoverable_tax_inr?: number;
    topology_status?: string;
    encroachment_flag?: boolean;
    overlap_area_sqm?: string | number;
    overlap_description?: string;
    Area_sq_m?: number;
    [key: string]: any;
  };
}

export interface DashboardAnalyticsSummary {
  totalSurveyedAreaFormatted: string;
  parcelsAndUnits: number;
  topologyPassRateFormatted: string;
  flaggedEncroachments: number;
  recoverableTaxFormatted: string;
  
  // New Urban Density
  builtUpPercentage: number;
  builtUpAreaSqm: number;

  landUseDistribution: { name: string; count: number; fill: string }[];
  floorDistribution: { name: string; structures: number; unassessedSqm: number }[];
  complianceDistribution: { name: string; count: number; fill: string }[];
  plinthDistribution: { name: string; count: number; totalArea: number; fill: string }[];
  waterfallData: { name: string; value: number; fill: string; total?: boolean }[];
  
  actionQueue: EnrichedCadastralFeature[];
}

export function parseGeoJSONAnalytics(geojson: GeoJSONFeatureCollection): DashboardAnalyticsSummary {
  if (!geojson || !geojson.features) {
    return {
      totalSurveyedAreaFormatted: "0 Ha",
      parcelsAndUnits: 0,
      topologyPassRateFormatted: "0%",
      flaggedEncroachments: 0,
      recoverableTaxFormatted: "₹0",
      builtUpPercentage: 0,
      builtUpAreaSqm: 0,
      landUseDistribution: [],
      floorDistribution: [],
      complianceDistribution: [],
      plinthDistribution: [],
      waterfallData: [],
      actionQueue: [],
    };
  }

  const features = geojson.features as EnrichedCadastralFeature[];

  // 1. Total Surveyed Area
  const totalAreaHa = (features.reduce((acc, f) => acc + (Number(f.properties.Area_sq_m) || 0), 0) / 10000).toFixed(2) + " Ha";

  // 2. Parcels & Units Mapped
  const parcelsAndUnits = features.filter(f => f.properties.type === 'parcel' || f.properties.type === 'building').length;

  // 3. Zero-Topology Pass Rate
  const topologyPassRate = ((features.filter(f => f.properties.topology_status === 'PASS').length / Math.max(features.length, 1)) * 100).toFixed(1) + "%";

  // 4. Flagged Encroachments
  const flaggedEncroachments = features.filter(f => f.properties.encroachment_flag === true).length;

  // 5. Recoverable Tax Base
  const totalTax = features.reduce((acc, f) => acc + (Number(f.properties.recoverable_tax_inr) || 0), 0);
  let recoverableTaxFormatted = `₹${totalTax.toLocaleString()}`;
  if (totalTax >= 10000000) {
    recoverableTaxFormatted = `₹${(totalTax / 10000000).toFixed(2)} Cr`;
  } else if (totalTax >= 100000) {
    recoverableTaxFormatted = `₹${(totalTax / 100000).toFixed(1)} L`;
  }

  // Charts
  const landUseMap: Record<string, number> = {};
  const floorMap: Record<string, { structures: number; unassessedSqm: number }> = {};
  const complianceMap: Record<string, number> = {};
  const plinthMap = {
    'Micro (< 50 m²)': { count: 0, totalArea: 0 },
    'Medium (50 - 150 m²)': { count: 0, totalArea: 0 },
    'Large (150 - 300 m²)': { count: 0, totalArea: 0 },
    'Commercial (> 300 m²)': { count: 0, totalArea: 0 }
  };

  let totalBuildingArea = 0;

  features.forEach(f => {
    const p = f.properties;
    
    // Land-Use
    const lu = p.primary_land_use || 'Unknown';
    landUseMap[lu] = (landUseMap[lu] || 0) + 1;

    // Floor Density
    const fl = p.floors_dsm || 'N/A';
    if (!floorMap[fl]) floorMap[fl] = { structures: 0, unassessedSqm: 0 };
    floorMap[fl].structures++;
    floorMap[fl].unassessedSqm += Number(p.unassessed_sqm) || 0;

    // Compliance
    const ts = p.topology_status || 'PASS';
    complianceMap[ts] = (complianceMap[ts] || 0) + 1;

    // Plinth Footprints & Slabs
    if (p.type === 'building') {
      const area = Number(p.Area_sq_m) || 0;
      totalBuildingArea += area;

      if (area < 50) {
        plinthMap['Micro (< 50 m²)'].count++;
        plinthMap['Micro (< 50 m²)'].totalArea += area;
      } else if (area <= 150) {
        plinthMap['Medium (50 - 150 m²)'].count++;
        plinthMap['Medium (50 - 150 m²)'].totalArea += area;
      } else if (area <= 300) {
        plinthMap['Large (150 - 300 m²)'].count++;
        plinthMap['Large (150 - 300 m²)'].totalArea += area;
      } else {
        plinthMap['Commercial (> 300 m²)'].count++;
        plinthMap['Commercial (> 300 m²)'].totalArea += area;
      }
    }
  });

  const totalAreaSqm = features.reduce((acc, f) => acc + (Number(f.properties.Area_sq_m) || 0), 0);
  const builtUpPercentage = totalAreaSqm > 0 ? (totalBuildingArea / totalAreaSqm) * 100 : 0;

  const landUseColors: Record<string, string> = {
    'Pure Residential': '#3b82f6',
    'Commercial Retail': '#8b5cf6',
    'Mixed Residential-Commercial': '#f59e0b',
    'Transportation Corridor (RoW)': '#64748b',
    'Protected Riparian Buffer': '#0ea5e9',
    'Vacant Residential Plot': '#10b981'
  };

  const landUseDistribution = Object.entries(landUseMap).map(([name, count]) => ({
    name,
    count,
    fill: landUseColors[name] || '#94a3b8'
  }));

  // Only keep G Storey, G+1, G+2
  const floorDistribution = ['G Storey', 'G+1 Storey', 'G+2 Storey'].map(name => ({
    name,
    structures: floorMap[name]?.structures || 0,
    unassessedSqm: floorMap[name]?.unassessedSqm || 0
  }));

  const complianceColors: Record<string, string> = {
    'PASS': '#10b981',
    'FAIL — SETBACK VIOLATION': '#f59e0b',
    'FAIL — OVERLAPS ADJACENT STRUCTURE': '#ef4444'
  };

  const complianceDistribution = Object.entries(complianceMap).map(([name, count]) => ({
    name,
    count,
    fill: complianceColors[name] || '#64748b'
  }));

  const plinthColors = ['#94a3b8', '#818cf8', '#6366f1', '#4338ca'];
  const plinthDistribution = Object.entries(plinthMap).map(([name, data], idx) => ({
    name,
    count: data.count,
    totalArea: data.totalArea,
    fill: plinthColors[idx]
  }));

  // Waterfall
  const legacyBase = 1840000;
  const ndsmBase = totalTax;
  const plinthDelta = 140000;
  const auditedTotal = legacyBase + ndsmBase + plinthDelta;

  const waterfallData = [
    { name: 'Legacy Assessed Base', value: legacyBase, fill: '#64748b' },
    { name: '+ nDSM Vertical Slabs', value: ndsmBase, fill: '#10b981' },
    { name: '+ Plinth Base Delta', value: plinthDelta, fill: '#10b981' },
    { name: 'Realizable Revenue', value: auditedTotal, fill: '#1e293b', total: true }
  ];

  // Table Queue
  const actionQueue = features.filter(f => f.properties.topology_status !== 'PASS' || f.properties.encroachment_flag === true || (Number(f.properties.unassessed_sqm) || 0) > 0);

  return {
    totalSurveyedAreaFormatted: totalAreaHa,
    parcelsAndUnits,
    topologyPassRateFormatted: topologyPassRate,
    flaggedEncroachments,
    recoverableTaxFormatted,
    builtUpPercentage,
    builtUpAreaSqm: totalBuildingArea,
    landUseDistribution,
    floorDistribution,
    complianceDistribution,
    plinthDistribution,
    waterfallData,
    actionQueue
  };
}
