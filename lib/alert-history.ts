/**
 * Alert History Service
 * 
 * Track sent alerts for deduplication and analytics.
 */

import { prisma, isDatabaseConfigured } from './db';
import type { AlertHistory } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAlertInput {
  savedSearchId: string;
  itemId: string;
  dealScore: number;
  alertType?: 'email' | 'sms' | 'push';
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Record a sent alert
 */
export async function recordAlert(input: CreateAlertInput): Promise<AlertHistory> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  return prisma.alertHistory.create({
    data: {
      savedSearchId: input.savedSearchId,
      itemId: input.itemId,
      dealScore: input.dealScore,
      alertType: input.alertType || 'email',
    },
  });
}

/**
 * Check if alert was already sent for this item + search combo
 * Used for deduplication
 */
export async function wasAlertSent(
  savedSearchId: string,
  itemId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false; // Safe default: don't block if DB unavailable
  }

  const existing = await prisma.alertHistory.findFirst({
    where: {
      savedSearchId,
      itemId,
    },
  });

  return !!existing;
}

/**
 * Get alert history for a saved search
 */
export async function getAlertHistory(
  savedSearchId: string,
  limit = 50
): Promise<AlertHistory[]> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  return prisma.alertHistory.findMany({
    where: { savedSearchId },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });
}

/**
 * Get recent alerts across all searches for a user
 */
export async function getRecentAlertsForUser(
  savedSearchIds: string[],
  limit = 50
): Promise<AlertHistory[]> {
  if (!isDatabaseConfigured()) {
    throw new Error('Database not configured');
  }

  return prisma.alertHistory.findMany({
    where: {
      savedSearchId: { in: savedSearchIds },
    },
    orderBy: { sentAt: 'desc' },
    take: limit,
  });
}

/**
 * Count alerts sent in the last 24 hours (for rate limiting)
 */
export async function countRecentAlerts(
  savedSearchId: string,
  hours = 24
): Promise<number> {
  if (!isDatabaseConfigured()) {
    return 0;
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return prisma.alertHistory.count({
    where: {
      savedSearchId,
      sentAt: { gte: since },
    },
  });
}

/**
 * Delete old alert history (cleanup job)
 */
export async function cleanupOldAlerts(daysOld = 90): Promise<number> {
  if (!isDatabaseConfigured()) {
    return 0;
  }

  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await prisma.alertHistory.deleteMany({
    where: {
      sentAt: { lt: cutoff },
    },
  });

  return result.count;
}
