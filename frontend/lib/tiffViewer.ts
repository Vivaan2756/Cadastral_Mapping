import * as GeoTIFF from "geotiff";

/**
 * Converts a TIFF or GeoTIFF File into a browser-renderable PNG data URL using canvas.
 */
export async function convertTiffToDataUrl(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();

    // Read RGB raster data from TIFF
    const rasters = await image.readRasters({ interleave: false });

    // Create offscreen canvas to render pixel data
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Unable to create 2D canvas context");
    }

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Check band structure (Grayscale, RGB, RGBA, Multispectral)
    const numBands = Array.isArray(rasters) ? rasters.length : 1;

    if (numBands >= 3) {
      const rBand = rasters[0] as ArrayLike<number>;
      const gBand = rasters[1] as ArrayLike<number>;
      const bBand = rasters[2] as ArrayLike<number>;

      // Determine normalization if 16-bit or float
      let maxVal = 255;
      for (let i = 0; i < Math.min(1000, rBand.length); i++) {
        if (rBand[i] > maxVal || gBand[i] > maxVal || bBand[i] > maxVal) {
          maxVal = 65535;
          break;
        }
      }
      const scale = 255 / (maxVal || 255);

      for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        data[offset] = Math.min(255, Math.max(0, Math.round(rBand[i] * scale)));
        data[offset + 1] = Math.min(255, Math.max(0, Math.round(gBand[i] * scale)));
        data[offset + 2] = Math.min(255, Math.max(0, Math.round(bBand[i] * scale)));
        data[offset + 3] = 255;
      }
    } else {
      // Grayscale band
      const grayBand = (Array.isArray(rasters) ? rasters[0] : rasters) as ArrayLike<number>;
      let maxVal = 255;
      for (let i = 0; i < Math.min(1000, grayBand.length); i++) {
        if (grayBand[i] > maxVal) {
          maxVal = 65535;
          break;
        }
      }
      const scale = 255 / (maxVal || 255);

      for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        const val = Math.min(255, Math.max(0, Math.round(grayBand[i] * scale)));
        data[offset] = val;
        data[offset + 1] = val;
        data[offset + 2] = val;
        data[offset + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");

    return {
      dataUrl,
      width,
      height,
    };
  } catch (err) {
    console.error("Failed to decode TIFF image via GeoTIFF:", err);
    throw err;
  }
}

/**
 * Checks if a file has a TIFF extension or mime type
 */
export function isTiffFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".tif") ||
    name.endsWith(".tiff") ||
    name.endsWith(".geotiff") ||
    file.type === "image/tiff" ||
    file.type === "image/x-tiff"
  );
}
