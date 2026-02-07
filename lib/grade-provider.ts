/**
 * AI Grade Provider
 * 
 * Abstraction layer for AI-powered card grading services.
 * Currently a placeholder - swap implementation when integrating real provider.
 * 
 * Potential providers to integrate:
 * - OpenAI GPT-4 Vision
 * - Google Gemini
 * - Custom trained model
 */

import PQueue from 'p-queue';
import type { GradeEstimate } from './grade-cache';

// ============================================================================
// AI REQUEST QUEUE - Separate from eBay queue for isolation
// ============================================================================

declare global {
  // eslint-disable-next-line no-var
  var __aiGradeQueue: PQueue | undefined;
}

const AI_QUEUE_CONFIG = {
  concurrency: 1,
  interval: 2000,     // 1 request per 2 seconds
  intervalCap: 1,
};

function getAIQueue(): PQueue {
  if (!global.__aiGradeQueue) {
    console.log('[AI GRADE] Creating new AI grading queue');
    global.__aiGradeQueue = new PQueue(AI_QUEUE_CONFIG);
  }
  return global.__aiGradeQueue;
}

export const aiGradeQueue = getAIQueue();

// ============================================================================
// GRADE PROVIDER INTERFACE
// ============================================================================

export interface GradeInput {
  itemId: string;
  imageUrl: string;
  additionalImageUrls?: string[];
}

export interface GradeProviderResult {
  overallGrade: number;
  subgrades: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
  };
  confidence: number;
  rawResponse?: unknown;
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Mock provider for development/testing
 * Returns realistic-looking grades without making any API calls
 */
async function mockGradeProvider(input: GradeInput): Promise<GradeProviderResult> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate deterministic but varied grades based on itemId hash
  const hash = input.itemId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const baseGrade = 6 + (Math.abs(hash % 40) / 10); // 6.0 - 9.9 range
  const variance = 0.5;
  
  const subgrades = {
    centering: Math.max(1, Math.min(10, baseGrade + (Math.abs((hash * 2) % 10) - 5) / 10 * variance)),
    corners: Math.max(1, Math.min(10, baseGrade + (Math.abs((hash * 3) % 10) - 5) / 10 * variance)),
    edges: Math.max(1, Math.min(10, baseGrade + (Math.abs((hash * 5) % 10) - 5) / 10 * variance)),
    surface: Math.max(1, Math.min(10, baseGrade + (Math.abs((hash * 7) % 10) - 5) / 10 * variance)),
  };
  
  // Round to 1 decimal place
  const roundGrade = (g: number) => Math.round(g * 10) / 10;
  
  return {
    overallGrade: roundGrade(baseGrade),
    subgrades: {
      centering: roundGrade(subgrades.centering),
      corners: roundGrade(subgrades.corners),
      edges: roundGrade(subgrades.edges),
      surface: roundGrade(subgrades.surface),
    },
    confidence: 0.65 + (Math.abs(hash % 30) / 100), // 0.65 - 0.95 range
  };
}

/**
 * Placeholder for real AI provider integration
 * TODO: Implement when integrating OpenAI/Gemini/etc.
 */
// async function openAIGradeProvider(input: GradeInput): Promise<GradeProviderResult> {
//   // Implementation will go here
//   throw new Error('OpenAI provider not yet implemented');
// }

// ============================================================================
// MAIN GRADING FUNCTION
// ============================================================================

type ProviderType = 'mock' | 'openai' | 'gemini';

const ACTIVE_PROVIDER: ProviderType = 'mock'; // Change when real provider is ready

const DISCLAIMER = 
  'This is an AI-generated estimate for informational purposes only. ' +
  'Actual grades from professional services (PSA, BGS, SGC) may differ significantly. ' +
  'Do not use this estimate for buying/selling decisions without professional verification.';

/**
 * Estimate card grade using AI
 * Routes through queue for rate limiting
 */
export async function estimateGrade(input: GradeInput): Promise<GradeEstimate> {
  console.log(`[AI GRADE] Queuing grade estimate for item ${input.itemId}`);
  
  const result = await aiGradeQueue.add(async () => {
    console.log(`[AI GRADE] Processing grade estimate for item ${input.itemId}`);
    
    let providerResult: GradeProviderResult;
    
    switch (ACTIVE_PROVIDER) {
      case 'mock':
        providerResult = await mockGradeProvider(input);
        break;
      // case 'openai':
      //   providerResult = await openAIGradeProvider(input);
      //   break;
      default:
        providerResult = await mockGradeProvider(input);
    }
    
    return providerResult;
  });
  
  if (!result) {
    throw new Error('Grade estimation failed - queue returned null');
  }
  
  return {
    itemId: input.itemId,
    overallGrade: result.overallGrade,
    subgrades: result.subgrades,
    confidence: result.confidence,
    provider: ACTIVE_PROVIDER === 'mock' ? 'mock-v1' : ACTIVE_PROVIDER,
    disclaimer: DISCLAIMER,
    estimatedAt: new Date().toISOString(),
  };
}

/**
 * Get provider status
 */
export function getGradeProviderStatus() {
  return {
    activeProvider: ACTIVE_PROVIDER,
    queueSize: aiGradeQueue.size,
    queuePending: aiGradeQueue.pending,
    isMocked: ACTIVE_PROVIDER === 'mock',
  };
}
