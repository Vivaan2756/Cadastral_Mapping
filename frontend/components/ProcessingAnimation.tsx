import React, { useEffect, useState } from "react";
import { Cpu, Layers, Building, Compass, CheckCircle2 } from "lucide-react";

interface ProcessingAnimationProps {
  onComplete: () => void;
  fileName?: string;
}

const STAGES = [
  { label: "Image received", icon: Cpu, progress: 12 },
  { label: "Image preprocessing", icon: Layers, progress: 24 },
  { label: "Feature extraction", icon: Compass, progress: 38 },
  { label: "Parcel detection", icon: Layers, progress: 52 },
  { label: "Building detection", icon: Building, progress: 68 },
  { label: "Road detection", icon: Compass, progress: 80 },
  { label: "Water detection", icon: Layers, progress: 92 },
  { label: "Generating cadastral geometry", icon: CheckCircle2, progress: 100 },
];

export const ProcessingAnimation: React.FC<ProcessingAnimationProps> = ({
  onComplete,
  fileName = "drone_satellite_tile.jpg",
}) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const totalDuration = 6200; // ~6.2 seconds
    const intervalTime = totalDuration / STAGES.length;

    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => {
        const next = prev + 1;
        if (next < STAGES.length) {
          setProgress(STAGES[next].progress);
          return next;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 600);
          return prev;
        }
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onComplete]);

  const activeStage = STAGES[currentStageIdx] || STAGES[STAGES.length - 1];
  const IconComponent = activeStage.icon;

  return (
    <div className="w-full max-w-xl mx-auto p-8 rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-xl">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-mono mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>INFERENCE PIPELINE ACTIVE</span>
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
          AI Mapping in Progress
        </h2>
        <p className="text-sm text-zinc-400">
          Analyzing aerial imagery and extracting cadastral features...
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-3 mb-8">
        <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
          <span className="text-zinc-300 font-semibold">{activeStage.label}</span>
          <span className="text-emerald-400 font-bold">{progress}%</span>
        </div>

        <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-500 ease-out shadow-sm shadow-emerald-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Active Stage Details Card */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
            <IconComponent className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono text-zinc-400">CURRENT STEP</div>
            <div className="text-sm font-semibold text-zinc-100">{activeStage.label}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono text-zinc-500">TARGET FILE</div>
          <div className="text-xs font-mono text-zinc-300 truncate max-w-[140px]">{fileName}</div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="mt-6 pt-5 border-t border-zinc-900 grid grid-cols-4 gap-2">
        {STAGES.map((s, idx) => {
          const isDone = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;
          return (
            <div
              key={idx}
              className={`text-center py-1.5 px-1 rounded text-[10px] font-mono transition-colors ${
                isDone
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40"
                  : isCurrent
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold"
                  : "text-zinc-600 border border-transparent"
              }`}
            >
              {s.label.split(" ")[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
};
