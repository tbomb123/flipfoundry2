/**
 * Alert Worker
 * 
 * Background job that executes saved searches with alerts enabled,
 * detects deals above threshold, and sends email notifications.
 * 
 * SAFETY CONTROLS:
 * - Global scan budget (max 20 per run)
 * - Deterministic scheduling (next_run_at based)
 * - Single execution per invocation (no loops)
 * - Feature flag protection (FEATURE_EBAY_CALLS)
 * 
 * IMPORTANT: This is the ONLY place where saved searches trigger eBay calls.
 * Saving a search does NOT call eBay - only this worker does.
 */

import { 
  getScheduledSearches,
  countPendingSearches,
  scheduleNextRun,
  type SavedSearchFilters,
} from './saved-searches';
import { wasAlertSent, recordAlert } from './alert-history';
import { sendDealAlertEmail, isEmailConfigured } from './email';
import { isDatabaseConfigured } from './db';
import { FEATURE_FLAGS } from './ebay-server';
import { getRedis, isRedisConfigured } from './redis';
import type { SavedSearch } from '@prisma/client';

// =============================================================================
// CONSTANTS - SAFETY LIMITS
// =============================================================================

/**
 * Maximum saved searches processed per worker invocation.
 * Hard safety limit to prevent burst traffic to eBay.
 * Searches beyond this limit are deferred to the next cycle.
 */
const SCAN_BUDGET_PER_RUN = 20;

/**
 * Minimum interval between worker runs (seconds).
 * Prevents accidental rapid re-invocation.
 */
const MIN_WORKER_INTERVAL_SECONDS = 30;

/**
 * Distributed lock key for preventing concurrent worker executions.
 */
const WORKER_LOCK_KEY = 'alerts_worker_lock';

/**
 * Lock TTL in seconds (10 minutes).
 * Lock releases automatically via TTL - no manual release needed.
 */
const WORKER_LOCK_TTL_SECONDS = 600;

// Track last worker run time (in-memory, per-instance)
let lastWorkerRunAt: number = 0;

// =============================================================================
// TYPES
// =============================================================================

interface WorkerConfig {
  scanBudget: number;           // Max searches per run (default: 20)
  dryRun: boolean;              // Skip actual eBay calls and emails
  maxDealsPerAlert: number;     // Max deals to include in one email
}

interface Deal {
  itemId: string;
  title: string;
  price: number;
  dealScore: number;
  imageUrl?: string;
  itemUrl: string;
  estimatedProfit?: number;
}

interface SearchExecutionResult {
  searchId: string;
  searchName: string;
  executed: boolean;
  dealsFound: number;
  alertSent: boolean;
  error?: string;
  simulatedDueToFlag?: boolean;
}

interface WorkerResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  config: {
    scanBudget: number;
    dryRun: boolean;
    ebayCallsEnabled: boolean;
  };
  stats: {
    totalPending: number;
    processed: number;
    deferred: number;
    alertsSent: number;
    errors: number;
  };
  executions: SearchExecutionResult[];
  budgetExhausted: boolean;
  skippedDueToLock?: boolean;
  lockInfo?: {
    acquired: boolean;
    key: string;
    ttlSeconds: number;
  };
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: WorkerConfig = {
  scanBudget: SCAN_BUDGET_PER_RUN,
  dryRun: false,
  maxDealsPerAlert: 5,
};

// =============================================================================
// DISTRIBUTED LOCK (Redis)
// =============================================================================

/**
 * Attempt to acquire distributed lock for worker execution.
 * Uses Redis SET NX (set if not exists) with TTL.
 * 
 * @returns true if lock acquired, false if lock already held
 */
async function acquireWorkerLock(): Promise<boolean> {
  const redis = getRedis();
  
  if (!redis) {
    // No Redis = no distributed locking, allow execution
    console.log('[WORKER LOCK] Redis not configured, skipping distributed lock');
    return true;
  }

  try {
    // SET key value NX EX ttl
    // NX = only set if not exists
    // EX = expire in seconds
    const lockValue = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await redis.set(WORKER_LOCK_KEY, lockValue, {
      nx: true,  // Only set if not exists
      ex: WORKER_LOCK_TTL_SECONDS,  // TTL in seconds
    });

    if (result === 'OK') {
      console.log(`[WORKER LOCK] Acquired lock: ${WORKER_LOCK_KEY} (TTL: ${WORKER_LOCK_TTL_SECONDS}s)`);
      return true;
    } else {
      console.log(`[WORKER LOCK] Worker skipped — lock active`);
      return false;
    }
  } catch (error) {
    console.error('[WORKER LOCK] Failed to acquire lock:', error);
    // On Redis error, allow execution (fail-open for availability)
    return true;
  }
}

