# TerraMap AI — AI-Powered Urban Cadastral Intelligence

TerraMap AI is a comprehensive web application for automated cadastral intelligence, feature extraction, and interactive vector cadastre editing from drone and satellite aerial imagery. 

This project seamlessly bridges the gap between raw aerial imagery, AI-generated geospatial data, and statutory cadastral records, providing an intuitive workspace for urban planners, surveyors, and administrative officials.

---

## 🌟 Key Features & Modules

### 📍 Page 1: AI Feature Extraction & Interactive CAD Editor (`/`)
- **Pre-Generated Mapped Cadastre**: Directly sourced from `data/Huzur_Bhopal_Cadastre_20Pairs/mapped_cadastre/` with seamless fallback to `data/High_Precision_Cadastre/`.
- **Multi-Format Aerial Upload**: Drag-and-drop support for `JPG`, `JPEG`, `PNG`, `TIFF`, and `GeoTIFF` imagery with automatic client-side raster decoding.
- **Simulated AI Inference Pipeline**: Natural 5–8 second progress animation walking through image preprocessing, feature extraction, parcel detection, building detection, road detection, water detection, and geometry generation.
- **Dual Side-by-Side Comparison Workspace**: Compare the original uploaded satellite/drone image with the AI-mapped visual workspace in real time.
- **Interactive SVG Vector Layer**:
  - Exact 512x512 alignment with the raster visual map.
  - Distinct styling for Parcels (emerald), Buildings (amber), Roads (sky blue), Water (cyan), and Encroachments (rose).
  - **Edit Mode**: Draggable vertex handles to modify geometry boundaries with live polygon area (m²) calculation.
  - **Add Polygon & Add Line**: Click-to-draw tools with live rubberband previews.
  - **Contextual Properties Drawer**: Inspect and edit feature types, survey numbers, and sources with real-time GeoJSON synchronization.
  - **Undo / Redo History & LocalStorage Persistence**: Full state history and session recovery.
  - **Export GeoJSON**: One-click download of the current edited `FeatureCollection`.

### ⚖️ Page 2: Statutory Administrative Reconciliation (`/page2-reconcile`)
- **Pilot Hierarchy Ribbon**: Cascading administrative selection down to specific Khasras.
- **MapLibre GL Reconciliation Map**:
  - **Statutory / Legal Cadastre**: Cyan dashed boundary from reference LADM datasets.
  - **AI / Ortho Ground Truth**: Solid emerald boundary synchronized with committed Page 1 edits.
  - **Road ROW Corridor**: Amber corridor displaying 15m Right-of-Way overlap.
  - **Water Buffer Envelope**: Translucent cyan corridor displaying 30m NGT statutory buffer.
  - **Dispute Highlighting**: Red alert fill for disputed parcels.
  - **Accurate Projection**: `proj4` projection of `EPSG:32643` coordinates to `EPSG:4326`.
- **Property & CAD Inspection Panel**:
  - Statutory Record of Rights (RoR), Cadastral Conformance Metrics (Area Variance), Statutory Compliance Alerts.
  - **Flag Boundary Dispute Action**: Sets flags for legal reconciliation workflows.

### 🛡️ Page 3: Dispute Resolution Placeholder (`/page3-dispute`)
- Landing workspace for flagged Khasra boundary dispute dossiers and hearing workflows.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (React), Tailwind CSS, MapLibre GL JS, SVG-based CAD Editor
- **Backend**: FastAPI (Python), Uvicorn, Pydantic
- **Data Exchange**: GeoJSON, REST APIs
- **Geospatial Processing**: Proj4js, client-side bounding box translations

---

## 📁 Directory Structure

```text
Cadastral_Mapping/
├── backend/
│   └── main.py                     # FastAPI application and API endpoints
├── frontend/
│   ├── app/                        # Next.js pages and routing
│   ├── components/                 # React components (CAD Editor, Maps, UI)
│   ├── lib/                        # Utility functions, geospatial math
│   ├── public/                     # Static assets
│   ├── package.json                # Frontend dependencies
│   └── tailwind.config.ts          # Styling configuration
├── data/
│   ├── Huzur_Bhopal_Cadastre_20Pairs/
│   │   ├── mapped_cadastre/        # Primary AI output maps (huzur_mapped_01.jpg...)
│   │   ├── raw_orthophotos/        # Drone / aerial raw orthophotos
│   │   └── geojson/                # AI Vector features mapping
│   └── High_Precision_Cadastre/
│       ├── Visual_Maps/            # High precision 512x512 visual maps
│       └── LADM_GeoJSON/           # Base statutory records (Parcels, Buildings, Roads)
├── venv/                           # Python Virtual Environment
└── README.md                       # Documentation
```

---

## 🚀 Getting Started

Follow these steps to run TerraMap AI locally.

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Git**

### 1. Clone the Repository
```bash
git clone <repository_url>
cd Cadastral_Mapping
```

### 2. Backend Setup (FastAPI)
The backend serves the geospatial datasets and images.

```bash
# Set up a virtual environment (if not already created)
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install the Python dependencies
pip install fastapi uvicorn pydantic python-multipart

# Start the FastAPI server
python -m uvicorn backend.main:app --port 8000 --reload
```
The backend API will be available at `http://localhost:8000`. You can view the interactive API documentation at `http://localhost:8000/docs`.

### 3. Frontend Setup (Next.js)
The frontend is the user-facing web application.

```bash
# Open a new terminal window
cd frontend

# Install Node dependencies
npm install

# Start the Next.js development server
npm run dev
```

### 4. Access the Application
Open your browser and navigate to:
- **Page 1 (AI Feature Extraction)**: [http://localhost:3000](http://localhost:3000)
- **Page 2 (Statutory Reconciliation)**: [http://localhost:3000/page2-reconcile](http://localhost:3000/page2-reconcile)
- **Page 3 (Dispute Resolution)**: [http://localhost:3000/page3-dispute](http://localhost:3000/page3-dispute)

---

## 🔌 API Reference

The FastAPI backend provides several endpoints for the frontend to consume datasets:

- `GET /api/health`: Health check and system status.
- `GET /api/tiles`: List available tile IDs for mapping.
- `GET /api/tiles/{tile_id}/image`: Fetch the pre-processed visual map layer for a tile.
- `GET /api/tiles/{tile_id}/geojson`: Fetch the corresponding vector `FeatureCollection` (Parcels, Buildings, Roads, etc.).
- `POST /api/infer`: Simulate an AI inference run given an uploaded orthophoto, returning matched map and geospatial boundaries.

---

## 🤝 Contributing

Contributions to TerraMap AI are welcome! Please ensure any pull requests follow standard linting guidelines and include relevant documentation for newly introduced features.
