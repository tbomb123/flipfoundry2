/**
 * Hero Section
 * Main landing area with search functionality
 */

import React from 'react';
import { Sparkles, Zap, Shield, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchBar } from '@/components/ui-custom/SearchBar';
import type { SearchParams } from '@/types';

interface HeroProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
  resultCount?: number;
  className?: string;
}

const features = [
  {
    icon: Zap,
    label: 'AI-Powered',
    description: 'Smart deal detection',
  },
  {
    icon: BarChart3,
    label: 'Market Analysis',
    description: 'Real-time valuations',
  },
  {
    icon: Shield,
    label: 'Risk Scoring',
    description: 'Seller verification',
  },
  {
    icon: Sparkles,
    label: 'Profit Insights',
    description: 'ROI calculations',
  },
];

export const Hero: React.FC<HeroProps> = ({
  onSearch,
  isLoading = false,
  resultCount,
  className,
}) => {
  return (
    <section className={cn('relative min-h-[50vh] flex flex-col justify-center py-16 px-4', className)}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 mb-8">
          <Sparkles size={16} className="text-emerald-400" />
          <span className="text-sm text-slate-300">AI-Powered Arbitrage Intelligence</span>
        </div>
        
        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400">
            FlipFoundry
          </span>
        </h1>
        
        {/* Tagline */}
        <p className="text-xl md:text-2xl text-slate-400 mb-4 font-light">
          Find Hidden Profits. Fast.
        </p>
        
        {/* Subtitle */}
        <p className="text-slate-500 mb-10 max-w-2xl mx-auto">
          See what others miss. AI-powered deal intelligence for serious flippers.
          Scan eBay listings, analyze market values, and identify undervalued assets in seconds.
        </p>
        
        {/* Search Bar */}
        <SearchBar 
          onSearch={onSearch} 
          isLoading={isLoading}
          className="mb-8"
        />
        
        {/* Result count */}
        {resultCount !== undefined && resultCount > 0 && (
          <p className="text-slate-400 mb-8">
            Found <span className="text-emerald-400 font-semibold">{resultCount}</span> potential deals
          </p>
        )}
        
        {/* Features */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {features.map((feature) => (
            <div key={feature.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                <feature.icon size={18} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-300">{feature.label}</p>
                <p className="text-xs text-slate-500">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
