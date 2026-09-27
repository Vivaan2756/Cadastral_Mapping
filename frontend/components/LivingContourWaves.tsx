import React from 'react';

export const LivingContourWaves = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
      
      <svg 
        viewBox="0 0 1440 600" 
        className="absolute top-10 left-0 w-full h-full"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* DEF: Gradients & Glow Filters */}
        <defs>
          {/* Emerald Gradient */}
          <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="20%" stopColor="#34d399" />
            <stop offset="80%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>

          {/* Cyan/Sky Gradient */}
          <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="20%" stopColor="#22d3ee" />
            <stop offset="80%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>

          {/* Glow Drop-Shadows */}
          <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#10b981" floodOpacity="0.4" />
          </filter>
          
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#06b6d4" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* --- BEAM 1: Cyan/Sky Wave (Sweeps high then low) --- */}
        <g className="wave-path-1">
          {/* Base transparent trail */}
          <path 
            fill="none" 
            stroke="url(#cyanGrad)" 
            strokeWidth="1" 
            strokeOpacity="0.5"
            d="M-100,100 C200,50 400,450 720,300 C1040,150 1240,400 1540,100"
          />
          {/* Racing telemetry dash with intense glow */}
          <path 
            className="beam-stroke"
            fill="none" 
            stroke="url(#cyanGrad)" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            strokeDasharray="200 600"
            filter="url(#cyanGlow)"
            d="M-100,100 C200,50 400,450 720,300 C1040,150 1240,400 1540,100"
          />
        </g>

        {/* --- BEAM 2: Emerald Wave (Sweeps low then high) --- */}
        <g className="wave-path-2">
          {/* Base transparent trail */}
          <path 
            fill="none" 
            stroke="url(#emeraldGrad)" 
            strokeWidth="1" 
            strokeOpacity="0.5"
            d="M-100,450 C300,550 500,100 720,250 C940,400 1140,50 1540,300"
          />
          {/* Racing telemetry dash with intense glow */}
          <path 
            className="beam-stroke"
            fill="none" 
            stroke="url(#emeraldGrad)" 
            strokeWidth="2.5" 
            strokeLinecap="round"
            strokeDasharray="180 700"
            filter="url(#emeraldGlow)"
            d="M-100,450 C300,550 500,100 720,250 C940,400 1140,50 1540,300"
            style={{ animationDuration: '6s', animationDirection: 'reverse' }}
          />
        </g>

        {/* --- LAYER 3: Intersection Nodes --- */}
        {/* Approximate intersection points where the waves cross behind the cards */}
        <circle cx="720" cy="275" r="4" fill="#fff" filter="url(#cyanGlow)" className="pulse-node" style={{ animationDelay: '0s' }} />
        <circle cx="285" cy="280" r="3" fill="#fff" filter="url(#emeraldGlow)" className="pulse-node" style={{ animationDelay: '1s' }} />
        <circle cx="1185" cy="235" r="3" fill="#fff" filter="url(#cyanGlow)" className="pulse-node" style={{ animationDelay: '2s' }} />
        
      </svg>
    </div>
  );
};
