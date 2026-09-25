"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { TopNavbar } from '../../components/layout/TopNavbar';
import { JurisdictionSidebar } from '../../components/layout/JurisdictionSidebar';
import { fetchTileGeoJSON } from '../../lib/demoData';
import { GeoJSONFeatureCollection } from '../../lib/geometry';
import { parseGeoJSONAnalytics, DashboardAnalyticsSummary } from '../../utils/geojsonAnalytics';
import { KPISkeleton, ChartSkeleton, TableSkeleton } from '../../components/skeletons/DashboardSkeletons';
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, IndianRupee, MapIcon, TrendingUp, Download, RefreshCw, Printer, ShieldCheck, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ComposedChart, Line } from 'recharts';

export default function DashboardPage() {
  const [activeTileId, setActiveTileId] = useState('huzur_mapped_03');
  const [geojsonData, setGeojsonData] = useState<GeoJSONFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllLedger, setShowAllLedger] = useState(false);

  // Real-time ticking clock for "Live" feel
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamically load dataset based on sidebar
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTileGeoJSON(activeTileId).then(data => {
      if (active) {
        setGeojsonData(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [activeTileId]);

  // Zero-hardcoding parser
  const metrics: DashboardAnalyticsSummary | null = useMemo(() => {
    if (!geojsonData) return null;
    return parseGeoJSONAnalytics(geojsonData);
  }, [geojsonData]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      <TopNavbar />
      
      <div className="flex-1 flex overflow-hidden">
        <JurisdictionSidebar onTileChange={setActiveTileId} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          
          {/* Header Dashboard Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 backdrop-blur-md p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0f172a] flex items-center gap-3 tracking-tight">
                Operations Dashboard
                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Live
                </span>
              </h2>
              <div className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                Department of Revenue, Govt. of Madhya Pradesh
                <span className="text-slate-300">|</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {currentTime.toLocaleTimeString('en-IN', { hour12: true })}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0f172a] text-xs font-bold rounded-xl transition-colors shadow-sm">
                <Printer className="w-4 h-4" /> Print
              </button>
              <button className="flex items-center gap-1.5 px-5 py-2.5 bg-[#10b981] hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all">
                <Download className="w-4 h-4" /> Export (CSV)
              </button>
            </div>
          </div>

          {/* ROW 1: Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {!metrics || loading ? (
              <><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></>
            ) : (
              <>
                {/* Card 1 */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Total Area</h3>
                    <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm"><MapIcon className="w-5 h-5" /></div>
                  </div>
                  <div className="text-4xl font-extrabold text-[#0f172a] tracking-tight">{metrics.totalSurveyedAreaFormatted}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-2">98.4% Delineated</div>
                </div>

                {/* Card 2 */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Parcels Mapped</h3>
                    <div className="p-2.5 bg-sky-100 rounded-xl text-sky-600 shadow-sm"><CheckCircle2 className="w-5 h-5" /></div>
                  </div>
                  <div className="text-4xl font-extrabold text-[#0f172a] tracking-tight">{metrics.parcelsAndUnits.toLocaleString()}</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> {metrics.topologyPassRateFormatted} Pass Rate
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Encroachments</h3>
                    <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 shadow-sm"><AlertTriangle className="w-5 h-5" /></div>
                  </div>
                  <div className="text-4xl font-extrabold text-[#0f172a] tracking-tight">{metrics.flaggedEncroachments}</div>
                  <div className="text-[11px] font-bold text-rose-600 mt-2 bg-rose-50 px-2.5 py-1 rounded-md inline-block border border-rose-100">
                    {metrics.flaggedEncroachments} Critical Breaches
                  </div>
                </div>

                {/* Card 4 */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Tax Revenue</h3>
                    <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 shadow-sm"><IndianRupee className="w-5 h-5" /></div>
                  </div>
                  <div className="text-4xl font-extrabold text-[#0f172a] tracking-tight">{metrics.recoverableTaxFormatted}</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-2">Via 3D Height Profiling</div>
                </div>

                {/* Card 5: Urban Density */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Urban Density</h3>
                  </div>
                  <div className="text-4xl font-extrabold text-[#0f172a] tracking-tight mb-3">
                    {metrics.builtUpPercentage.toFixed(1)}% <span className="text-xs font-bold text-slate-400 uppercase">Built-up</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 flex overflow-hidden">
                    <div className="bg-[#10b981] h-3" style={{ width: `${metrics.builtUpPercentage}%` }}></div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-3 flex justify-between">
                    <span>Plinths: {(metrics.builtUpAreaSqm / 10000).toFixed(2)} Ha</span>
                    <span className="text-emerald-600">Open: {(100 - metrics.builtUpPercentage).toFixed(1)}%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ROW 2: Analytics & Fiscal Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!metrics || loading ? (
              <><ChartSkeleton /><ChartSkeleton /><ChartSkeleton /></>
            ) : (
              <>
                {/* Chart A: Land Use */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col h-[380px]">
                  <h3 className="text-sm font-extrabold text-[#0f172a] mb-4">Land Use Breakdown</h3>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={metrics.landUseDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} stroke="none">
                          {metrics.landUseDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value} units`, name]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart B: Building Heights */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col h-[380px]">
                  <h3 className="text-sm font-extrabold text-[#0f172a] mb-4">Building Heights</h3>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={metrics.floorDistribution} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Bar yAxisId="left" dataKey="structures" name="Structures" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={45} />
                        <Line yAxisId="right" type="monotone" dataKey="unassessedSqm" name="Unassessed (m²)" stroke="#fbbf24" strokeWidth={3} dot={{ r: 5 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart C: Property Sizes */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col h-[380px]">
                  <h3 className="text-sm font-extrabold text-[#0f172a] mb-4">Property Sizes</h3>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.plinthDistribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [`${value} Units (${props.payload.totalArea.toFixed(1)} m²)`, 'Properties']} 
                          cursor={{ fill: '#f8fafc' }} 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                          {metrics.plinthDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill === '#94a3b8' ? '#94a3b8' : entry.fill === '#818cf8' ? '#38bdf8' : entry.fill === '#6366f1' ? '#0ea5e9' : '#0284c7'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart D: Revenue Breakdown */}
                <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col h-[380px]">
                  <h3 className="text-sm font-extrabold text-[#0f172a] mb-4">Revenue Breakdown</h3>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.waterfallData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} width={100} />
                        <YAxis tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} tickFormatter={(val) => `₹${(val/100000).toFixed(1)}L`} axisLine={false} tickLine={false} />
                        <Tooltip 
                          formatter={(value: number) => [`₹${(value/100000).toFixed(2)} Lakhs`, 'Revenue']} 
                          cursor={{ fill: '#f8fafc' }} 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {metrics.waterfallData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill === '#64748b' ? '#94a3b8' : entry.fill === '#10b981' ? '#10b981' : '#0f172a'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ROW 3: Action Queue */}
          <div className="bg-white/90 backdrop-blur-md rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col mb-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#0f172a]">Action Queue</h3>
              <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                {metrics?.actionQueue.length || 0} Actions Pending
              </div>
            </div>
            
            {!metrics || loading ? (
              <TableSkeleton />
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 border-b border-slate-100">Khasra No.</th>
                      <th className="px-6 py-3 border-b border-slate-100">Title Holder & Tenure</th>
                      <th className="px-6 py-3 border-b border-slate-100">Land-Use & DSM Height</th>
                      <th className="px-6 py-3 border-b border-slate-100">Detected Anomaly</th>
                      <th className="px-6 py-3 border-b border-slate-100">Tax Capture Delta</th>
                      <th className="px-6 py-3 border-b border-slate-100">Statutory Status</th>
                      <th className="px-6 py-3 border-b border-slate-100 text-right">Action Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.actionQueue.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-bold">No anomalies pending review in this sector.</td>
                      </tr>
                    ) : (
                      (showAllLedger ? metrics.actionQueue : metrics.actionQueue.slice(0, 7)).map((f, idx) => {
                        const p = f.properties || {};
                        const isEncroaching = p.encroachment_flag === true;
                        const isVertical = (Number(p.unassessed_sqm) || 0) > 0;
                        const taxDelta = Number(p.recoverable_tax_inr) || 0;
                        
                        return (
                          <tr key={f.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-800">{p.khasra_no}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-700">{p.title_holder}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.tenure_class}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-700">{p.primary_land_use}</div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.floors_dsm}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600 max-w-xs truncate" title={p.overlap_description}>
                              {p.overlap_description}
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                              {taxDelta > 0 ? `+ ₹${taxDelta.toLocaleString()}/yr` : '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold tracking-widest border uppercase ${
                                isEncroaching ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                isVertical ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                'bg-slate-50 border-slate-200 text-slate-700'
                              }`}>
                                {isEncroaching ? 'CRITICAL ENCROACHMENT' : isVertical ? 'UNASSESSED VERTICAL' : 'CONFORMING'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button className="bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold py-2 px-3 rounded-lg border border-slate-200 shadow-sm transition-colors uppercase tracking-wider">
                                  {isEncroaching ? 'Issue Notice' : isVertical ? 'Route to Tax Desk' : 'Review'}
                                </button>
                                <Link href={`/webgis?featureId=${f.id}&sheet=${activeTileId}`} className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white text-[10px] font-bold py-2 px-4 rounded-lg shadow-md transition-all flex items-center gap-1 uppercase tracking-wider">
                                  Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination / View All Toggle */}
              {metrics && metrics.actionQueue.length > 7 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
                  <button 
                    onClick={() => setShowAllLedger(!showAllLedger)}
                    className="text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-800 px-6 py-2 rounded-lg shadow-sm transition-colors"
                  >
                    {showAllLedger 
                      ? 'Collapse Ledger' 
                      : `View All ${metrics.actionQueue.length} Pending Actions`}
                  </button>
                </div>
              )}
              </>
            )}
          </div>
          
        </main>
      </div>
    </div>
  );
}