/**
 * Check if worker lock is currently held.
 */
async function isWorkerLockHeld(): Promise<boolean> {
  const redis = getRedis();
  
  if (!redis) {
    return false;
  }

  try {
    const value = await redis.get(WORKER_LOCK_KEY);
    return value !== null;
  } catch {
    return false;
  }
}

/**
 * Get remaining TTL on worker lock (for monitoring).
 */
async function getWorkerLockTTL(): Promise<number | null> {
  const redis = getRedis();
  
  if (!redis) {
    return null;
  }

  try {
    const ttl = await redis.ttl(WORKER_LOCK_KEY);
    return ttl > 0 ? ttl : null;
  } catch {
    return null;
  }
}

// =============================================================================
// SEARCH EXECUTION
// =============================================================================

/**
 * Execute a single saved search and return matching deals.
 * 
 * When FEATURE_EBAY_CALLS=false, returns empty array (simulated execution).
 * This ensures scheduling continues to work without hitting eBay.
 */
async function executeSearch(
  search: SavedSearch,
  config: WorkerConfig
): Promise<{ deals: Deal[]; simulated: boolean }> {
  const filters = search.filters as SavedSearchFilters;

  // VENDOR PROTECTION: Check feature flag
  if (!FEATURE_FLAGS.ENABLE_EBAY_CALLS) {
    console.log(`[WORKER] SIMULATED execution for "${search.name}" (FEATURE_EBAY_CALLS=false)`);
    console.log(`[WORKER]   Query: "${search.query}", MinScore: ${search.minimumScore}`);
    console.log(`[WORKER]   Filters:`, filters);
    return { deals: [], simulated: true };
  }

  if (config.dryRun) {
    console.log(`[WORKER] DRY RUN: Would execute search "${search.name}"`);
    return { deals: [], simulated: true };
  }

  // TODO: Implement actual eBay search when FEATURE_EBAY_CALLS=true
  // This is where we would call the search API:
  //
  // const results = await searchEbay({
  //   query: search.query,
  //   priceMin: filters.priceMin,
  //   priceMax: filters.priceMax,
  //   category: filters.category,
  //   condition: filters.condition,
  // });
  //
  // return {
  //   deals: results
  //     .filter(item => item.dealScore >= search.minimumScore)
  //     .map(item => ({
  //       itemId: item.itemId,
  //       title: item.title,
  //       price: item.price.current,
  //       dealScore: item.dealScore,
  //       imageUrl: item.imageUrl,
  //       itemUrl: item.viewItemUrl,
  //       estimatedProfit: item.estimatedProfit,
  //     })),
  //   simulated: false,
  // };

  console.log(`[WORKER] eBay search execution for "${search.name}" - NOT YET IMPLEMENTED`);
  return { deals: [], simulated: false };
}

/**
 * Process a single saved search: execute, filter, dedupe, alert, reschedule
 */
