import React, { useRef, useState } from "react";
import { UploadCloud, FileImage, X, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { isTiffFile, convertTiffToDataUrl } from "../lib/tiffViewer";

interface ImageUploaderProps {
  onFileSelected: (file: File, fileDetails: { name: string; size: string; dimensions?: string; previewUrl: string }) => void;
  onRunMapping: () => void;
  selectedFile: File | null;
  fileDetails: { name: string; size: string; dimensions?: string; previewUrl: string } | null;
  onClearFile: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onFileSelected,
  onRunMapping,
  selectedFile,
  fileDetails,
  onClearFile,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDecodingTiff, setIsDecodingTiff] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(2) + " MB";
  };

  const handleProcessFile = async (file: File) => {
    const sizeStr = formatFileSize(file.size);

    if (isTiffFile(file)) {
      setIsDecodingTiff(true);
      try {
        const { dataUrl, width, height } = await convertTiffToDataUrl(file);
        onFileSelected(file, {
          name: file.name,
          size: sizeStr,
          dimensions: `${width} × ${height} px (GeoTIFF)`,
          previewUrl: dataUrl,
        });
      } catch (err) {
        console.error("Error decoding TIFF:", err);
        // Fallback placeholder preview if decoding fails
        onFileSelected(file, {
          name: file.name,
          size: sizeStr,
          dimensions: "GeoTIFF Raster",
          previewUrl: "",
        });
      } finally {
        setIsDecodingTiff(false);
      }
      return;
    }

    // Standard JPG / PNG
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      onFileSelected(file, {
        name: file.name,
        size: sizeStr,
        dimensions: `${img.naturalWidth} × ${img.naturalHeight} px`,
        previewUrl,
      });
    };
    img.onerror = () => {
      onFileSelected(file, {
        name: file.name,
        size: sizeStr,
        dimensions: "512 × 512 px",
        previewUrl,
      });
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Box */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 backdrop-blur-md bg-zinc-900/40 ${
            isDragging
              ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10"
              : "border-zinc-700/60 hover:border-zinc-500 hover:bg-zinc-800/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tif,.tiff,.geotiff"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="w-16 h-16 mb-4 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-emerald-400 shadow-inner">
            {isDecodingTiff ? (
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg font-semibold text-zinc-100 mb-1">
            {isDecodingTiff ? "Decoding TIFF Image..." : "Upload Satellite / Drone Image"}
          </h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm">
            Drag and drop your aerial image here or browse from your device
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/90 border border-zinc-700 text-xs font-mono text-zinc-400">
            <span>Supported:</span>
            <span className="text-emerald-400 font-medium">JPG • JPEG • PNG • TIFF • GeoTIFF</span>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/80 backdrop-blur-md p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {fileDetails?.previewUrl ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 bg-black flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileDetails.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <FileImage className="w-8 h-8" />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-100 text-base line-clamp-1">
                    {fileDetails?.name}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                  <span>Size: <strong className="text-zinc-200">{fileDetails?.size}</strong></span>
                  {fileDetails?.dimensions && (
                    <>
                      <span>•</span>
                      <span>Dim: <strong className="text-zinc-200">{fileDetails.dimensions}</strong></span>
                    </>
                  )}
                </div>
                <div className="text-xs text-emerald-400/90 font-medium">
                  Ready for AI feature extraction
                </div>
              </div>
            </div>

            <button
              onClick={onClearFile}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              onClick={onClearFile}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Change Image
            </button>
            <button
              onClick={onRunMapping}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run AI Mapping</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
