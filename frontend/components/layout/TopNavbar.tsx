"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Map, ShieldCheck, User } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const pathname = usePathname();

  const links = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Data Ingestion', href: '/console' },
    { name: 'WebGIS Viewer', href: '/page2-reconcile' },
    { name: 'Dispute Resolution Desk', href: '/page3-dispute' },
  ];

  return (
    <nav className="h-16 bg-[#1e3a8a] border-b border-blue-800/50 px-6 flex items-center justify-between text-blue-50 shrink-0 z-50">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="bg-white p-1.5 rounded flex items-center justify-center shadow-sm">
          <Map className="w-5 h-5 text-[#1e3a8a]" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[15px] tracking-tight text-white leading-tight">TerraMap AI</span>
          <span className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">National Cadastral Portal</span>
        </div>
        <div className="ml-6 hidden md:flex items-center gap-1.5 bg-blue-800/50 border border-blue-700/50 px-2.5 py-1 rounded text-[10px] font-medium text-blue-100">
          <ShieldCheck className="w-3.5 h-3.5" />
          LADM ISO 19152 Conforming
        </div>
      </div>

      {/* Navigation */}
      <div className="hidden lg:flex items-center gap-2">
        {links.map(link => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-white/20 text-white font-semibold' 
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-5">
        <button className="relative text-blue-200 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-rose-400 rounded-full border border-[#1e3a8a]"></span>
        </button>
        
        <div className="flex items-center gap-3 pl-5 border-l border-blue-800/50">
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium text-white leading-tight">Rajiv Sharma</span>
            <span className="text-[11px] text-blue-200">Tehsildar / SO</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </nav>
  );
};
