/**
 * Global eBay Request Queue Singleton
 * 
 * Ensures ONLY ONE queue instance exists across:
 * - Hot reloads (development)
 * - Multiple serverless instances (production)
 * 
 * Uses Node.js global object pattern to persist across module reloads.
 */

import PQueue from 'p-queue';

// Type declaration for global queue
declare global {
  // eslint-disable-next-line no-var
  var __ebayQueue: PQueue | undefined;
}

// Configuration for production stability
const QUEUE_CONFIG = {
  concurrency: 1,           // Only 1 request at a time
  intervalCap: 1,           // Max 1 request per interval
  interval: 1300,           // 1.3 seconds between requests (safety buffer)
  carryoverConcurrencyCount: true,  // Carry over running count to next interval
};

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
  return {
    size: ebayQueue.size,
    pending: ebayQueue.pending,
    isPaused: ebayQueue.isPaused,
  };
}

// Export for testing/debugging
export function clearQueue() {
  ebayQueue.clear();
  console.log('[EBAY QUEUE] Queue cleared');
}
