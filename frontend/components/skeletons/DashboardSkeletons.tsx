import React from 'react';

export const KPISkeleton = () => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="w-24 h-4 bg-slate-200 rounded"></div>
      <div className="w-8 h-8 bg-slate-100 rounded-full"></div>
    </div>
    <div>
      <div className="w-32 h-8 bg-slate-200 rounded mb-2"></div>
      <div className="w-48 h-3 bg-slate-100 rounded"></div>
    </div>
  </div>
);

export const MapSkeleton = () => (
  <div className="w-full h-full bg-slate-100 rounded-2xl border border-slate-200 animate-pulse flex items-center justify-center">
    <div className="flex flex-col items-center gap-3 opacity-50">
      <div className="w-12 h-12 bg-slate-300 rounded-full"></div>
      <div className="w-32 h-4 bg-slate-300 rounded"></div>
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm h-full flex flex-col gap-4 animate-pulse">
    <div className="w-32 h-5 bg-slate-200 rounded"></div>
    <div className="flex-1 bg-slate-100 rounded-xl"></div>
  </div>
);

export const TableSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse">
    <div className="h-12 border-b border-slate-100 bg-slate-50 rounded-t-2xl px-6 flex items-center">
      <div className="w-48 h-4 bg-slate-200 rounded"></div>
    </div>
    <div className="p-0">
      {[1, 2, 3].map(i => (
        <div key={i} className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="w-32 h-4 bg-slate-100 rounded"></div>
          <div className="w-48 h-4 bg-slate-100 rounded"></div>
          <div className="w-24 h-6 bg-slate-200 rounded-full"></div>
          <div className="w-32 h-8 bg-slate-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  </div>
);
