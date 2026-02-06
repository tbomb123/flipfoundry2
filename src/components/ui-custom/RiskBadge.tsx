/**
 * RiskBadge Component
 * Displays seller risk level with appropriate styling
 */

import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskLevel, SellerRiskProfile } from '@/types';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const riskConfig: Record<RiskLevel, {
  icon: typeof Shield;
  label: string;
  color: string;
  bgColor: string;
}> = {
  low: {
    icon: ShieldCheck,
    label: 'Low Risk',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  medium: {
    icon: ShieldAlert,
    label: 'Medium Risk',
    color: '#FBBF24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
  },
  high: {
    icon: ShieldX,
    label: 'High Risk',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
  },
};

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 text-xs gap-1',
    icon: 12,
  },
  md: {
    container: 'px-3 py-1 text-sm gap-1.5',
    icon: 16,
  },
  lg: {
    container: 'px-4 py-2 text-base gap-2',
    icon: 20,
  },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const config = riskConfig[level];
  const Icon = config.icon;
  
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg font-medium backdrop-blur-sm',
        'border transition-all duration-200',
        sizeClasses[size].container,
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        borderColor: `${config.color}30`,
        color: config.color,
      }}
    >
      <Icon size={sizeClasses[size].icon} className="flex-shrink-0" />
      {showLabel && (
        <span>
          {config.label}
          {score !== undefined && (
            <span className="opacity-70 ml-1">({score})</span>
          )}
        </span>
      )}
    </div>
  );
};

// Detailed risk panel
interface RiskPanelProps {
  riskProfile: SellerRiskProfile;
  className?: string;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  riskProfile,
  className,
}) => {
  const config = riskConfig[riskProfile.level];
  
  return (
    <div
      className={cn(
        'p-4 rounded-xl border backdrop-blur-sm',
        className
      )}
      style={{
        backgroundColor: config.bgColor,
        borderColor: `${config.color}30`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <config.icon size={20} style={{ color: config.color }} />
        <span className="font-semibold" style={{ color: config.color }}>
          {config.label}
        </span>
        <span className="text-slate-400 text-sm">Score: {riskProfile.score}/100</span>
      </div>
      
      <p className="text-slate-300 text-sm mb-3">{riskProfile.recommendation}</p>
      
      {riskProfile.factors.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Risk Factors:</span>
          <ul className="text-sm text-slate-400 space-y-0.5">
            {riskProfile.factors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-slate-600 mt-1">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
