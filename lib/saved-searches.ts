/**
 * Saved Searches Service
 * 
 * Business logic for managing saved searches.
 * Does NOT trigger eBay calls - configuration only.
 */

import { prisma, isDatabaseConfigured } from './db';
import type { SavedSearch, Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface SavedSearchFilters {
  priceMin?: number;
  priceMax?: number;
  category?: string;
  condition?: string;
  // Extensible for future filters
  [key: string]: unknown;
}

export interface CreateSavedSearchInput {
  userId: string;
  name: string;
  query: string;
  filters?: SavedSearchFilters;
  alertEnabled?: boolean;
  minimumScore?: number;
  runFrequencyMinutes?: number;
}

export interface UpdateSavedSearchInput {
  name?: string;
  query?: string;
  filters?: SavedSearchFilters;
  alertEnabled?: boolean;
  minimumScore?: number;
  runFrequencyMinutes?: number;
}

export interface SavedSearchWithMeta extends SavedSearch {
  // Future: add alert count, last alert date, etc.
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Create a new saved search
 * Automatically initializes next_run_at = NOW() for immediate worker eligibility
 */
export async function createSavedSearch(
  input: CreateSavedSearchInput
): Promise<SavedSearch> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  const { 
    userId, 
    name, 
    query, 
    filters = {}, 
    alertEnabled = false, 
    minimumScore = 70,
    runFrequencyMinutes = 15,
  } = input;

  // Validate minimum score range
  const clampedScore = Math.min(100, Math.max(0, minimumScore));
  
  // Validate run frequency (min 5 minutes, max 1440 = 24 hours)
  const clampedFrequency = Math.min(1440, Math.max(5, runFrequencyMinutes));

  return prisma.savedSearch.create({
    data: {
      userId,
      name: name.trim(),
      query: query.trim(),
      filters: filters as Prisma.JsonObject,
      alertEnabled,
      minimumScore: clampedScore,
      runFrequencyMinutes: clampedFrequency,
      // Auto-schedule: next_run_at = NOW() for immediate worker eligibility
      nextRunAt: new Date(),
    },
  });
}

/**
 * Get all saved searches for a user
 */
export async function getSavedSearches(
  userId: string,
  options?: {
    alertEnabledOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<SavedSearch[]> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  const { alertEnabledOnly, limit = 50, offset = 0 } = options || {};

  const where: Prisma.SavedSearchWhereInput = {
    userId,
    ...(alertEnabledOnly ? { alertEnabled: true } : {}),
  };

  return prisma.savedSearch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get a single saved search by ID
 */
export async function getSavedSearchById(
  id: string,
  userId: string
): Promise<SavedSearch | null> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  return prisma.savedSearch.findFirst({
    where: { id, userId },
  });
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  id: string,
  userId: string,
  input: UpdateSavedSearchInput
): Promise<SavedSearch | null> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  // Verify ownership
  const existing = await prisma.savedSearch.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return null;
  }

  const updateData: Prisma.SavedSearchUpdateInput = {};
  
  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }
  if (input.query !== undefined) {
    updateData.query = input.query.trim();
  }
  if (input.filters !== undefined) {
    updateData.filters = input.filters as Prisma.JsonObject;
  }
  if (input.alertEnabled !== undefined) {
    updateData.alertEnabled = input.alertEnabled;
    // When enabling alerts, set next_run_at to NOW() if not already scheduled
    if (input.alertEnabled) {
      updateData.nextRunAt = new Date();
    }
  }
  if (input.minimumScore !== undefined) {
    updateData.minimumScore = Math.min(100, Math.max(0, input.minimumScore));
  }
  if (input.runFrequencyMinutes !== undefined) {
    updateData.runFrequencyMinutes = Math.min(1440, Math.max(5, input.runFrequencyMinutes));
  }

  return prisma.savedSearch.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(
  id: string,
  userId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  // Verify ownership before delete
  const existing = await prisma.savedSearch.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return false;
  }

  await prisma.savedSearch.delete({
    where: { id },
  });

  return true;
}

/**
 * Toggle alert status for a saved search
 */
export async function toggleAlert(
  id: string,
  userId: string,
  enabled: boolean
): Promise<SavedSearch | null> {
  return updateSavedSearch(id, userId, { alertEnabled: enabled });
}

/**
 * Update last run timestamp (called by worker after executing search)
 */
export async function updateLastRun(id: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  await prisma.savedSearch.update({
    where: { id },
    data: { lastRunAt: new Date() },
  });
}

/**
 * Schedule next run after worker processes a search
 * next_run_at = NOW() + (run_frequency_minutes * INTERVAL '1 minute')
 */
export async function scheduleNextRun(id: string, frequencyMinutes: number): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  const nextRunAt = new Date(Date.now() + frequencyMinutes * 60 * 1000);
  
  await prisma.savedSearch.update({
    where: { id },
    data: { 
      lastRunAt: new Date(),
      nextRunAt,
    },
  });
  
  console.log(`[SCHEDULER] Search ${id} next run scheduled for ${nextRunAt.toISOString()}`);
}

/**
 * Get all searches with alerts enabled (for worker)
 * @deprecated Use getScheduledSearches() for proper scheduling
 */
export async function getSearchesWithAlertsEnabled(): Promise<SavedSearch[]> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  return prisma.savedSearch.findMany({
    where: { alertEnabled: true },
    orderBy: { lastRunAt: 'asc' }, // Prioritize searches that haven't run recently
  });
}

/**
 * Get searches eligible for execution by the worker
 * 
 * Selection criteria:
 * - alert_enabled = true
 * - next_run_at <= NOW()
 * 
 * Ordered by next_run_at ASC (oldest first)
 * Limited by scan budget
 */
export async function getScheduledSearches(limit: number = 20): Promise<SavedSearch[]> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  const now = new Date();
  
  return prisma.savedSearch.findMany({
    where: { 
      alertEnabled: true,
      nextRunAt: {
        lte: now,  // next_run_at <= NOW()
      },
    },
    orderBy: { nextRunAt: 'asc' },  // Oldest first (fairness)
    take: limit,  // Scan budget enforcement
  });
}

/**
 * Count searches pending execution (for monitoring)
 */
export async function countPendingSearches(): Promise<number> {
  if (!isDatabaseConfigured()) {
    return 0;
  }

  const now = new Date();
  
  return prisma.savedSearch.count({
    where: { 
      alertEnabled: true,
      nextRunAt: {
        lte: now,
      },
    },
  });
}

/**
 * Count saved searches for a user
 */
export async function countSavedSearches(userId: string): Promise<number> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  return prisma.savedSearch.count({
    where: { userId },
  });
}

// =============================================================================
// LIMITS (for future rate limiting)
// =============================================================================

export const SAVED_SEARCH_LIMITS = {
  MAX_PER_USER: 25,        // Free tier limit
  MAX_NAME_LENGTH: 255,
  MAX_QUERY_LENGTH: 500,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  DEFAULT_SCORE: 70,
};
