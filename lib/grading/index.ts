/**
 * Grading Provider Selector
 * 
 * Pluggable provider system for card grading.
 * Selects provider based on configuration and availability.
 * 
 * Provider priority:
 * 1. Ximilar (if XIMILAR_API_TOKEN is set)
 * 2. Mock (fallback for development)
 */

import PQueue from 'p-queue';
import type { GradeInput, GradeProvider, GradeProviderResponse, GradeResult } from './types';
import { ximilarProvider } from './providers/ximilar';
import { mockProvider } from './providers/mock';
import { GRADE_DISCLAIMER, LOW_CONFIDENCE_THRESHOLD } from './types';

// Re-export types
export * from './types';

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

const providers: Record<string, GradeProvider> = {
  ximilar: ximilarProvider,
  mock: mockProvider,
};

/**
 * Get the active provider based on configuration
 */
function getActiveProvider(): GradeProvider {
  // Priority 1: Ximilar if configured
  if (ximilarProvider.isConfigured()) {
    console.log('[GRADING] Using Ximilar provider');
    return ximilarProvider;
  }
  
  // Fallback: Mock provider
  console.log('[GRADING] Using Mock provider (Ximilar not configured)');
  return mockProvider;
}

/**
 * Force a specific provider (for testing)
 */
export function getProvider(name: string): GradeProvider | null {
  return providers[name] || null;
}

// ============================================================================
// AI GRADING QUEUE - Isolated from eBay queue
// ============================================================================

declare global {
  // eslint-disable-next-line no-var
  var __gradingQueue: PQueue | undefined;
}

const GRADING_QUEUE_CONFIG = {
  concurrency: 1,
  interval: 2000,     // 1 request per 2 seconds
  intervalCap: 1,
  carryoverConcurrencyCount: true,
};

function getGradingQueue(): PQueue {
  if (!global.__gradingQueue) {
    console.log('[GRADING] Creating new grading request queue');
    global.__gradingQueue = new PQueue(GRADING_QUEUE_CONFIG);
    
    global.__gradingQueue.on('active', () => {
      console.log(`[GRADING QUEUE] Active. Size: ${global.__gradingQueue!.size}, Pending: ${global.__gradingQueue!.pending}`);
    });
  }
  return global.__gradingQueue;
}

export const gradingQueue = getGradingQueue();

// ============================================================================
// MAIN GRADING FUNCTION
// ============================================================================

/**
 * Estimate card grade using configured provider
 * Routes through queue for rate limiting
 */
export async function estimateGrade(input: GradeInput): Promise<GradeProviderResponse> {
  const provider = getActiveProvider();
  
  console.log(`[GRADING] Queuing grade estimate for item ${input.itemId} via ${provider.name}`);
  
  const response = await gradingQueue.add(async () => {
    console.log(`[GRADING] Processing grade estimate for item ${input.itemId}`);
    return provider.estimate(input);
  });
  
  if (!response) {
    return {
      success: false,
      error: {
        code: 'QUEUE_ERROR',
        message: 'Grading queue returned null',
        retryable: true,
      },
    };
  }
  
  return response;
}

/**
 * Get grading system status
 */
export function getGradingStatus() {
  const activeProvider = getActiveProvider();
  
  return {
    activeProvider: activeProvider.name,
    providerConfigured: activeProvider.isConfigured(),
    availableProviders: Object.keys(providers),
    queue: {
      size: gradingQueue.size,
      pending: gradingQueue.pending,
    },
    config: {
      lowConfidenceThreshold: LOW_CONFIDENCE_THRESHOLD,
    },
  };
}

/**
 * Check if grading is available
 */
export function isGradingAvailable(): boolean {
  return getActiveProvider().isConfigured();
}
