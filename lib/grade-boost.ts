/**
 * Grade Score Boost Calculator
 * 
 * Calculates score boosts for raw cards based on AI grade estimates.
 * Only applies when confidence threshold is met.
 */

export interface GradeBoostInput {
  overallGrade: number;
  confidence: number;
}

export interface GradeBoostResult {
  boost: number;
  reason: string | null;
  applied: boolean;
  details: {
    grade: number;
    confidence: number;
    confidenceThreshold: number;
    meetsConfidenceThreshold: boolean;
  };
}

// Configuration
const CONFIDENCE_THRESHOLD = 0.7;
const HIGH_GRADE_THRESHOLD = 9.0;
const MID_GRADE_THRESHOLD = 8.0;
const HIGH_GRADE_BOOST = 15;
const MID_GRADE_BOOST = 7;

/**
 * Calculate grade-based score boost
 * 
 * Rules:
 * - Grade >= 9.0 AND confidence >= 0.7 → +15 boost
 * - Grade 8.0-8.9 AND confidence >= 0.7 → +7 boost
 * - Confidence < 0.7 → no boost
 */
export function calculateGradeBoost(input: GradeBoostInput | null): GradeBoostResult {
  // No estimate available
  if (!input) {
    return {
      boost: 0,
      reason: null,
      applied: false,
      details: {
        grade: 0,
        confidence: 0,
        confidenceThreshold: CONFIDENCE_THRESHOLD,
        meetsConfidenceThreshold: false,
      },
    };
  }

  const { overallGrade, confidence } = input;
  const meetsConfidenceThreshold = confidence >= CONFIDENCE_THRESHOLD;

  // Confidence too low - no boost
  if (!meetsConfidenceThreshold) {
    return {
      boost: 0,
      reason: `Grade ${overallGrade.toFixed(1)} (low confidence - no boost)`,
      applied: false,
      details: {
        grade: overallGrade,
        confidence,
        confidenceThreshold: CONFIDENCE_THRESHOLD,
        meetsConfidenceThreshold: false,
      },
    };
  }

  // High grade boost (9.0+)
  if (overallGrade >= HIGH_GRADE_THRESHOLD) {
    return {
      boost: HIGH_GRADE_BOOST,
      reason: `Gem Mint potential (${overallGrade.toFixed(1)}) +${HIGH_GRADE_BOOST}`,
      applied: true,
      details: {
        grade: overallGrade,
        confidence,
        confidenceThreshold: CONFIDENCE_THRESHOLD,
        meetsConfidenceThreshold: true,
      },
    };
  }

  // Mid grade boost (8.0-8.9)
  if (overallGrade >= MID_GRADE_THRESHOLD) {
    return {
      boost: MID_GRADE_BOOST,
      reason: `Near Mint grade (${overallGrade.toFixed(1)}) +${MID_GRADE_BOOST}`,
      applied: true,
      details: {
        grade: overallGrade,
        confidence,
        confidenceThreshold: CONFIDENCE_THRESHOLD,
        meetsConfidenceThreshold: true,
      },
    };
  }

  // Grade below 8.0 - no boost
  return {
    boost: 0,
    reason: `Grade ${overallGrade.toFixed(1)} (below boost threshold)`,
    applied: false,
    details: {
      grade: overallGrade,
      confidence,
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      meetsConfidenceThreshold: true,
    },
  };
}

/**
 * Apply grade boost to a base score
 */
export function applyGradeBoost(baseScore: number, gradeInput: GradeBoostInput | null): {
  finalScore: number;
  boost: GradeBoostResult;
} {
  const boost = calculateGradeBoost(gradeInput);
  const finalScore = Math.min(100, baseScore + boost.boost); // Cap at 100
  
  return {
    finalScore,
    boost,
  };
}

// Export configuration for reference
export const GRADE_BOOST_CONFIG = {
  CONFIDENCE_THRESHOLD,
  HIGH_GRADE_THRESHOLD,
  MID_GRADE_THRESHOLD,
  HIGH_GRADE_BOOST,
  MID_GRADE_BOOST,
};
