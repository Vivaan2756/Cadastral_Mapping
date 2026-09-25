import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tileId: string }> }
) {
  const { tileId } = await params;
  
  // Clean up tileId
  const cleanTileId = tileId.replace(".jpg", "").replace("_precision_cadastre", "").replace("huzur_mapped_", "");

  const baseDataDir = path.join(process.cwd(), "..", "data");

  // 1. Primary Priority: data/Huzur_Bhopal_Cadastre_20Pairs/mapped_cadastre/
  const huzurMappedDir = path.join(
    baseDataDir,
    "Huzur_Bhopal_Cadastre_20Pairs",
    "mapped_cadastre"
  );

  const candidatePaths = [
    path.join(huzurMappedDir, `${tileId}.jpg`),
    path.join(huzurMappedDir, `huzur_mapped_${cleanTileId}.jpg`),
    path.join(huzurMappedDir, `${cleanTileId}.jpg`),
    path.join(huzurMappedDir, "huzur_mapped_01.jpg"),
    // 2. High_Precision_Cadastre/Visual_Maps fallback
    path.join(baseDataDir, "High_Precision_Cadastre", "Visual_Maps", `${cleanTileId}_precision_cadastre.jpg`),
    path.join(baseDataDir, "High_Precision_Cadastre", "Visual_Maps", "00_00_precision_cadastre.jpg"),
  ];

  let foundPath: string | null = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (!foundPath) {
    return new NextResponse("Tile Image Not Found", { status: 404 });
  }

  const imageBuffer = fs.readFileSync(foundPath);

  return new NextResponse(imageBuffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
