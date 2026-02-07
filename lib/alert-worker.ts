/**
 * Alert Worker
 * 
 * Background job that executes saved searches with alerts enabled,
 * detects deals above threshold, and sends email notifications.
 * 
 * IMPORTANT: This is the ONLY place where saved searches trigger eBay calls.
 * Saving a search does NOT call eBay - only this worker does.
 */

import { 
  getSearchesWithAlertsEnabled, 
  updateLastRun,
  type SavedSearchFilters 
} from './saved-searches';
import { wasAlertSent, recordAlert } from './alert-history';
import { sendDealAlertEmail, isEmailConfigured } from './email';
import { isDatabaseConfigured } from './db';
import type { SavedSearch } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface WorkerConfig {
  maxSearchesPerRun: number;    // Limit searches per worker invocation
  maxDealsPerAlert: number;     // Max deals to include in one email
  cooldownMinutes: number;      // Min time between runs for same search
  dryRun: boolean;              // Skip actual eBay calls and emails
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

interface WorkerResult {
  searchesProcessed: number;
  alertsSent: number;
  errors: string[];
  dryRun: boolean;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: WorkerConfig = {
  maxSearchesPerRun: 10,
  maxDealsPerAlert: 5,
  cooldownMinutes: 60,    // Don't re-run same search within 1 hour
  dryRun: false,
};

// =============================================================================
// WORKER IMPLEMENTATION
// =============================================================================

/**
 * Execute a single saved search and return matching deals
 * 
 * NOTE: This function would call the eBay API.
 * Currently stubbed - implement when eBay rate limits clear.
 */
async function executeSearch(
  search: SavedSearch,
  config: WorkerConfig
): Promise<Deal[]> {
  if (config.dryRun) {
    console.log(`[WORKER] DRY RUN: Would execute search "${search.name}"`);
    return [];
  }

  // Parse filters from JSONB
  const filters = search.filters as SavedSearchFilters;
  
  // TODO: Implement actual eBay search when rate limits clear
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
  // return results
  //   .filter(item => item.dealScore >= search.minimumScore)
  //   .map(item => ({
  //     itemId: item.itemId,
  //     title: item.title,
  //     price: item.price.current,
  //     dealScore: item.dealScore,
  //     imageUrl: item.imageUrl,
  //     itemUrl: item.viewItemUrl,
  //     estimatedProfit: item.estimatedProfit,
  //   }));

  console.log(`[WORKER] Search execution stubbed for "${search.name}" (eBay rate limited)`);
  console.log(`[WORKER] Query: "${search.query}", MinScore: ${search.minimumScore}`);
  console.log(`[WORKER] Filters:`, filters);
  
  return [];
}

/**
 * Process a single saved search: execute, filter, dedupe, alert
 */
async function processSearch(
  search: SavedSearch,
  config: WorkerConfig
): Promise<{ alertSent: boolean; error?: string }> {
  try {
    // Execute search
    const deals = await executeSearch(search, config);
    
    if (deals.length === 0) {
      await updateLastRun(search.id);
      return { alertSent: false };
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
      await updateLastRun(search.id);
      return { alertSent: false };
    }

    // Limit deals per alert
    const dealsToAlert = newDeals.slice(0, config.maxDealsPerAlert);

    // Send email alert
    // NOTE: For now, we need a way to get user email from userId (API key)
    // This will be resolved when user accounts are implemented
    // For now, we'll log and skip
    
    // TODO: Implement email sending when user emails are available
    // const emailResult = await sendDealAlertEmail({
    //   recipientEmail: userEmail,
    //   searchName: search.name,
    //   deals: dealsToAlert,
    // });

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

    await updateLastRun(search.id);
    return { alertSent: true };

  } catch (error) {
    console.error(`[WORKER] Error processing search "${search.name}":`, error);
    return { 
      alertSent: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if search should be skipped (cooldown)
 */
function shouldSkipSearch(search: SavedSearch, cooldownMinutes: number): boolean {
  if (!search.lastRunAt) return false;
  
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const timeSinceLastRun = Date.now() - search.lastRunAt.getTime();
  
  return timeSinceLastRun < cooldownMs;
}

/**
 * Main worker entry point
 * Called by cron job or manual trigger
 */
export async function runAlertWorker(
  overrides: Partial<WorkerConfig> = {}
): Promise<WorkerResult> {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const result: WorkerResult = {
    searchesProcessed: 0,
    alertsSent: 0,
    errors: [],
    dryRun: config.dryRun,
  };

  console.log('[WORKER] Starting alert worker run', { config });

  // Preflight checks
  if (!isDatabaseConfigured()) {
    result.errors.push('Database not configured');
    console.error('[WORKER] Database not configured, aborting');
    return result;
  }

  if (!isEmailConfigured() && !config.dryRun) {
    console.warn('[WORKER] Email not configured, alerts will be logged only');
  }

  try {
    // Get all searches with alerts enabled
    const searches = await getSearchesWithAlertsEnabled();
    console.log(`[WORKER] Found ${searches.length} searches with alerts enabled`);

    // Filter by cooldown and limit
    const eligibleSearches = searches
      .filter(s => !shouldSkipSearch(s, config.cooldownMinutes))
      .slice(0, config.maxSearchesPerRun);

    console.log(`[WORKER] Processing ${eligibleSearches.length} eligible searches`);

    // Process each search
    for (const search of eligibleSearches) {
      const { alertSent, error } = await processSearch(search, config);
      
      result.searchesProcessed++;
      if (alertSent) result.alertsSent++;
      if (error) result.errors.push(`${search.name}: ${error}`);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Worker failed';
    result.errors.push(message);
    console.error('[WORKER] Fatal error:', error);
  }

  console.log('[WORKER] Run complete', result);
  return result;
}

/**
 * Get worker status (for monitoring)
 */
export async function getWorkerStatus(): Promise<{
  databaseReady: boolean;
  emailReady: boolean;
  searchesWithAlerts: number;
}> {
  let searchesWithAlerts = 0;
  
  if (isDatabaseConfigured()) {
    try {
      const searches = await getSearchesWithAlertsEnabled();
      searchesWithAlerts = searches.length;
    } catch {
      // Ignore
    }
  }

  return {
    databaseReady: isDatabaseConfigured(),
    emailReady: isEmailConfigured(),
    searchesWithAlerts,
  };
}
