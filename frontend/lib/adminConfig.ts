/**
 * Administrative Configuration and Cascading Helpers for TerraMap AI Page 2
 * 
 * Enforces strict parent-child administrative hierarchy based on authoritative
 * LGD/Census 2011 code relationships from:
 * - india_states.pmtiles (STCODE11, State_LGD)
 * - india_districts.pmtiles (dtcode11, dist_lgd, stcode11, state_lgd)
 * - lgd_subdistricts.pmtiles (sdtcode11, subdt_lgd, dtcode11, dist_lgd)
 * - lgd_villages.pmtiles (vilcode11, vil_lgd, sdtcode11, dtcode11)
 */
import { AdministrativeHierarchyIndexed, AdminEntity } from "./cadastralConfig";

let cachedIndexedRegistry: AdministrativeHierarchyIndexed | null = null;
let cachedDistrictCentroids: Record<string, [number, number]> | null = null;
let cachedSubdistrictCentroids: Record<string, [number, number]> | null = null;
let cachedVillageCentroids: Record<string, [number, number]> | null = null;

export async function fetchAdminHierarchyIndexed(): Promise<AdministrativeHierarchyIndexed> {
  if (cachedIndexedRegistry) return cachedIndexedRegistry;
  try {
    const res = await fetch("/data/admin_hierarchy_indexed.json");
    if (res.ok) {
      cachedIndexedRegistry = await res.json();
      return cachedIndexedRegistry!;
    }
  } catch (e) {
    console.error("[TerraMap] Failed to load admin_hierarchy_indexed.json:", e);
  }

  return {
    states: [
      { name: "MAHARASHTRA", code: "27", lgd: 27 },
      { name: "MADHYA PRADESH", code: "23", lgd: 23 },
    ],
    districtsByState: {
      "27": [{ name: "Latur", code: "524", lgd: 481, parentCode: "27" }],
      "23": [{ name: "Bhopal", code: "437", lgd: 398, parentCode: "23" }],
    },
    subdistrictsByDistrict: {
      "524": [{ name: "Shirur-Anantpal", code: "04231", lgd: 4231, parentCode: "524" }],
      "437": [{ name: "Huzur", code: "03530", lgd: 3530, parentCode: "437" }],
    },
    villagesBySubdistrict: {
      "04231": [{ name: "Aari", code: "560571", lgd: 560571, parentCode: "04231" }],
    },
  };
}

export async function getDistrictCentroid(code: string): Promise<[number, number] | null> {
  if (!cachedDistrictCentroids) {
    try {
      const res = await fetch("/data/district_centroids.json");
      if (res.ok) cachedDistrictCentroids = await res.json();
    } catch (e) {
      console.warn("Could not load district centroids:", e);
    }
  }
  return cachedDistrictCentroids?.[code] || null;
}

export async function getSubdistrictCentroid(code: string): Promise<[number, number] | null> {
  if (!cachedSubdistrictCentroids) {
    try {
      const res = await fetch("/data/subdistrict_centroids.json");
      if (res.ok) cachedSubdistrictCentroids = await res.json();
    } catch (e) {
      console.warn("Could not load subdistrict centroids:", e);
    }
  }
  return cachedSubdistrictCentroids?.[code] || null;
}

export async function getVillageCentroid(code: string): Promise<[number, number] | null> {
  if (!cachedVillageCentroids) {
    try {
      const res = await fetch("/data/village_centroids.json");
      if (res.ok) cachedVillageCentroids = await res.json();
    } catch (e) {
      console.warn("Could not load village centroids:", e);
    }
  }
  return cachedVillageCentroids?.[code] || null;
}

/**
 * Return all states across India
 */
export function getStateList(registry: AdministrativeHierarchyIndexed): AdminEntity[] {
  return registry.states || [];
}

/**
 * Return ONLY districts belonging to the selected state using strict stcode11 match
 */
export function getDistrictsForState(
  registry: AdministrativeHierarchyIndexed,
  state: AdminEntity | null | undefined
): AdminEntity[] {
  if (!state || !state.code) return [];
  const list = registry.districtsByState[state.code];
  if (!list) return [];
  return list;
}

/**
 * Return ONLY subdistricts/talukas belonging to the selected district using strict dtcode11 match
 */
export function getSubdistrictsForDistrict(
  registry: AdministrativeHierarchyIndexed,
  district: AdminEntity | null | undefined
): AdminEntity[] {
  if (!district || !district.code) return [];
  const list = registry.subdistrictsByDistrict[district.code];
  if (!list) return [];
  return list;
}

/**
 * Return ONLY villages belonging to the selected subdistrict using strict sdtcode11 match
 */
export function getVillagesForSubdistrict(
  registry: AdministrativeHierarchyIndexed,
  subdistrict: AdminEntity | null | undefined
): AdminEntity[] {
  if (!subdistrict || !subdistrict.code) return [];
  const list = registry.villagesBySubdistrict[subdistrict.code];
  if (!list) return [];
  return list;
}
