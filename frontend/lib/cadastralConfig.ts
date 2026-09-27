/**
 * Cadastral and Administrative PMTiles Configuration for TerraMap AI
 * 
 * Verified against real PMTiles metadata:
 * - india_states.pmtiles (Layer: LGD_States)
 * - india_districts.pmtiles (Layer: LGD_Districts)
 * - lgd_subdistricts.pmtiles (Layer: LGD_Subdistricts)
 * - lgd_villages.pmtiles (Layer: LGD_Villages)
 * - MRSAC_Cadastrals.pmtiles (Layer: MRSAC_Cadastrals)
 * - MPBhulekh_MP_Plot_Cadastrals.pmtiles (Layer: MPBhulekh_MP_Plot_Cadastrals)
 */

export interface CadastralDatasetConfig {
  stateName: string;
  subdistrictLabel: "Taluka" | "Tehsil";
  pmtilesUrl: string;
  sourceLayer: string;
  minZoom: number;
  maxZoom: number;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  center: [number, number]; // [lon, lat]
  defaultZoom: number;
  idField: string;
  parcelNoField: string;
  districtCodeField: string;
  districtNameField: string;
  subdistrictCodeField: string;
  subdistrictNameField: string;
  villageCodeField: string;
  villageNameField: string;
  displayFields: { key: string; label: string; format?: (val: unknown) => string }[];
}

export const CADASTRAL_DATASETS: Record<string, CadastralDatasetConfig> = {
  MAHARASHTRA: {
    stateName: "MAHARASHTRA",
    subdistrictLabel: "Taluka",
    pmtilesUrl: "pmtiles:///data/MRSAC_Cadastrals.pmtiles",
    sourceLayer: "MRSAC_Cadastrals",
    minZoom: 0,
    maxZoom: 13,
    bounds: [72.646628, 15.605867, 80.898365, 22.029824],
    center: [75.713888, 19.75148],
    defaultZoom: 7,
    idField: "OBJECTID",
    parcelNoField: "PIN",
    districtCodeField: "DTNCODE",
    districtNameField: "DTENAME",
    subdistrictCodeField: "THNCODE",
    subdistrictNameField: "THENAME",
    villageCodeField: "VINCODE",
    villageNameField: "VIL_NAME",
    displayFields: [
      { key: "PIN", label: "Cadastral / Parcel Identifier (PIN)" },
      { key: "CCODE", label: "Cadastral Code (CCODE)" },
      { key: "OBJECTID", label: "Feature Object ID" },
      { key: "DTENAME", label: "District Name" },
      { key: "DTNCODE", label: "District Code" },
      { key: "THENAME", label: "Taluka Name" },
      { key: "THNCODE", label: "Taluka Code" },
      { key: "VIL_NAME", label: "Village Name" },
      { key: "VINCODE", label: "Village Code" },
      { key: "REMARK", label: "Official Remarks" },
    ],
  },
  "MADHYA PRADESH": {
    stateName: "MADHYA PRADESH",
    subdistrictLabel: "Tehsil",
    pmtilesUrl: "pmtiles:///data/MPBhulekh_MP_Plot_Cadastrals.pmtiles",
    sourceLayer: "MPBhulekh_MP_Plot_Cadastrals",
    minZoom: 0,
    maxZoom: 14,
    bounds: [74.064974, 21.110412, 82.804519, 26.788811],
    center: [77.412815, 23.259933],
    defaultZoom: 7,
    idField: "parcel_id",
    parcelNoField: "parcel_no",
    districtCodeField: "district_lgd_code",
    districtNameField: "district_name_en",
    subdistrictCodeField: "tehsil_lgd_code",
    subdistrictNameField: "tehsil_name_en",
    villageCodeField: "village_lgd_code",
    villageNameField: "village_name_en",
    displayFields: [
      { key: "parcel_no", label: "Parcel Number / Khasra" },
      { key: "parcel_id", label: "Internal Parcel ID" },
      { key: "ulpin", label: "Unique Land Parcel ID (ULPIN)" },
      { key: "parcel_type", label: "Parcel Type" },
      { key: "district_name_en", label: "District (EN)" },
      { key: "district_name_hi", label: "District (HI)" },
      { key: "tehsil_name_en", label: "Tehsil (EN)" },
      { key: "tehsil_name_hi", label: "Tehsil (HI)" },
      { key: "village_name_en", label: "Village (EN)" },
      { key: "village_name_hi", label: "Village (HI)" },
      { key: "land_type_id", label: "Land Type Code" },
      { key: "landuse_id", label: "Land Use Code" },
      { key: "district_lgd_code", label: "District LGD Code" },
      { key: "tehsil_lgd_code", label: "Tehsil LGD Code" },
      { key: "village_lgd_code", label: "Village LGD Code" },
    ],
  },
};

export interface AdminEntity {
  name: string;
  code: string; // e.g. STCODE11, dtcode11, sdtcode11, vilcode11
  lgd?: number; // e.g. State_LGD, dist_lgd, subdt_lgd, vil_lgd
  parentCode?: string; // parent relationship code
}

export type AdminOption = AdminEntity;

export interface AdministrativeHierarchyIndexed {
  states: AdminEntity[];
  districtsByState: Record<string, AdminEntity[]>; // key: stcode11
  subdistrictsByDistrict: Record<string, AdminEntity[]>; // key: dtcode11
  villagesBySubdistrict: Record<string, AdminEntity[]>; // key: sdtcode11
}

export type AdministrativeSelection = {
  state?: AdminEntity | null;
  district?: AdminEntity | null;
  subdistrict?: AdminEntity | null;
  village?: AdminEntity | null;
};

export type FeatureType = "PARCEL" | "ROAD" | "BUILDING" | "WATER" | "WATERWAY";

export type SelectedParcel = {
  source: "Maharashtra" | "Madhya Pradesh" | "Generic" | string;
  properties: Record<string, unknown>;
  layerId: string;
  featureType?: FeatureType;
  title?: string;
  geometry?: any;
};
