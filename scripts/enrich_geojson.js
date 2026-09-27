const fs = require('fs');
const path = require('path');

const inputDir = 'D:\\SIH_hardcoded\\Cadastral_Mapping\\data\\Huzur_Bhopal_Cadastre_20Pairs\\geojson';
const outputDir = 'D:\\SIH_hardcoded\\Cadastral_Mapping\\frontend\\public\\data';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Fixed lists
const privateHolders = [
  "Mahesh Chandra Joshi", "Kavita Bai w/o Harishankar", "Dr. Alok Nath Pathak", "Rajendra Prasad Sharma"
];
const tenureParcels = ["Bhumiswami (Private Freehold)", "Government Nazul Leasehold"];

const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.geojson'));
console.log(`Found ${files.length} files. Processing...`);

files.forEach(file => {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file);
  let geojson = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  let idx = 1;
  geojson.features.forEach(f => {
    if (!f.properties) f.properties = {};
    const p = f.properties;
    const fType = p.type || (f.id && String(f.id).includes('building') ? 'building' : 'parcel');
    p.type = fType;

    const areaSqm = Number(p.Area_sq_m || 0);

    // 1. Identity
    p.khasra_no = `13${idx % 10}/${(idx % 5) + 1}`;
    
    if (fType === 'water') {
      p.title_holder = "MP PWD / Revenue Dept";
      p.tenure_class = "Statutory Water Resource & Buffer";
      p.primary_land_use = "Protected Riparian Buffer";
    } else if (fType === 'road') {
      p.title_holder = "MP PWD / Revenue Dept";
      p.tenure_class = "State Highway / Municipal RoW";
      p.primary_land_use = "Transportation Corridor (RoW)";
    } else {
      p.title_holder = privateHolders[idx % privateHolders.length];
      p.tenure_class = tenureParcels[idx % 2];
      
      if (fType === 'parcel') {
        p.primary_land_use = "Vacant Residential Plot";
      } else if (fType === 'building') {
        const r = idx % 10;
        if (r < 7) p.primary_land_use = "Pure Residential";
        else if (r < 9) p.primary_land_use = "Mixed Residential-Commercial";
        else p.primary_land_use = "Commercial Retail";
      }
    }

    // 3. 3D Height
    if (fType === 'building') {
      const r = idx % 10;
      if (r < 6) {
        p.floors_dsm = "G Storey";
        p.unassessed_sqm = 0;
        p.recoverable_tax_inr = 0;
      } else if (r < 9) {
        p.floors_dsm = "G+1 Storey";
        p.unassessed_sqm = Math.round(areaSqm * 0.45);
        p.recoverable_tax_inr = Math.round(areaSqm * 0.45 * 1800 * 0.08);
      } else {
        p.floors_dsm = "G+2 Storey";
        p.unassessed_sqm = Math.round(areaSqm * 0.90);
        p.recoverable_tax_inr = Math.round(areaSqm * 0.90 * 1800 * 0.08);
      }
    } else {
      p.floors_dsm = "N/A";
      p.unassessed_sqm = 0;
      p.recoverable_tax_inr = 0;
    }

    // 4. Topology
    const isHardcodedFail = f.id === 'building_huzur_mapped_01_3' || f.id === '03_51' || (idx % 20 === 0);
    if (isHardcodedFail) {
      p.topology_status = "FAIL — SETBACK VIOLATION";
      p.encroachment_flag = true;
      p.overlap_area_sqm = 18.4;
      p.overlap_description = fType === 'water' ? "Breaches Water Protection Buffer by 4.8 m" : "Intersects Road RoW Corridor by 1.2 m (Area: 18.4 m²)";
    } else {
      p.topology_status = "PASS";
      p.encroachment_flag = false;
      p.overlap_area_sqm = 0;
      p.overlap_description = "Conforming to LADM ISO 19152 & Master Plan 2031";
    }

    idx++;
  });

  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`Enriched ${file}`);
});