async function processSearch(
  search: SavedSearch,
  config: WorkerConfig
): Promise<SearchExecutionResult> {
  const result: SearchExecutionResult = {
    searchId: search.id,
    searchName: search.name,
    executed: false,
    dealsFound: 0,
    alertSent: false,
  };

  try {
    // Execute search
    const { deals, simulated } = await executeSearch(search, config);
    result.executed = true;
    result.simulatedDueToFlag = simulated;
    result.dealsFound = deals.length;

    // Schedule next run BEFORE processing deals (ensures rescheduling even on error)
    await scheduleNextRun(search.id, search.runFrequencyMinutes);

    if (deals.length === 0) {
      return result;
    }

    // Filter out already-alerted items (deduplication)
    const newDeals: Deal[] = [];
    for (const deal of deals) {
      const alreadySent = await wasAlertSent(search.id, deal.itemId);
      if (!alreadySent) {
        newDeals.push(deal);
      }
    }

    if (newDeals.length === 0) {
      console.log(`[WORKER] All ${deals.length} deals already alerted for "${search.name}"`);
      return result;
    }

    // Limit deals per alert
    const dealsToAlert = newDeals.slice(0, config.maxDealsPerAlert);

    // TODO: Send email alert when user emails are available
    // For now, log and record the alert
    console.log(`[WORKER] Would send alert for "${search.name}": ${dealsToAlert.length} deals`);

    // Record alerts (for deduplication)
    for (const deal of dealsToAlert) {
      await recordAlert({
        savedSearchId: search.id,
        itemId: deal.itemId,
        dealScore: deal.dealScore,
        alertType: 'email',
      });
    }

    result.alertSent = true;
    return result;

  } catch (error) {
    console.error(`[WORKER] Error processing search "${search.name}":`, error);
    
    // Still reschedule on error to prevent stuck searches
    try {
      await scheduleNextRun(search.id, search.runFrequencyMinutes);
    } catch (scheduleError) {
      console.error(`[WORKER] Failed to reschedule search ${search.id}:`, scheduleError);
    }
    
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

// =============================================================================
// MAIN WORKER ENTRY POINT
// =============================================================================

/**
 * Main worker entry point.
 * Called by cron job or manual trigger via API.
 * 
 * EXECUTES ONCE PER INVOCATION - does NOT loop.
 * 
 * Safety controls:
 * - Distributed lock (Redis) - prevents concurrent execution
 * - Scan budget (max 20 searches)
 * - Feature flag (FEATURE_EBAY_CALLS)
 * - Scheduling (next_run_at based selection)
 * - Rate limiting (min interval between runs)
 */
export async function runAlertWorker(
  overrides: Partial<WorkerConfig> = {}
): Promise<WorkerResult> {
  const startedAt = new Date();
  const config = { ...DEFAULT_CONFIG, ...overrides };
  
  const result: WorkerResult = {
    success: false,
    startedAt: startedAt.toISOString(),
    completedAt: '',
    durationMs: 0,
    config: {
      scanBudget: config.scanBudget,
      dryRun: config.dryRun,
      ebayCallsEnabled: FEATURE_FLAGS.ENABLE_EBAY_CALLS,
    },
    stats: {
      totalPending: 0,
      processed: 0,
      deferred: 0,
      alertsSent: 0,
      errors: 0,
    },
    executions: [],
    budgetExhausted: false,
    skippedDueToLock: false,
    lockInfo: {
      acquired: false,
      key: WORKER_LOCK_KEY,
      ttlSeconds: WORKER_LOCK_TTL_SECONDS,
    },
  };

  console.log('[WORKER] ========================================');
  console.log('[WORKER] Alert Worker Run Starting');
  console.log('[WORKER] ========================================');

  // ==========================================================================
  // RUNTIME DIAGNOSTICS - Redis initialization check
  // ==========================================================================
  const redisUrlPresent = !!process.env.UPSTASH_REDIS_REST_URL;
  const redisTokenPresent = !!process.env.UPSTASH_REDIS_REST_TOKEN;
  const redisClientInitialized = getRedis() !== null;
  
  console.log('[WORKER] Redis Diagnostics:');
  console.log(`[WORKER]   REDIS_URL present: ${redisUrlPresent}`);
  console.log(`[WORKER]   REDIS_TOKEN present: ${redisTokenPresent}`);
  console.log(`[WORKER]   Redis client initialized: ${redisClientInitialized}`);

  // ==========================================================================
  // DISTRIBUTED LOCK - Prevent concurrent executions
  // ==========================================================================
  const lockAcquired = await acquireWorkerLock();
  result.lockInfo!.acquired = lockAcquired;
  
  if (!lockAcquired) {
    console.log('[WORKER] Worker skipped — lock active');
    result.skippedDueToLock = true;
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startedAt.getTime();
    // Return success=true because this is expected behavior, not an error
    result.success = true;
    return result;
  }

  console.log('[WORKER] Config:', {
    scanBudget: config.scanBudget,
    dryRun: config.dryRun,
    ebayCallsEnabled: FEATURE_FLAGS.ENABLE_EBAY_CALLS,
    lockAcquired: true,
  });

  // Rate limit check (prevent rapid re-invocation)
  const now = Date.now();
  const timeSinceLastRun = (now - lastWorkerRunAt) / 1000;
  if (lastWorkerRunAt > 0 && timeSinceLastRun < MIN_WORKER_INTERVAL_SECONDS) {
    console.warn(`[WORKER] Rate limited: only ${timeSinceLastRun.toFixed(1)}s since last run`);
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startedAt.getTime();
    return result;
  }
  lastWorkerRunAt = now;

  // Preflight checks
  if (!isDatabaseConfigured()) {
    console.error('[WORKER] Database not configured, aborting');
    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startedAt.getTime();
    return result;
  }

  if (!isEmailConfigured() && !config.dryRun) {
    console.warn('[WORKER] Email not configured, alerts will be logged only');
  }

  try {
    // Get total pending count (for monitoring)
    result.stats.totalPending = await countPendingSearches();
    console.log(`[WORKER] Total pending searches: ${result.stats.totalPending}`);

    // Get scheduled searches (with budget limit)
    const searches = await getScheduledSearches(config.scanBudget);
    console.log(`[WORKER] Retrieved ${searches.length} searches (budget: ${config.scanBudget})`);

    // Check if budget was exhausted
    if (result.stats.totalPending > config.scanBudget) {
      result.budgetExhausted = true;
      result.stats.deferred = result.stats.totalPending - config.scanBudget;
      console.log(`[WORKER] ⚠️  SCAN BUDGET REACHED: ${result.stats.deferred} searches deferred to next cycle`);
    }

    // Process each search (NO LOOP beyond this - single pass)
    for (const search of searches) {
      console.log(`[WORKER] Processing: "${search.name}" (${search.id})`);
      
      const execResult = await processSearch(search, config);
      result.executions.push(execResult);
      result.stats.processed++;
      
      if (execResult.alertSent) {
        result.stats.alertsSent++;
      }
      if (execResult.error) {
        result.stats.errors++;
      }
    }

    result.success = true;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker failed';
    console.error('[WORKER] Fatal error:', error);
    result.executions.push({
      searchId: 'worker',
      searchName: 'Worker Fatal Error',
      executed: false,
      dealsFound: 0,
      alertSent: false,
      error: message,
    });
  }

  result.completedAt = new Date().toISOString();
  result.durationMs = Date.now() - startedAt.getTime();

  console.log('[WORKER] ========================================');
  console.log('[WORKER] Alert Worker Run Complete');
  console.log('[WORKER] ========================================');
  console.log('[WORKER] Results:', {
    success: result.success,
    durationMs: result.durationMs,
    processed: result.stats.processed,
    deferred: result.stats.deferred,
    alertsSent: result.stats.alertsSent,
    errors: result.stats.errors,
    budgetExhausted: result.budgetExhausted,
  });

  return result;
}

// =============================================================================
// STATUS & MONITORING
// =============================================================================

/**
 * Get worker status (for monitoring endpoints)
 */
export async function getWorkerStatus(): Promise<{
  databaseReady: boolean;
  emailReady: boolean;
  ebayCallsEnabled: boolean;
  searchesWithAlerts: number;
  pendingSearches: number;
  scanBudget: number;
  lastRunAt: string | null;
  lock: {
    key: string;
    active: boolean;
    ttlSeconds: number | null;
  };
}> {
  let searchesWithAlerts = 0;
  let pendingSearches = 0;
  
  if (isDatabaseConfigured()) {
    try {
      const { prisma } = await import('./db');
      searchesWithAlerts = await prisma.savedSearch.count({
        where: { alertEnabled: true },
      });
      pendingSearches = await countPendingSearches();
    } catch {
      // Ignore
    }
  }

  // Check lock status
  const lockActive = await isWorkerLockHeld();
  const lockTTL = lockActive ? await getWorkerLockTTL() : null;

  return {
    databaseReady: isDatabaseConfigured(),
    emailReady: isEmailConfigured(),
    ebayCallsEnabled: FEATURE_FLAGS.ENABLE_EBAY_CALLS,
    searchesWithAlerts,
    pendingSearches,
    scanBudget: SCAN_BUDGET_PER_RUN,
    lastRunAt: lastWorkerRunAt > 0 ? new Date(lastWorkerRunAt).toISOString() : null,
    lock: {
      key: WORKER_LOCK_KEY,
      active: lockActive,
      ttlSeconds: lockTTL,
    },
  };
}
