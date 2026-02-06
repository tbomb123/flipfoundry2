/**
 * ScoreBadge Component
 * Displays deal score with color-coded badge
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DealScore } from '@/types';

interface ScoreBadgeProps {
  score: DealScore;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    grade: 'text-sm',
    icon: 12,
  },
  md: {
    container: 'px-3 py-1 text-sm',
    grade: 'text-lg',
    icon: 16,
  },
  lg: {
    container: 'px-4 py-2 text-base',
    grade: 'text-2xl',
    icon: 20,
  },
};

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const isPositive = score.score > 40;
  const isNeutral = score.score >= 10 && score.score <= 40;
  
  const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg font-semibold backdrop-blur-sm',
        'border shadow-sm transition-all duration-200',
        sizeClasses[size].container,
        className
      )}
      style={{
        backgroundColor: `${score.color}15`,
        borderColor: `${score.color}30`,
        color: score.color,
      }}
    >
      <Icon size={sizeClasses[size].icon} className="flex-shrink-0" />
      <span className={sizeClasses[size].grade}>{score.grade}</span>
      {showLabel && (
        <span className="opacity-80 font-medium hidden sm:inline">{score.label}</span>
      )}
    </div>
  );
};

// Progress bar variant
interface ScoreProgressProps {
  score: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const progressSizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export const ScoreProgress: React.FC<ScoreProgressProps> = ({
  score,
  color = '#10B981',
  size = 'md',
  showValue = true,
  className,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 bg-slate-700/50 rounded-full overflow-hidden', progressSizeClasses[size])}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clampedScore}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}40`,
          }}
        />
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-slate-300 min-w-[3ch]">
          {Math.round(clampedScore)}
        </span>
      )}
    </div>
  );
};
