# TerraMap AI — AI-Powered Urban Cadastral Intelligence

TerraMap AI is a web application for automated cadastral intelligence, feature extraction, and interactive vector cadastre editing from drone and satellite aerial imagery.

---

## 🌟 Modules

### 📍 Page 1: AI Feature Extraction & Interactive CAD Editor (`/`)
- **Pre-Generated Mapped Cadastre**: Directly sourced from `data/Huzur_Bhopal_Cadastre_20Pairs/mapped_cadastre/` (`huzur_mapped_01.jpg`, `huzur_mapped_02.jpg`, `huzur_mapped_03.jpg`, etc.) with seamless fallback to `data/High_Precision_Cadastre/`.
- **Multi-Format Aerial Upload**: Drag-and-drop support for `JPG`, `JPEG`, `PNG`, `TIFF`, and `GeoTIFF` imagery with automatic client-side raster decoding (`geotiff`).
- **Simulated AI Inference Pipeline**: Natural 5–8 second progress animation walking through image preprocessing, feature extraction, parcel detection, building detection, road detection, water detection, and geometry generation.
- **Dual Side-by-Side Comparison Workspace**: Compare the original uploaded satellite/drone image with the AI-mapped visual workspace in real time.
- **Interactive SVG Vector Layer**:
  - Exact $512 \times 512$ alignment with the raster visual map.
  - Distinct styling for Parcels (emerald), Buildings (amber), Roads (sky blue), Water (cyan), and Encroachments (rose).
  - **Edit Mode**: Draggable vertex handles to modify geometry boundaries with live polygon area ($m^2$) calculation.
  - **Add Polygon & Add Line**: Click-to-draw tools with live rubberband previews.
  - **Contextual Properties Drawer**: Inspect and edit feature types, survey numbers, and sources with real-time GeoJSON synchronization.
  - **Undo / Redo History & LocalStorage Persistence**: Full state history and session recovery (`alpha_cadastre_geojson`).
  - **Export GeoJSON**: One-click download of the current edited `FeatureCollection`.

### ⚖️ Page 2: Statutory Administrative Reconciliation (`/page2-reconcile`)
- **Pilot Hierarchy Ribbon**: Cascading administrative selection:
  `Madhya Pradesh` $\rightarrow$ `Bhopal` $\rightarrow$ `Huzur` $\rightarrow$ `Bairagarh Kalan` (LGD: 482910) $\rightarrow$ Khasras `08-412-A` through `08-412-J`.
- **MapLibre GL Reconciliation Map**:
  - **Statutory / Legal Cadastre**: Cyan dashed boundary (`#00f0ff`) from reference LADM datasets.
  - **AI / Ortho Ground Truth**: Solid emerald boundary (`#10b981`) synchronized with committed Page 1 edits (`alpha_cadastre_geojson`).
  - **Road ROW Corridor**: Amber corridor (`#f59e0b`) displaying 15m Right-of-Way overlap.
  - **Water Buffer Envelope**: Translucent cyan corridor displaying 30m NGT statutory buffer.
  - **Dispute Highlighting**: Red alert fill (`#ef4444`, 0.6 opacity) for disputed parcels.
  - **Accurate UTM $\leftrightarrow$ WGS84 Projection**: `proj4` projection of `EPSG:32643` coordinates to `EPSG:4326`.
- **Property & CAD Inspection Panel**:
  - Monospace Survey / Plot IDs, Feature Class, and Source attribution.
  - Statutory Record of Rights (RoR): Khata Number, Registered Co-owners, Annual Land Revenue, Soil Classification, Mortgage Status, and 14-character ULPIN.
  - **Cadastral Conformance Metrics**: Calculated Legal Area ($m^2$), AI Ground Truth Area ($m^2$), and Net Area Variance ($\Delta m^2$).
  - **Statutory Compliance Alerts**: Road ROW corridor overlap banner & NGT 30m water-buffer alert banner.
  - **Flag Boundary Dispute Action**: Sets `flagged_khasra_id` in `localStorage`, displays 7-day notice toast, and navigates to Page 3.

### 🛡️ Page 3: Dispute Resolution Placeholder (`/page3-dispute`)
- Landing workspace for flagged Khasra boundary dispute dossiers and hearing workflows.

---

## 📁 Pre-Generated Data Source Paths

```text
data/
├── Huzur_Bhopal_Cadastre_20Pairs/
│   ├── mapped_cadastre/            # Primary mapped images for Page 1 (huzur_mapped_01.jpg, ...)
│   └── raw_orthophotos/            # Drone / aerial raw orthophotos
└── High_Precision_Cadastre/
    ├── Visual_Maps/                # High precision 512x512 visual maps
    └── LADM_GeoJSON/               # Parcels, Buildings, Roads, Encroachments GeoJSON
```

---

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)
```bash
python -m uvicorn backend.main:app --port 8000 --reload
```

### 2. Frontend Setup (Next.js)
```bash
cd frontend
npm run dev
```
- **Page 1**: `http://localhost:3000`
- **Page 2**: `http://localhost:3000/page2-reconcile`
- **Page 3**: `http://localhost:3000/page3-dispute`
