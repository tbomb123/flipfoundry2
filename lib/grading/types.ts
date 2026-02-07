/**
 * Grading Provider Types
 * 
 * Common interfaces for all grading providers.
 */

export interface GradeInput {
  itemId: string;
  imageUrl: string;
  additionalImageUrls?: string[];
}

export interface GradeSubgrades {
  centering: number;   // 1-10
  corners: number;     // 1-10
  edges: number;       // 1-10
  surface: number;     // 1-10
}

export interface GradeResult {
  overallGrade: number;     // 1-10, decimals allowed
  subgrades: GradeSubgrades;
  confidence: number;       // 0-1
  provider: string;
  disclaimer: string;
  estimatedAt: string;
  rawResponse?: unknown;
}

export interface GradeProviderResponse {
  success: boolean;
  result?: GradeResult;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface GradeProvider {
  name: string;
  estimate(input: GradeInput): Promise<GradeProviderResponse>;
  isConfigured(): boolean;
}

// Standard disclaimer for all AI grading
export const GRADE_DISCLAIMER = 
  'This is an AI-generated estimate for informational purposes only. ' +
  'Actual grades from professional services (PSA, BGS, SGC) may differ significantly. ' +
  'Do not use this estimate for buying/selling decisions without professional verification.';

// Low confidence threshold - below this, we say "unable to estimate"
export const LOW_CONFIDENCE_THRESHOLD = 0.4;
