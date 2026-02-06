/**
 * FlipFoundry Scoring Engine
 * Calculates deal scores, market value estimates, and seller risk assessments
 * Optimized for parallel processing with concurrency control
 */

import type {
  Listing,
  ComparableSale,
  DealScore,
  MarketValueEstimate,
  SellerRiskProfile,
  ValuationResult,
  RiskLevel,
} from '@/types';
import {
  mapWithConcurrency,
  withRetry,
  withTimeout,
} from '@/lib/concurrency';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCORING_CONFIG = {
  // Deal score weights (must sum to 1)
  dealScore: {
    profitWeight: 0.4,
    roiWeight: 0.35,
    sellerRiskWeight: 0.15,
    marketConfidenceWeight: 0.1,
  },

  // Seller risk thresholds
  sellerRisk: {
    feedbackThresholds: {
      low: 98,
      medium: 95,
    },
    transactionThresholds: {
      low: 100,
      medium: 50,
    },
  },

  // Market value calculation
  marketValue: {
    outlierStdDev: 2,
    recencyDecayDays: 90,
    minSampleSize: 3,
    maxSampleSize: 50,
  },

  // Deal score thresholds
  dealScoreThresholds: {
    excellent: 70,
    great: 55,
    good: 40,
    fair: 25,
    poor: 10,
  },

  // Concurrency settings for parallel processing
  concurrency: {
    listingAnalysis: 4, // Process 4 listings simultaneously
    apiTimeout: 8000, // 8 second timeout per API call
    maxRetries: 2, // Retry failed requests up to 2 times
  },
};

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const stdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

const removeOutliers = (values: number[]): number[] => {
  if (values.length < 4) return values;

  const avg = mean(values);
  const deviation = stdDev(values);
  const threshold = SCORING_CONFIG.marketValue.outlierStdDev * deviation;

  return values.filter((v) => Math.abs(v - avg) <= threshold);
};

