/**
 * DealCard Component
 * Premium card displaying a listing with deal analysis
 */

import React, { useState, useMemo } from 'react';
import { 
  ExternalLink, 
  Eye, 
  Clock, 
  Heart,
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertCircle,
  Star,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge, ScoreProgress } from '@/components/ui-custom/ScoreBadge';
import { RiskBadge } from '@/components/ui-custom/RiskBadge';
import { GradeEstimateCard } from '@/components/ui-custom/GradeEstimateCard';
import { shouldShowGradeEstimate } from '@/lib/raw-card-detection';
import { useGradeEstimate } from '@/hooks/useGradeEstimate';
import { applyGradeBoost } from '@/lib/grade-boost';
import type { ValuationResult } from '@/types';

// Feature flag check - import would cause issues in client component
// so we check via API response or default to false
const GRADE_ESTIMATION_ENABLED = false; // Will be controlled server-side

interface DealCardProps {
  valuation: ValuationResult;
  onViewDetails?: (valuation: ValuationResult) => void;
  onAddToWatchlist?: (listingId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const getTimeRemaining = (endTime?: string): string => {
  if (!endTime) return 'No end time';
  
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  return '< 1h left';
};

export const DealCard: React.FC<DealCardProps> = ({
  valuation,
  onViewDetails,
  onAddToWatchlist,
  className,
}) => {
  const { listing, dealScore, sellerRisk, marketValue } = valuation;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showGradeEstimate, setShowGradeEstimate] = useState(false);
  
  // Grade estimation hook
  const { 
    estimate: gradeEstimate, 
    loading: gradeLoading, 
    error: gradeError, 
    estimateGrade,
    reset: resetGradeEstimate 
  } = useGradeEstimate();
  
  const profit = dealScore.potentialProfit;
  const isProfitable = profit > 0;
  
  // Check if this is a raw sports card eligible for grade estimation
  const isRawCard = GRADE_ESTIMATION_ENABLED && 
    shouldShowGradeEstimate(listing.title, listing.condition, listing.category?.id);
  
  // Calculate boosted score when grade estimate is available
  const { finalScore, boost: gradeBoostResult } = useMemo(() => {
    if (!gradeEstimate) {
      return { finalScore: dealScore.overall, boost: null };
    }
    return applyGradeBoost(dealScore.overall, {
      overallGrade: gradeEstimate.overallGrade,
      confidence: gradeEstimate.confidence,
    });
  }, [dealScore.overall, gradeEstimate]);
  
  // Handle grade estimation button click
  const handleEstimateGrade = async () => {
    if (showGradeEstimate && gradeEstimate) {
      // Toggle off if already showing
      setShowGradeEstimate(false);
      resetGradeEstimate();
      return;
    }
    
    setShowGradeEstimate(true);
    
    // Get primary image and additional images
    const primaryImage = listing.imageUrls?.[0] || '';
    const additionalUrls = listing.imageUrls?.slice(1, 3); // Max 2 additional
    
    if (!primaryImage) {
      return;
    }
    
    await estimateGrade(
      listing.id,
      primaryImage,
      additionalUrls
    );
  };
  
  return (
    <div
      className={cn(
        'group relative rounded-2xl overflow-hidden',
        'bg-slate-900/60 backdrop-blur-xl',
        'border border-slate-700/50',
        'transition-all duration-300 ease-out',
        'hover:border-slate-500/50 hover:bg-slate-800/70',
        'hover:shadow-2xl hover:shadow-slate-900/50',
        'hover:-translate-y-1',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect on hover */}
      <div 
        className={cn(
          'absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none',
          isHovered && 'opacity-100'
        )}
        style={{
          background: `radial-gradient(600px circle at 50% 0%, ${dealScore.color}08, transparent 40%)`,
        }}
      />
      
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
        {/* Loading skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-transparent" />
          </div>
        )}
        
        <img
          src={listing.primaryImageUrl}
          alt={listing.title}
          className={cn(
            'w-full h-full object-cover transition-all duration-500',
            'group-hover:scale-105',
            imageLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
            setImageLoaded(true);
          }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        
        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <ScoreBadge score={dealScore} size="sm" showLabel={false} />
          
          <div className="flex gap-2">
            {listing.condition !== 'unknown' && (
              <Badge 
                variant="secondary" 
                className="bg-slate-900/70 backdrop-blur-sm text-slate-300 border-0"
              >
                {listing.conditionDisplayName || listing.condition}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Watch count */}
        {listing.watchCount > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 text-slate-300">
            <Eye size={14} />
            <span className="text-xs font-medium">{formatNumber(listing.watchCount)}</span>
          </div>
        )}
        
        {/* Bottom info */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              {listing.bidCount > 0 && (
                <span className="flex items-center gap-1">
                  <BarChart3 size={12} />
                  {listing.bidCount} bids
                </span>
              )}
              {listing.endTime && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {getTimeRemaining(listing.endTime)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <h3 className="font-medium text-slate-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
          {listing.title}
        </h3>
        
        {/* Price Row */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">Current Price</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {formatCurrency(listing.currentPrice, listing.currency)}
              </span>
              {listing.shippingCost === 0 ? (
                <span className="text-xs text-emerald-400 font-medium">Free shipping</span>
              ) : listing.shippingCost ? (
                <span className="text-xs text-slate-500">
                  + {formatCurrency(listing.shippingCost, listing.currency)} shipping
                </span>
              ) : null}
            </div>
          </div>
          
          {/* Market Value */}
          <div className="text-right">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Est. Value</span>
            <div className="text-lg font-semibold text-emerald-400">
              {formatCurrency(marketValue.estimatedValue, listing.currency)}
            </div>
          </div>
        </div>
        
        {/* Profit Analysis */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400 flex items-center gap-1.5">
              <TrendingUp size={14} />
              Potential Profit
            </span>
            <span className={cn(
              'font-semibold',
              isProfitable ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isProfitable ? '+' : ''}{formatCurrency(profit, listing.currency)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400 flex items-center gap-1.5">
              <DollarSign size={14} />
              ROI
            </span>
            <span className={cn(
              'font-semibold',
              dealScore.roiPercentage > 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {dealScore.roiPercentage > 0 ? '+' : ''}{dealScore.roiPercentage.toFixed(1)}%
            </span>
          </div>
          
          {/* Deal Score Progress */}
          <div className="pt-1">
            <ScoreProgress 
              score={finalScore} 
              color={gradeBoostResult?.applied ? 'emerald' : dealScore.color}
              size="sm"
            />
            {gradeBoostResult?.applied && (
              <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <span>+{gradeBoostResult.boost} Grade Boost</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Seller Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <span className="text-xs font-medium text-slate-400">
                {listing.seller.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-300 truncate max-w-[120px]">
                {listing.seller.username}
              </p>
              <p className="text-xs text-slate-500">
                {listing.seller.feedbackPercentage}% • {formatNumber(listing.seller.totalTransactions)} sales
              </p>
            </div>
          </div>
          
          <RiskBadge 
            level={sellerRisk.level} 
            size="sm" 
            showLabel={false}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-slate-800/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300"
            onClick={() => onViewDetails?.(valuation)}
            data-testid="deal-card-details-btn"
          >
            <AlertCircle size={14} className="mr-1.5" />
            Details
          </Button>
          
          {/* Grade Estimate Button - Only shown for raw sports cards */}
          {isRawCard && (
            <Button
              variant="outline"
              size="sm"
              className="bg-amber-600/20 border-amber-500/50 hover:bg-amber-600/30 hover:border-amber-400 text-amber-400"
              onClick={handleEstimateGrade}
              disabled={gradeLoading}
              data-testid="deal-card-estimate-grade-btn"
            >
              {gradeLoading ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Star size={14} className="mr-1.5" />
              )}
              {showGradeEstimate && gradeEstimate ? 'Hide Grade' : 'Grade'}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="icon"
            className="border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-400 hover:text-rose-400"
            onClick={() => onAddToWatchlist?.(listing.id)}
            data-testid="deal-card-watchlist-btn"
          >
            <Heart size={14} />
          </Button>
          
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => window.open(listing.listingUrl, '_blank', 'noopener,noreferrer')}
            data-testid="deal-card-ebay-btn"
          >
            <ExternalLink size={14} className="mr-1.5" />
            View on eBay
          </Button>
        </div>
        
        {/* Grade Estimate Display */}
        {showGradeEstimate && (
          <div className="mt-4">
            <GradeEstimateCard
              estimate={gradeEstimate}
              loading={gradeLoading}
              error={gradeError}
              onRetry={handleEstimateGrade}
            />
          </div>
        )}
      </div>
    </div>
  );
};
