import React from 'react';

export const HeroContourWaves = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
      
      <svg 
        viewBox="0 0 1440 800" 
        className="absolute top-0 left-0 w-full h-full"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="heroEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
            <stop offset="20%" stopColor="#34d399" />
            <stop offset="80%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="heroCyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="20%" stopColor="#22d3ee" />
            <stop offset="80%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>

          <filter id="heroEmeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#10b981" floodOpacity="0.6" />
          </filter>
          
          <filter id="heroCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#06b6d4" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* --- BEAM 1: Cyan/Sky Wave (Sweeps diagonally from top-left behind text to bottom-right) --- */}
        <g className="hero-wave-path-1">
          <path 
            fill="none" 
            stroke="url(#heroCyanGrad)" 
            strokeWidth="1.5" 
            strokeOpacity="0.6"
            d="M-100,150 C300,50 400,600 800,500 C1100,425 1300,650 1540,550"
          />
          <path 
            className="hero-beam-stroke"
            fill="none" 
            stroke="url(#heroCyanGrad)" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeDasharray="250 800"
            filter="url(#heroCyanGlow)"
            d="M-100,150 C300,50 400,600 800,500 C1100,425 1300,650 1540,550"
          />
        </g>

        {/* --- BEAM 2: Emerald Wave (Sweeps from mid-left, dips low under the drone, rises right) --- */}
        <g className="hero-wave-path-2">
          <path 
            fill="none" 
            stroke="url(#heroEmeraldGrad)" 
            strokeWidth="1.5" 
            strokeOpacity="0.6"
            d="M-100,500 C200,650 500,250 800,350 C1100,450 1200,150 1540,250"
          />
          <path 
            className="hero-beam-stroke"
            fill="none" 
            stroke="url(#heroEmeraldGrad)" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeDasharray="200 900"
            filter="url(#heroEmeraldGlow)"
            d="M-100,500 C200,650 500,250 800,350 C1100,450 1200,150 1540,250"
            style={{ animationDuration: '6s', animationDirection: 'reverse' }}
          />
        </g>

        {/* --- LAYER 3: Intersection Nodes --- */}
        <circle cx="800" cy="425" r="4" fill="#fff" filter="url(#heroCyanGlow)" className="pulse-node" style={{ animationDelay: '0s' }} />
        <circle cx="370" cy="405" r="3" fill="#fff" filter="url(#heroEmeraldGlow)" className="pulse-node" style={{ animationDelay: '1s' }} />
        <circle cx="1275" cy="415" r="3" fill="#fff" filter="url(#heroCyanGlow)" className="pulse-node" style={{ animationDelay: '2s' }} />
        
      </svg>
    </div>
  );
};