const weightedAverageByRecency = (values: number[], dates: string[]): number => {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const now = new Date().getTime();
  const decayMs = SCORING_CONFIG.marketValue.recencyDecayDays * 24 * 60 * 60 * 1000;

  let totalWeight = 0;
  let weightedSum = 0;

  values.forEach((value, i) => {
    const date = new Date(dates[i]).getTime();
    const ageMs = now - date;
    const recencyWeight = Math.max(0.3, 1 - ageMs / decayMs);

    weightedSum += value * recencyWeight;
    totalWeight += recencyWeight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : mean(values);
};

// ============================================================================
// MARKET VALUE ESTIMATION
// ============================================================================

export const estimateMarketValue = (
  listing: Listing,
  comparables: ComparableSale[]
): MarketValueEstimate => {
  const sameConditionComps = comparables.filter(
    (comp) =>
      comp.condition === listing.condition ||
      comp.condition === 'unknown' ||
      listing.condition === 'unknown'
  );

  const relevantComps =
    sameConditionComps.length >= SCORING_CONFIG.marketValue.minSampleSize
      ? sameConditionComps
      : comparables;

  if (relevantComps.length === 0) {
    return {
      estimatedValue: listing.currentPrice,
      confidenceInterval: {
        low: listing.currentPrice * 0.8,
        high: listing.currentPrice * 1.2,
      },
      methodology: 'No comparable sales found - using listing price as estimate',
      sampleSize: 0,
      confidence: 0.1,
    };
  }

  const prices = relevantComps.map((comp) => comp.soldPrice);
  const cleanPrices = removeOutliers(prices);

  const dates = relevantComps
    .filter((_, i) => prices[i] !== undefined && cleanPrices.includes(prices[i]))
    .map((comp) => comp.soldDate);

  const filteredPrices = cleanPrices.length > 0 ? cleanPrices : prices;

  const estimatedValue = weightedAverageByRecency(
    filteredPrices,
    dates.length === filteredPrices.length
      ? dates
      : relevantComps.map(() => new Date().toISOString())
  );

  const deviation = stdDev(filteredPrices);
  const standardError = deviation / Math.sqrt(filteredPrices.length);
  const marginOfError = 1.96 * standardError;

  const sampleSizeConfidence = Math.min(
    filteredPrices.length / SCORING_CONFIG.marketValue.minSampleSize,
    1
  );
  const varianceConfidence =
    deviation > 0 ? Math.max(0, 1 - deviation / estimatedValue) : 0.5;
  const confidence = sampleSizeConfidence * 0.6 + varianceConfidence * 0.4;

  return {
    estimatedValue: Math.round(estimatedValue * 100) / 100,
    confidenceInterval: {
      low: Math.max(0, Math.round((estimatedValue - marginOfError) * 100) / 100),
      high: Math.round((estimatedValue + marginOfError) * 100) / 100,
    },
    methodology: `Weighted average of ${filteredPrices.length} recent comparable sales (outliers removed)`,
    sampleSize: filteredPrices.length,
    confidence: Math.round(confidence * 100) / 100,
  };
};

// ============================================================================
// DEAL SCORE CALCULATION
// ============================================================================

export const calculateDealScore = (
  listing: Listing,
  marketValue: MarketValueEstimate
): DealScore => {
  const listingPrice = listing.currentPrice + (listing.shippingCost || 0);
  const estimatedValue = marketValue.estimatedValue;

  const potentialProfit = estimatedValue - listingPrice;
  const profitMargin = potentialProfit / estimatedValue;
  const roiPercentage = (potentialProfit / listingPrice) * 100;

  const profitScore = Math.min(Math.max(profitMargin * 200, 0), 100);
  const roiScore = Math.min(Math.max(roiPercentage * 1.5, 0), 100);
  const sellerRiskScore =
    listing.seller.riskLevel === 'low' ? 100 : listing.seller.riskLevel === 'medium' ? 60 : 20;
  const marketConfidenceScore = marketValue.confidence * 100;

  const { profitWeight, roiWeight, sellerRiskWeight, marketConfidenceWeight } =
    SCORING_CONFIG.dealScore;

  const rawScore =
    profitScore * profitWeight +
    roiScore * roiWeight +
    sellerRiskScore * sellerRiskWeight +
    marketConfidenceScore * marketConfidenceWeight;

  const score = Math.round(rawScore);

  let grade: DealScore['grade'];
  let label: string;
  let color: string;

  const { excellent, great, good, fair, poor } = SCORING_CONFIG.dealScoreThresholds;

  if (score >= excellent) {
    grade = 'A+';
    label = 'Excellent Deal';
    color = '#10B981';
  } else if (score >= great) {
    grade = 'A';
    label = 'Great Deal';
    color = '#34D399';
  } else if (score >= good) {
    grade = 'B+';
    label = 'Good Deal';
    color = '#22D3EE';
  } else if (score >= fair) {
    grade = 'B';
    label = 'Fair Deal';
    color = '#60A5FA';
  } else if (score >= poor) {
    grade = 'C';
    label = 'Below Average';
    color = '#FBBF24';
  } else if (score > 0) {
    grade = 'D';
    label = 'Poor Deal';
    color = '#F97316';
  } else {
    grade = 'F';
    label = 'Overpriced';
    color = '#EF4444';
  }

  return {
    score,
    grade,
    label,
    color,
    potentialProfit: Math.round(potentialProfit * 100) / 100,
    roiPercentage: Math.round(roiPercentage * 10) / 10,
    confidence: marketValue.confidence,
  };
};

// ============================================================================
// SELLER RISK ASSESSMENT
// ============================================================================

export const calculateSellerRisk = (listing: Listing): SellerRiskProfile => {
  const seller = listing.seller;
  const factors: string[] = [];
  let score = 100;

  if (seller.feedbackPercentage < 90) {
    score -= 40;
    factors.push(`Very low feedback rating (${seller.feedbackPercentage}%)`);
  } else if (seller.feedbackPercentage < 95) {
    score -= 25;
    factors.push(`Low feedback rating (${seller.feedbackPercentage}%)`);
  } else if (seller.feedbackPercentage < 98) {
    score -= 10;
    factors.push(`Moderate feedback rating (${seller.feedbackPercentage}%)`);
  }

  if (seller.totalTransactions < 10) {
    score -= 30;
    factors.push(`Very low transaction volume (${seller.totalTransactions})`);
  } else if (seller.totalTransactions < 50) {
    score -= 15;
    factors.push(`Low transaction volume (${seller.totalTransactions})`);
  } else if (seller.totalTransactions < 100) {
    score -= 5;
    factors.push(`Moderate transaction volume (${seller.totalTransactions})`);
  }

  if (seller.isTopRated) {
    score += 10;
    factors.push('Top-rated seller status');
  }

  score = Math.max(0, Math.min(100, score));

  let level: RiskLevel;
  let recommendation: string;

  if (score >= 80) {
    level = 'low';
    recommendation = 'This seller has excellent credentials. Low risk transaction.';
  } else if (score >= 50) {
    level = 'medium';
    recommendation = 'Exercise normal caution. Review seller feedback before purchasing.';
  } else {
    level = 'high';
    recommendation = 'High risk seller. Proceed with caution and consider buyer protection.';
  }

  return {
    level,
    score,
    factors: factors.length > 0 ? factors : ['No significant risk factors identified'],
    recommendation,
  };
};

// ============================================================================
// SINGLE LISTING ANALYSIS (with timeout and retry)
// ============================================================================

export const analyzeListing = async (
  listing: Listing,
  getComparables: (keywords: string) => Promise<ComparableSale[]>
): Promise<ValuationResult> => {
  // Fetch comparables with timeout and retry
  const comparables = await withRetry(
    () =>
      withTimeout(
        getComparables(listing.title),
        SCORING_CONFIG.concurrency.apiTimeout,
        `Timeout fetching comparables for "${listing.title.substring(0, 30)}..."`
      ),
    {
      maxRetries: SCORING_CONFIG.concurrency.maxRetries,
      shouldRetry: (error) => {
        // Retry on network errors, not on 4xx errors
        const message = error instanceof Error ? error.message : '';
        return message.includes('timeout') || message.includes('network');
      },
    }
  );

  const marketValue = estimateMarketValue(listing, comparables);
  const dealScore = calculateDealScore(listing, marketValue);
  const sellerRisk = calculateSellerRisk(listing);

  return {
    listing,
    comparableSales: comparables,
    marketValue,
    dealScore,
    sellerRisk,
    analysisTimestamp: new Date().toISOString(),
  };
};

// ============================================================================
// BATCH ANALYSIS WITH CONCURRENCY CONTROL
// ============================================================================

/**
 * Analyze multiple listings in parallel with controlled concurrency
 * Processes up to `concurrency` listings simultaneously
 * Target: Sub-3 second total execution time for 12 listings
 */
export const analyzeListings = async (
  listings: Listing[],
  getComparables: (keywords: string) => Promise<ComparableSale[]>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<ValuationResult[]> => {
  const { concurrency = SCORING_CONFIG.concurrency.listingAnalysis, onProgress } = options;

  if (listings.length === 0) {
    return [];
  }

  // For single listing, no need for concurrency
  if (listings.length === 1) {
    const result = await analyzeListing(listings[0], getComparables);
    onProgress?.(1, 1);
    return [result];
  }

  // Track completion for progress callbacks
  let completed = 0;
  const total = listings.length;

  // Process listings with concurrency limit
  const results = await mapWithConcurrency(
    listings,
    async (listing) => {
      try {
        const result = await analyzeListing(listing, getComparables);
        completed++;
        onProgress?.(completed, total);
        return result;
      } catch (error) {
        console.error(`Error analyzing listing ${listing.id}:`, error);
        completed++;
        onProgress?.(completed, total);

        // Return fallback result on error
        const fallbackResult: ValuationResult = {
          listing,
          comparableSales: [],
          marketValue: {
            estimatedValue: listing.currentPrice,
            confidenceInterval: {
              low: listing.currentPrice * 0.8,
              high: listing.currentPrice * 1.2,
            },
            methodology: 'Analysis failed - using fallback values',
            sampleSize: 0,
            confidence: 0,
          },
          dealScore: {
            score: 0,
            grade: 'F',
            label: 'Unable to Analyze',
            color: '#6B7280',
            potentialProfit: 0,
            roiPercentage: 0,
            confidence: 0,
          },
          sellerRisk: calculateSellerRisk(listing),
          analysisTimestamp: new Date().toISOString(),
        };
        return fallbackResult;
      }
    },
    { concurrency }
  );

  return results;
};

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

/**
 * Utility to measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  return result;
}
