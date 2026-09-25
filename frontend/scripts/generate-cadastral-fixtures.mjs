import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import proj4 from 'proj4';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendRoot = path.resolve(__dirname, '..');
const datasetPath = path.join(frontendRoot, 'public', 'data', 'cadastre_dataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

proj4.defs('EPSG:32643', '+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

function utmToWgs84(coord) {
  const [x, y] = coord;
  if (x >= -180 && x <= 180 && y >= -90 && y <= 90) return [x, y];
  const [lng, lat] = proj4('EPSG:32643', 'EPSG:4326', [x, y]);
  return [Math.round(lng * 1000000) / 1000000, Math.round(lat * 1000000) / 1000000];
}

const mapping = {
  '08-412-A': { tile: '00_00', area: 1248.3, ror: 'KH-782/2023', type: 'Agricultural / Semi-Urban', coOwners: ['Rameshwar P. (50%)', 'Sunita Bai (50%)'], rev: '₹ 1,420 / annum', soil: 'Medium Black (Kali-2)', mort: 'Unencumbered', ulpin: '4829100841201A', alert: 'ROW_OVERLAP', alertDetails: 'Parcel intersects the statutory 15m Road Right-of-Way (ROW) corridor.' },
  '08-412-B': { tile: '00_03', area: 864.5, ror: 'KH-783/2023', type: 'Residential / Homestead', coOwners: ['Devendra Verma (100%)'], rev: '₹ 2,150 / annum', soil: 'Alluvial Silty', mort: 'Under Dispute', ulpin: '4829100841202B', alert: 'DISPUTE', alertDetails: 'Flagged boundary dispute under Section 129 MP Land Revenue Code.' },
  '08-412-C': { tile: '00_05', area: 1540.2, ror: 'KH-784/2023', type: 'Agricultural Irrigated', coOwners: ['Kamla Devi (100%)'], rev: '₹ 980 / annum', soil: 'Deep Black Clayey', mort: 'Unencumbered', ulpin: '4829100841203C', alert: 'NONE' },
  '08-412-D': { tile: '00_06', area: 2110.0, ror: 'KH-785/2023', type: 'Commercial / Warehouse', coOwners: ['Bhopal Agro Logistics Ltd.'], rev: '₹ 5,800 / annum', soil: 'Constructed Mixed', mort: 'Mortgaged to Bank', ulpin: '4829100841204D', alert: 'NONE' },
  '08-412-E': { tile: '00_08', area: 950.4, ror: 'KH-786/2023', type: 'Riparian / Wetland Buffer', coOwners: ['Madhya Pradesh State Revenue Dept.'], rev: '₹ 0 (Government)', soil: 'Riverine Silt', mort: 'Unencumbered', ulpin: '4829100841205E', alert: 'WATER_BUFFER', alertDetails: 'Parcel intersects the 30m NGT statutory water-body buffer envelope.' },
  '08-412-F': { tile: '00_09', area: 1320.0, ror: 'KH-787/2023', type: 'Agricultural Single Crop', coOwners: ['Harishankar Sharma (100%)'], rev: '₹ 1,120 / annum', soil: 'Medium Black', mort: 'Unencumbered', ulpin: '4829100841206F', alert: 'NONE' },
  '08-412-G': { tile: '00_11', area: 720.6, ror: 'KH-788/2023', type: 'Residential Abadi', coOwners: ['Mohd. Imran (50%)', 'Zubair Ahmed (50%)'], rev: '₹ 1,750 / annum', soil: 'Red Gravel Mixed', mort: 'Unencumbered', ulpin: '4829100841207G', alert: 'NONE' },
  '08-412-H': { tile: '00_12', area: 3450.0, ror: 'KH-789/2023', type: 'Industrial Facility', coOwners: ['Kalan Precision Tools LLP'], rev: '₹ 8,400 / annum', soil: 'Engineered Subgrade', mort: 'Mortgaged to Bank', ulpin: '4829100841208H', alert: 'NONE' },
  '08-412-I': { tile: '01_01', area: 1680.0, ror: 'KH-790/2023', type: 'Orchard / Horticulture', coOwners: ['Lata Bai (100%)'], rev: '₹ 1,350 / annum', soil: 'Deep Loamy Black', mort: 'Unencumbered', ulpin: '4829100841209I', alert: 'NONE' },
  '08-412-J': { tile: '01_06', area: 1100.0, ror: 'KH-791/2023', type: 'Public Utility / Panchayat', coOwners: ['Gram Panchayat Bairagarh Kalan'], rev: '₹ 0 (Public)', soil: 'Alluvial Loam', mort: 'Unencumbered', ulpin: '4829100841210J', alert: 'NONE' },
  '08-412-K': { tile: '00_16', area: 1248.3, ror: 'KH-792/2023', type: 'AI Ortho Drone Surveyed Parcel', coOwners: ['State Land Registry / Drone Extraction'], rev: '₹ 1,420 / annum', soil: 'Medium Black (Kali-2)', mort: 'Unencumbered', ulpin: '4829100841211K', alert: 'NONE' }
};

const features = [];
const propertyCards = {};

for (const [khasraNo, info] of Object.entries(mapping)) {
  const tileGeo = dataset[info.tile];
  let geom = null;
  if (tileGeo && tileGeo.features && tileGeo.features.length > 0) {
    const origGeom = tileGeo.features[0].geometry;
    geom = {
      type: origGeom.type,
      coordinates: origGeom.coordinates.map(ring => ring.map(pt => utmToWgs84(pt)))
    };
  }

  features.push({
    type: 'Feature',
    id: `khasra_${khasraNo.replace(/-/g, '_')}`,
    properties: {
      khasra_no: khasraNo,
      khasra: khasraNo,
      khasraId: khasraNo,
      village: 'Bairagarh Kalan',
      tehsil: 'Huzur',
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      lgdCode: '482910',
      area_sq_m: info.area,
      statutoryArea: info.area,
      featureClass: info.type,
      khataNumber: info.ror,
      ulpin: info.ulpin,
      alertType: info.alert,
      alertDetails: info.alertDetails || null,
      associatedTileId: info.tile
    },
    geometry: geom
  });

  propertyCards[khasraNo] = {
    khasraNo: khasraNo,
    khasraId: khasraNo,
    khataNumber: info.ror,
    plotId: `PL-BGK-${khasraNo.replace(/-/g, '')}`,
    featureClass: info.type,
    coOwners: info.coOwners,
    annualRevenue: info.rev,
    soilClassification: info.soil,
    mortgageStatus: info.mort,
    ulpin: info.ulpin,
    statutoryArea: info.area,
    alertType: info.alert,
    alertDetails: info.alertDetails || null,
    associatedTileId: info.tile
  };
}

const parcelsGeojson = {
  type: 'FeatureCollection',
  name: 'cadastre_parcels',
  crs: { type: 'name', properties: { name: 'EPSG:4326' } },
  features: features
};

fs.writeFileSync(path.join(frontendRoot, 'public', 'data', 'cadastre_parcels.geojson'), JSON.stringify(parcelsGeojson, null, 2));
fs.writeFileSync(path.join(frontendRoot, 'public', 'data', 'property_cards_fixture.json'), JSON.stringify(propertyCards, null, 2));

// Also generate public_infrastructure.geojson for ROW (15m) and Water Buffer (30m)
const parcelA = features.find(f => f.properties.khasra_no === '08-412-A');
const parcelE = features.find(f => f.properties.khasra_no === '08-412-E');

const infraFeatures = [];
if (parcelA && parcelA.geometry) {
  infraFeatures.push({
    type: 'Feature',
    id: 'infra_road_row_15m',
    properties: {
      type: 'road_row',
      corridor_width_m: 15,
      name: 'Major District Road MDR-44 ROW Corridor',
      khasra_affected: '08-412-A'
    },
    geometry: parcelA.geometry
  });
}

if (parcelE && parcelE.geometry) {
  infraFeatures.push({
    type: 'Feature',
    id: 'infra_water_buffer_30m',
    properties: {
      type: 'water_buffer',
      buffer_width_m: 30,
      regulation: 'National Green Tribunal (NGT) Statutory Wetland Envelope',
      khasra_affected: '08-412-E'
    },
    geometry: parcelE.geometry
  });
}

const infraGeojson = {
  type: 'FeatureCollection',
  name: 'public_infrastructure',
  crs: { type: 'name', properties: { name: 'EPSG:4326' } },
  features: infraFeatures
};

fs.writeFileSync(path.join(frontendRoot, 'public', 'data', 'public_infrastructure.geojson'), JSON.stringify(infraGeojson, null, 2));

console.log('Successfully generated all fixtures in public/data/');
