/**
 * Grade Estimate Card Component
 * 
 * Displays AI-generated grade estimates with subgrades and confidence.
 */

import React from 'react';
import { Star, Info, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface GradeEstimateData {
  overallGrade: number;
  subgrades: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
  };
  confidence: number;
  provider: string;
  disclaimer: string;
}

interface GradeEstimateCardProps {
  estimate: GradeEstimateData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Get confidence level from 0-1 value
 */
function getConfidenceLevel(confidence: number): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  if (confidence >= 0.8) {
    return {
      label: 'High',
      color: 'text-emerald-400',
      icon: <CheckCircle size={12} className="text-emerald-400" />,
    };
  }
  if (confidence >= 0.6) {
    return {
      label: 'Medium',
      color: 'text-amber-400',
      icon: <Info size={12} className="text-amber-400" />,
    };
  }
  return {
    label: 'Low',
    color: 'text-rose-400',
    icon: <AlertTriangle size={12} className="text-rose-400" />,
  };
}

/**
 * Get grade color based on value
 */
function getGradeColor(grade: number): string {
  if (grade >= 9) return 'text-emerald-400';
  if (grade >= 8) return 'text-green-400';
  if (grade >= 7) return 'text-lime-400';
  if (grade >= 6) return 'text-yellow-400';
  if (grade >= 5) return 'text-amber-400';
  return 'text-rose-400';
}

/**
 * Subgrade bar component
 */
function SubgradeBar({ 
  label, 
  value 
}: { 
  label: string; 
  value: number;
}) {
  const percentage = (value / 10) * 100;
  const color = getGradeColor(value);
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            value >= 9 ? "bg-emerald-500" :
            value >= 8 ? "bg-green-500" :
            value >= 7 ? "bg-lime-500" :
            value >= 6 ? "bg-yellow-500" :
            value >= 5 ? "bg-amber-500" : "bg-rose-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("w-8 text-right font-medium", color)}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

/**
 * Loading skeleton
 */
function GradeEstimateSkeleton() {
  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-slate-700 rounded-full" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-slate-700 rounded mb-1" />
          <div className="h-3 w-16 bg-slate-700 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-16 h-3 bg-slate-700 rounded" />
            <div className="flex-1 h-1.5 bg-slate-700 rounded" />
            <div className="w-8 h-3 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Error state
 */
function GradeEstimateError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-3 bg-rose-900/20 rounded-lg border border-rose-800/50">
      <div className="flex items-start gap-2 text-rose-400">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div className="text-xs flex-1">
          <p className="font-medium mb-1">Unable to Estimate Grade</p>
          <p className="text-rose-300/80">{message}</p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="mt-2 text-rose-400 hover:text-rose-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main Grade Estimate Card
 */
export const GradeEstimateCard: React.FC<GradeEstimateCardProps> = ({
  estimate,
  loading,
  error,
  onRetry,
  className,
}) => {
  if (loading) {
    return <GradeEstimateSkeleton />;
  }

  if (error) {
    return <GradeEstimateError message={error} onRetry={onRetry} />;
  }

  if (!estimate) {
    return null;
  }

  const confidenceLevel = getConfidenceLevel(estimate.confidence);
  const gradeColor = getGradeColor(estimate.overallGrade);

  return (
    <TooltipProvider>
      <div className={cn(
        "p-3 bg-slate-800/50 rounded-lg border border-amber-600/30",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30"
            )}>
              <span className={cn("text-lg font-bold", gradeColor)}>
                {estimate.overallGrade.toFixed(1)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white">
                  Estimated Grade
                </span>
                <span className="text-xs text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  AI
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {confidenceLevel.icon}
                <span className={confidenceLevel.color}>
                  {confidenceLevel.label} confidence
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle size={10} className="text-slate-500" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Better photos → better estimate</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Subgrades */}
        <div className="space-y-1.5 mb-3">
          <SubgradeBar label="Centering" value={estimate.subgrades.centering} />
          <SubgradeBar label="Corners" value={estimate.subgrades.corners} />
          <SubgradeBar label="Edges" value={estimate.subgrades.edges} />
          <SubgradeBar label="Surface" value={estimate.subgrades.surface} />
        </div>

        {/* Disclaimers */}
        <div className="pt-2 border-t border-slate-700/50 space-y-1">
          <p className="text-[10px] text-slate-500 flex items-start gap-1">
            <Info size={10} className="mt-0.5 shrink-0" />
            AI estimate only. Not PSA/BGS/SGC. Actual grade may differ.
          </p>
          <p className="text-[10px] text-slate-500 flex items-start gap-1">
            <Star size={10} className="mt-0.5 shrink-0" />
            Results depend on photo quality and angles.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GradeEstimateCard;
