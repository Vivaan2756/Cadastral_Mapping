"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, FileText, CheckCircle, Clock } from "lucide-react";

export default function Page3Dispute() {
  const [flaggedKhasra, setFlaggedKhasra] = useState<string>("08-412-B");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("flagged_khasra_id");
      if (stored) {
        setFlaggedKhasra(stored);
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen items-center justify-center bg-[#070d1e] text-zinc-100 p-6 font-sans">
      <div className="max-w-xl w-full bg-[#0b132b] border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-700/60 flex items-center justify-center text-rose-400 flex-shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-400 text-[11px] font-mono font-bold mb-1">
              PAGE 3 • STATUTORY DISPUTE RESOLUTION
            </div>
            <h2 className="text-xl font-bold text-zinc-100">Boundary Dispute Notice (Sec 129 MP LRC)</h2>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2.5 font-mono text-xs">
          <div className="flex justify-between items-center text-zinc-400 border-b border-zinc-800 pb-2">
            <span>Target Khasra:</span>
            <span className="text-rose-400 font-bold text-sm bg-rose-950/50 px-2.5 py-0.5 rounded border border-rose-800/80">
              {flaggedKhasra}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Notice Period:</span>
            <span className="text-zinc-200 flex items-center gap-1.5 font-sans text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              7 Days Statutory Objection Window
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Jurisdiction:</span>
            <span className="text-zinc-200 font-sans text-xs">Tehsildar Court, Huzur (Bhopal)</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span>Status:</span>
            <span className="text-emerald-400 font-sans text-xs flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Synchronized with State Land Registry
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <Link
            href="/page2-reconcile"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Page 2 Reconciliation</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
