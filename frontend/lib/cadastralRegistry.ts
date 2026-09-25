export interface CadastralDossier {
  khasraNo: string;
  technicalId: string;
  ladmClass: string;
  ownerName: string;
  tenureType: string;
  landUse: string;
  zoningStatus: {
    status: 'conforming' | 'deviation' | 'buffer_violation';
    title: string;
    description: string;
  };
  dsmElevation: {
    meanRoofAmsl: number;
    terrainBaseAmsl: number;
    structureHeightAgl: number;
    estimatedStoreys: string;
  };
  topologyAudit: {
    mustNotOverlap: 'PASS' | 'FAIL';
    noGapsSlivers: 'PASS' | 'FAIL';
    closedBoundary: 'PASS' | 'FAIL';
    overlapDetails?: string;
  };
  groundTruthing: {
    corsStationId: string;
    corsDistanceM: number;
    rmseHorizontalCm: number;
    rmseVerticalCm: number;
    fieldStatus: 'Verified (Phase 1)' | 'Audit Pending (Phase 2)' | 'Statutory Protection';
    checklist: {
      orthoAligned: boolean;
      dsmHeightExtruded: boolean;
      groundPegsVerified: boolean;
      rorRegistrySigned: boolean;
    };
  };
}

// Seeded string hash for deterministic generation
function pseudoHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateCadastralDossier(
  featureId: string, 
  featureType: string = 'building', 
  calculatedAreaM2: number = 0
): CadastralDossier {
  const hash = pseudoHash(featureId);

  // Dedicated Water Body Handler
  if (featureType.toLowerCase().includes('water') || featureId.toLowerCase().includes('water')) {
    return {
      khasraNo: `Wetland Parcel #${(hash % 10) + 1}`,
      technicalId: featureId,
      ladmClass: 'LA_SpatialUnit_Water',
      ownerName: 'State Revenue Department & Bhopal Municipal Corp',
      tenureType: 'Statutory Public Water Body (Nazul)',
      landUse: 'Ecological Water Body Buffer Zone',
      zoningStatus: {
        status: 'buffer_violation',
        title: 'NGT Statutory 30m Green Buffer',
        description: 'No development / construction zone under Bhopal Master Plan 2031.'
      },
      dsmElevation: {
        meanRoofAmsl: 494.20,
        terrainBaseAmsl: 494.20,
        structureHeightAgl: 0.00,
        estimatedStoreys: 'N/A (Water Reservoir)'
      },
      topologyAudit: {
        mustNotOverlap: 'PASS',
        noGapsSlivers: 'PASS',
        closedBoundary: 'PASS'
      },
      groundTruthing: {
        corsStationId: 'CORS-MP-BHP-02 (Datum)',
        corsDistanceM: 85,
        rmseHorizontalCm: 2.1,
        rmseVerticalCm: 3.4,
        fieldStatus: 'Statutory Protection',
        checklist: {
          orthoAligned: true,
          dsmHeightExtruded: true,
          groundPegsVerified: true,
          rorRegistrySigned: true
        }
      }
    };
  }

  // Dedicated Road Corridor Handler
  if (featureType.toLowerCase().includes('road') || featureId.toLowerCase().includes('road')) {
    const terrainElev = Number((496.0 + (hash % 100) / 10).toFixed(2));
    return {
      khasraNo: `Street Corridor PWD-R${(hash % 50) + 1}`,
      technicalId: featureId,
      ladmClass: 'LA_SpatialUnit_Transport',
      ownerName: 'Public Works Department (State Govt)',
      tenureType: 'Statutory Right of Way (RoW)',
      landUse: 'Public Circulation / Transport',
      zoningStatus: {
        status: 'conforming',
        title: 'Master Plan 2031: Circulation',
        description: 'Statutory street alignment. No structural deviations detected.'
      },
      dsmElevation: {
        meanRoofAmsl: terrainElev,
        terrainBaseAmsl: terrainElev,
        structureHeightAgl: 0.00,
        estimatedStoreys: 'N/A (Surface Infrastructure)'
      },
      topologyAudit: {
        mustNotOverlap: 'PASS',
        noGapsSlivers: 'PASS',
        closedBoundary: 'PASS'
      },
      groundTruthing: {
        corsStationId: 'CORS-MP-BHP-04 (Datum)',
        corsDistanceM: 45 + (hash % 40),
        rmseHorizontalCm: 1.5,
        rmseVerticalCm: 2.2,
        fieldStatus: 'Verified (Phase 1)',
        checklist: {
          orthoAligned: true,
          dsmHeightExtruded: true,
          groundPegsVerified: true,
          rorRegistrySigned: true
        }
      }
    };
  }

  // Pre-configured Owners List
  const owners = [
    'Rajeshwar Rao & Smt. Sunita Rao',
    'Anil Kumar Verma',
    'Mahesh Chandra Joshi',
    'Dr. Alok Nath Pathak',
    'Vikramaditya Shinde',
    'Kavita Bai w/o Harishankar',
    'Pramod Narayan Sharma',
    'Mohammad Farooq Khan',
    'Digvijay Singh Chauhan'
  ];

  const ownerName = owners[hash % owners.length];
  const khasraPrimary = 120 + (hash % 30);
  const khasraSub = (hash % 6) + 1;
  const khasraNo = `Khasra No. ${khasraPrimary}/${khasraSub}`;

  // Deterministic Land-Use & Deviation Profile
  const isMixedCommercial = hash % 4 === 0;
  const isDeviation = hash % 3 === 0;

  const landUse = isMixedCommercial 
    ? 'Mixed Residential-Commercial (G+2 Storey)'
    : hash % 2 === 0 
      ? 'Pure Residential (G+1 Storey)' 
      : 'Pure Residential (G+2 Storey)';

  const zoningStatus = isMixedCommercial
    ? {
        status: 'deviation' as const,
        title: 'Master Plan 2031: Zone R-2',
        description: `Commercial Deviation Detected: +${((hash % 20) + 12).toFixed(1)} m² unauthorized retail shopfront.`
      }
    : {
        status: 'conforming' as const,
        title: 'Master Plan 2031: Zone R-1',
        description: '100% Conforming to Zonal Setback & Land-Use Regulations.'
      };

  // DSM Elevation Math
  const terrainBaseAmsl = Number((496.0 + (hash % 100) / 10).toFixed(2));
  const structureHeightAgl = Number((3.2 + (hash % 55) / 10).toFixed(2));
  const meanRoofAmsl = Number((terrainBaseAmsl + structureHeightAgl).toFixed(2));
  const estimatedStoreys = structureHeightAgl > 6.0 ? 'G + 2 Floors' : structureHeightAgl > 3.6 ? 'G + 1 Floor' : 'Ground Floor Only';

  // Ground Truthing CORS Metrics
  const corsDistanceM = (hash % 220) + 40;
  const rmseHorizontalCm = Number((2.8 + (hash % 18) / 10).toFixed(1));
  const rmseVerticalCm = Number((3.9 + (hash % 22) / 10).toFixed(1));
  const isVerifiedPhase1 = hash % 5 !== 0;

  return {
    khasraNo,
    technicalId: featureId,
    ladmClass: 'LA_SpatialUnit_Building',
    ownerName,
    tenureType: hash % 7 === 0 ? 'Government Nazul Leasehold' : 'Bhumiswami (Private Freehold)',
    landUse,
    zoningStatus,
    dsmElevation: {
      meanRoofAmsl,
      terrainBaseAmsl,
      structureHeightAgl,
      estimatedStoreys
    },
    topologyAudit: {
      mustNotOverlap: isDeviation ? 'FAIL' : 'PASS',
      noGapsSlivers: 'PASS',
      closedBoundary: 'PASS',
      overlapDetails: isDeviation ? 'Intersects Road ROW Corridor by 1.2m' : undefined
    },
    groundTruthing: {
      corsStationId: 'CORS-MP-BHP-04',
      corsDistanceM,
      rmseHorizontalCm,
      rmseVerticalCm,
      fieldStatus: isVerifiedPhase1 ? 'Verified (Phase 1)' : 'Audit Pending (Phase 2)',
      checklist: {
        orthoAligned: true,
        dsmHeightExtruded: true,
        groundPegsVerified: hash % 2 === 0,
        rorRegistrySigned: isVerifiedPhase1
      }
    }
  };
}
