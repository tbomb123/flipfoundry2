/**
 * Global eBay Request Queue Singleton with Circuit Breaker
 * 
 * Ensures ONLY ONE queue instance exists across:
 * - Hot reloads (development)
 * - Multiple serverless instances (production)
 * 
 * Uses Node.js global object pattern to persist across module reloads.
 * 
 * Circuit Breaker: Automatically pauses requests on errorId 10001
 * to protect marketplace reputation.
 */

import PQueue from 'p-queue';

// Type declaration for global queue and circuit breaker state
declare global {
  // eslint-disable-next-line no-var
  var __ebayQueue: PQueue | undefined;
  // eslint-disable-next-line no-var
  var __ebayCircuitBreaker: {
    isOpen: boolean;
    cooldownUntil: number;
    tripCount: number;
  } | undefined;
}

// Configuration for production stability
const QUEUE_CONFIG = {
  concurrency: 1,           // Only 1 request at a time
  intervalCap: 1,           // Max 1 request per interval
  interval: 1300,           // 1.3 seconds between requests (safety buffer)
  carryoverConcurrencyCount: true,  // Carry over running count to next interval
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  cooldownMs: 60000,        // 60 second cooldown
  maxCooldownMs: 300000,    // Max 5 minute cooldown (progressive)
};

/**
 * Initialize circuit breaker state
 */
function getCircuitBreaker() {
  if (!global.__ebayCircuitBreaker) {
    global.__ebayCircuitBreaker = {
      isOpen: false,
      cooldownUntil: 0,
      tripCount: 0,
    };
  }
  return global.__ebayCircuitBreaker;
}

/**
 * Trip the circuit breaker (on errorId 10001)
 */
export function tripCircuitBreaker(): void {
  const cb = getCircuitBreaker();
  cb.tripCount++;
  
  // Progressive cooldown: 60s, 120s, 180s, 240s, 300s (max)
  const cooldownMs = Math.min(
    CIRCUIT_BREAKER_CONFIG.cooldownMs * cb.tripCount,
    CIRCUIT_BREAKER_CONFIG.maxCooldownMs
  );
  
  cb.isOpen = true;
  cb.cooldownUntil = Date.now() + cooldownMs;
  
  console.log(`[CIRCUIT BREAKER] TRIPPED! Cooldown for ${cooldownMs / 1000} seconds (trip #${cb.tripCount})`);
  console.log(`[CIRCUIT BREAKER] Requests blocked until: ${new Date(cb.cooldownUntil).toISOString()}`);
  
  // Schedule automatic reset
  setTimeout(() => {
    resetCircuitBreaker();
  }, cooldownMs);
}

/**
 * Reset the circuit breaker after cooldown
 */
export function resetCircuitBreaker(): void {
  const cb = getCircuitBreaker();
  
  if (cb.isOpen && Date.now() >= cb.cooldownUntil) {
    cb.isOpen = false;
    console.log('[CIRCUIT BREAKER] RESET. Resuming normal operations.');
    console.log(`[CIRCUIT BREAKER] Total trips in session: ${cb.tripCount}`);
  }
}

/**
 * Check if circuit breaker is blocking requests
 */
export function isCircuitBreakerOpen(): boolean {
  const cb = getCircuitBreaker();
  
  // Auto-reset if cooldown has passed
  if (cb.isOpen && Date.now() >= cb.cooldownUntil) {
    resetCircuitBreaker();
  }
  
  return cb.isOpen;
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus() {
  const cb = getCircuitBreaker();
  const now = Date.now();
  
  return {
    isOpen: cb.isOpen,
    cooldownUntil: cb.cooldownUntil,
    remainingCooldownMs: cb.isOpen ? Math.max(0, cb.cooldownUntil - now) : 0,
    tripCount: cb.tripCount,
  };
}

/**
 * Check response for errorId 10001 and trip breaker if found
 */
export function checkForRateLimitError(responseText: string): boolean {
  if (responseText.includes('errorId') && responseText.includes('10001')) {
    console.log('[CIRCUIT BREAKER] Detected errorId 10001 (rate limit/security error)');
    tripCircuitBreaker();
    return true;
  }
  return false;
}

/**
 * Get or create the global eBay queue singleton
 */
function getEbayQueue(): PQueue {
  if (!global.__ebayQueue) {
    console.log('[EBAY QUEUE] Creating new global singleton queue');
    
    global.__ebayQueue = new PQueue(QUEUE_CONFIG);
    
    // Log queue activity
    global.__ebayQueue.on('active', () => {
      console.log(`[EBAY QUEUE] Active. Size: ${global.__ebayQueue!.size}, Pending: ${global.__ebayQueue!.pending}`);
    });
    
    global.__ebayQueue.on('idle', () => {
      console.log('[EBAY QUEUE] Idle. All requests processed.');
    });
    
    global.__ebayQueue.on('add', () => {
      console.log(`[EBAY QUEUE] Request added. Queue size: ${global.__ebayQueue!.size}`);
    });
  } else {
    console.log('[EBAY QUEUE] Reusing existing global singleton queue');
  }
  
  return global.__ebayQueue;
}

// Export the singleton queue
export const ebayQueue = getEbayQueue();

// Export queue status helper
export function getQueueStatus() {
  const cbStatus = getCircuitBreakerStatus();
  
  return {
    size: ebayQueue.size,
    pending: ebayQueue.pending,
    isPaused: ebayQueue.isPaused,
    circuitBreaker: cbStatus,
  };
}

// Export for testing/debugging
export function clearQueue() {
  ebayQueue.clear();
  console.log('[EBAY QUEUE] Queue cleared');
}

// Reset trip count (for manual recovery)
export function resetTripCount() {
  const cb = getCircuitBreaker();
  cb.tripCount = 0;
  console.log('[CIRCUIT BREAKER] Trip count reset to 0');
}
