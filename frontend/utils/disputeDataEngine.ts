import { GeoJSONFeatureCollection, GeoJSONFeature } from '../lib/geometry';
import { generateCadastralDossier } from '../lib/cadastralRegistry';

export interface DisputeCase {
  dispute_id: string;
  khasra_no: string;
  ulpin: string;
  complainant: string;
  respondent: string;
  tenure_class: string;
  category: "Road RoW Encroachment" | "Waterbody Buffer Breach" | "Plinth Line Discrepancy" | "Unrecorded Vertical Extension";
  disputed_area_sqm: number;
  max_lateral_offset_m: number;
  statutory_deadline_day: number;
  hearing_status: "HEARING_SCHEDULED" | "UNDER_FIELD_INQUIRY" | "NOTICE_DISPATCHED" | "MUTATION_SANCTIONED" | "DISPOSED";
  ai_geometry: GeoJSONFeature["geometry"];
  claimed_geometry: GeoJSONFeature["geometry"];
}

export function extractDisputesFromGeoJSON(data: GeoJSONFeatureCollection | null): DisputeCase[] {
  if (!data || !data.features) return [];
  
  const disputes: DisputeCase[] = [];
  
  data.features.forEach((feature, index) => {
    const props = feature.properties;
    if (!props) return;
    
    // Check if feature is flagged
    if (props.topology_status !== 'PASS' || props.encroachment_flag === true || (props.unassessed_sqm && props.unassessed_sqm > 0)) {
      
      const featureId = String(feature.id || `unknown-${index}`);
      const currentType = props.type || "parcel";
      const dossier = generateCadastralDossier(featureId, currentType, 0);

      const khasraNo = dossier.khasraNo || props.khasra_no || `Unknown-${index}`;
      let category: DisputeCase["category"] = "Plinth Line Discrepancy";
      let respondent = "Adjacent Freehold Title Holder";
      
      if (props.type === "road" || (props.overlap_area_sqm && props.overlap_area_sqm > 10)) {
        category = "Road RoW Encroachment";
        respondent = "MP PWD / Bhopal Municipal Corporation";
      } else if (props.type === "water") {
        category = "Waterbody Buffer Breach";
        respondent = "Water Resources Dept.";
      } else if (props.unassessed_sqm && props.unassessed_sqm > 0) {
        category = "Unrecorded Vertical Extension";
      }

      // Synthesize a claimed geometry by slightly offsetting the AI geometry for demo purposes
      let claimedGeometry = JSON.parse(JSON.stringify(feature.geometry));
      if (claimedGeometry.type === "Polygon" && claimedGeometry.coordinates && claimedGeometry.coordinates[0]) {
         claimedGeometry.coordinates[0] = claimedGeometry.coordinates[0].map((coord: number[]) => [coord[0] + 0.00001, coord[1] + 0.00001]);
      }

      const dispute: DisputeCase = {
        dispute_id: "DISP-2026-HZR-" + khasraNo.toString().replace('/', '-') + "-" + index,
        khasra_no: khasraNo.toString(),
        ulpin: "MP23HZR" + khasraNo.toString().replace(/[^a-zA-Z0-9]/g, '') + "004X",
        complainant: dossier.ownerName || props.title_holder || "Unknown Title Holder",
        respondent,
        tenure_class: dossier.tenureType || props.tenure_class || "Bhumiswami",
        category,
        disputed_area_sqm: props.overlap_area_sqm || props.unassessed_sqm || 18.4,
        max_lateral_offset_m: props.overlap_area_sqm ? parseFloat((props.overlap_area_sqm / 10).toFixed(1)) : 1.2,
        statutory_deadline_day: 18,
        hearing_status: index % 2 === 0 ? "HEARING_SCHEDULED" : "NOTICE_DISPATCHED",
        ai_geometry: feature.geometry,
        claimed_geometry: claimedGeometry,
      };
      
      disputes.push(dispute);
    }
  });
  
  return disputes;
}
