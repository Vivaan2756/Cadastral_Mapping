import React from "react";
import Link from "next/link";
import { ArrowRight, Hexagon, ChevronDown, Droplet, Map, Activity } from "lucide-react";
import { LivingContourWaves } from "../components/LivingContourWaves";
import { HeroContourWaves } from "../components/HeroContourWaves";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* ═══════════════════════════════════════════ */}
      {/* 1. NAVBAR */}
      {/* ═══════════════════════════════════════════ */}
      <header className="absolute top-0 left-0 right-0 z-50 w-full pt-4">
        <div className="max-w-[1100px] mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Hexagon className="w-6 h-6 text-teal-500 fill-teal-100" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-lg text-slate-800 tracking-tight">TerraMap AI</span>
          </div>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] font-bold text-slate-600 hover:text-teal-600 transition-colors">
              Features
            </a>
            <a href="#technology" className="text-[13px] font-bold text-slate-600 hover:text-teal-600 transition-colors">
              Technology
            </a>
            <a href="#compliance" className="text-[13px] font-bold text-slate-600 hover:text-teal-600 transition-colors">
              LADM Compliance
            </a>
          </nav>

          {/* CTA */}
          <Link href="/console" className="bg-[#10b981] hover:bg-emerald-600 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20">
            Request Demo
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════ */}
      {/* 2. HERO SECTION */}
      {/* ═══════════════════════════════════════════ */}
      <section className="relative pt-36 pb-12 overflow-hidden">
        {/* Soft Background Gradient */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-[#e0f7fa]/50 via-[#f0fdf4]/50 to-white"></div>
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-[100px]"></div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[100px]"></div>
        </div>

        {/* Animated Hero Waves */}
        <HeroContourWaves />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          
          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            <span className="text-[#0ea5e9]">Autonomous Urban Cadastre</span><br />
            <span className="text-[#0f172a]">AI-Powered Geo-Intelligence</span><br />
            <span className="text-[#0f172a]">for Precision Mapping</span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed mb-10 font-medium px-4">
            Transform land management with TerraMap AI's advanced aerial drone technology and GeoAI analytics for automated, accurate, and scalable cadastral surveys. Empowering governments and organizations with real-time urban spatial data.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/console" className="w-full sm:w-auto bg-[#10b981] hover:bg-emerald-600 text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/25">
              Start Your Project
            </Link>
            <a href="#features" className="w-full sm:w-auto bg-[#38bdf8] hover:bg-sky-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/25">
              Learn More
            </a>
          </div>

          {/* Hero Image */}
          <div className="relative w-full mx-auto max-w-5xl z-20 mt-8">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-sky-400 blur-3xl opacity-20 transform scale-95 translate-y-8 rounded-[3rem]"></div>
            <div className="relative bg-white p-4 md:p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/hero-cadastral.jpg" 
                alt="Drone surveying cadastral map"
                className="w-full h-auto rounded-[1.5rem]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 3. CORE PLATFORM FEATURES */}
      {/* ═══════════════════════════════════════════ */}
      <section id="features" className="py-20 bg-white relative overflow-hidden">
        
        {/* Animated Geospatial Waves (Background) */}
        <LivingContourWaves />

        <div className="max-w-[1100px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16 flex flex-col items-center justify-center gap-2 relative">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-widest mb-4">
               <Activity className="w-3.5 h-3.5" /> Capabilities
             </div>
             
             <h2 className="text-3xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight">
               Built for Scale and Precision
             </h2>
             <p className="text-slate-500 font-medium max-w-2xl mt-4">
               Our end-to-end pipeline handles everything from multi-modal drone ingestion to statutory GIS delivery, fully compliant with LADM ISO 19152.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-20">
            {/* Card 1 */}
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-start hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 bg-[#10b981] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-200">
                <Hexagon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0f172a] mb-3">GeoAI Automation</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">
                Harness the power of autonomous deep learning to instantly delineate parcels, building footprints, and road corridors.
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-auto pt-6 border-t border-slate-100">
                <div>
                  <div className="text-2xl font-extrabold text-[#0f172a]">&lt;6s</div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Processing</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#10b981]">85%</div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Time Saved</div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-start hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 bg-[#38bdf8] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sky-200">
                <Map className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0f172a] mb-3">High-Precision Mapping</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">
                Achieve statutory-grade accuracy using 4-channel drone orthomosaics combined with DSM elevation profiling.
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-auto pt-6 border-t border-slate-100">
                <div>
                  <div className="text-2xl font-extrabold text-[#0f172a]">5cm</div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Resolution</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#38bdf8]">2.3cm</div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Est. RMSE</div>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-start hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 bg-[#fbbf24] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-200">
                <Droplet className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0f172a] mb-3">Statutory GIS Export</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">
                Seamlessly resolve topologies and instantly export to .SHP, .DXF, and .GPKG formats for government integration.
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-auto pt-6 border-t border-slate-100">
                <div>
                  <div className="text-2xl font-extrabold text-[#0f172a]">ISO</div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">19152 Std</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#fbbf24]">3+</div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Formats</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 4. FOOTER */}
      {/* ═══════════════════════════════════════════ */}
      <footer className="w-full bg-slate-50 border-t border-slate-100 py-12 pb-16">
        <div className="max-w-[1100px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-teal-100/50">
                <Hexagon className="w-6 h-6 text-teal-600 fill-teal-100" strokeWidth={2.5} />
              </div>
              <span className="font-extrabold text-lg text-slate-800 tracking-tight">TerraMap AI</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px]">
              Autonomous GeoAI mapping platform for urban cadastral surveys. Empowering authorities with precise geospatial intelligence.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-4">Platform</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">Orthomosaic Ingestion</a></li>
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">GeoAI Feature Extraction</a></li>
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">Statutory Cadastre Editor</a></li>
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">ISO 19152 Compliance</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">Documentation</a></li>
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">API Reference</a></li>
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">Pilot Data Tiles</a></li>
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">NIC Integration Guide</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-4">Launch</h4>
            <ul className="space-y-3 mb-6">
              <li><Link href="/console" className="text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-colors flex items-center gap-1">Open Interactive Console <ArrowRight className="w-3 h-3" /></Link></li>
              <li><a href="#" className="text-xs text-slate-500 hover:text-teal-600 font-medium transition-colors">Schedule a Demo</a></li>
            </ul>
            <div className="text-[10px] text-slate-400 font-medium">
              &copy; 2026 TerraMap AI. All rights reserved.
            </div>
          </div>
          
        </div>
      </footer>

    </div>
  );
}
