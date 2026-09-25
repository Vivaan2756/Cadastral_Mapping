import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tileId: string }> }
) {
  const { tileId } = await params;
  
  // Clean up tileId
  const cleanTileId = tileId
    .replace(".geojson", "")
    .replace(".json", "")
    .replace("_precision_cadastre", "")
    .replace("huzur_mapped_", "");

  const baseDataDir = path.join(process.cwd(), "..", "data");

  // 1. Primary Priority: data/Huzur_Bhopal_Cadastre_20Pairs/geojson/
  const huzurGeoJsonDir = path.join(
    baseDataDir,
    "Huzur_Bhopal_Cadastre_20Pairs",
    "geojson"
  );

  const candidatePaths = [
    path.join(huzurGeoJsonDir, `${tileId}.geojson`),
    path.join(huzurGeoJsonDir, `huzur_mapped_${cleanTileId}.geojson`),
    path.join(huzurGeoJsonDir, `${cleanTileId}.geojson`),
    path.join(huzurGeoJsonDir, "huzur_mapped_01.geojson"),
  ];

  let foundPath: string | null = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (foundPath) {
    try {
      const content = fs.readFileSync(foundPath, "utf-8");
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed, {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (err) {
      console.error("Error reading tile geojson:", err);
    }
  }

  // 2. Fallback to cadastre_dataset.json in public directory
  try {
    const staticJsonPath = path.join(process.cwd(), "public", "data", "cadastre_dataset.json");
    if (fs.existsSync(staticJsonPath)) {
      const content = fs.readFileSync(staticJsonPath, "utf-8");
      const dataset = JSON.parse(content);
      const targetKey = tileId.startsWith("huzur_mapped_") ? tileId : `huzur_mapped_${cleanTileId}`;
      if (dataset[targetKey]) {
        return NextResponse.json(dataset[targetKey]);
      }
      if (dataset[tileId]) {
        return NextResponse.json(dataset[tileId]);
      }
    }
  } catch (err) {
    console.error("Error reading cadastre_dataset fallback:", err);
  }

  return new NextResponse(JSON.stringify({ error: "GeoJSON Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}
