/**
 * DealsGrid Section
 * Displays search results in a responsive grid layout
 */

import React, { useEffect, useRef } from 'react';
import { Loader2, AlertCircle, PackageX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DealCard } from '@/components/cards/DealCard';
import type { ValuationResult, ApiError } from '@/types';

interface DealsGridProps {
  results: ValuationResult[];
  isLoading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onViewDetails?: (valuation: ValuationResult) => void;
  onAddToWatchlist?: (listingId: string) => void;
  className?: string;
}

export const DealsGrid: React.FC<DealsGridProps> = ({
  results,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  onViewDetails,
  onAddToWatchlist,
  className,
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);
  
  // Loading state
  if (isLoading && results.length === 0) {
    return (
      <section className={cn('py-16 px-4', className)}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
            <p className="mt-6 text-lg text-slate-400">Scanning the market...</p>
            <p className="text-sm text-slate-600">Analyzing listings and calculating deal scores</p>
          </div>
        </div>
      </section>
    );
  }
  
  // Error state
  if (error && results.length === 0) {
    return (
      <section className={cn('py-16 px-4', className)}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">{error.message}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="border-slate-600 hover:bg-slate-800"
            >
              Try Again
            </Button>
          </div>
        </div>
      </section>
    );
  }
  
  // Empty state
  if (results.length === 0) {
    return (
      <section className={cn('py-16 px-4', className)}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <PackageX size={32} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No deals found</h3>
            <p className="text-slate-400 text-center max-w-md">
              Try adjusting your search terms or filters to find more opportunities.
            </p>
          </div>
        </div>
      </section>
    );
  }
  
  return (
    <section className={cn('py-8 px-4', className)}>
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Live Deals</h2>
            <p className="text-slate-500">
              Showing {results.length} potential flip{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {/* Sort options could go here */}
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {results.map((valuation, index) => (
            <DealCard
              key={`${valuation.listing.id}-${index}`}
              valuation={valuation}
              onViewDetails={onViewDetails}
              onAddToWatchlist={onAddToWatchlist}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
        </div>
        
        {/* Load More */}
        {(hasMore || isLoading) && (
          <div ref={loadMoreRef} className="flex justify-center py-12">
            {isLoading ? (
              <div className="flex items-center gap-3 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading more deals...</span>
              </div>
            ) : hasMore ? (
              <Button
                variant="outline"
                onClick={onLoadMore}
                className="border-slate-600 hover:bg-slate-800 text-slate-300"
              >
                Load More Deals
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};
