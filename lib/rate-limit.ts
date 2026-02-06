/**
 * Distributed Rate Limiting for FlipFoundry
 * Uses Upstash Redis when configured, falls back to in-memory for local dev.
 * Vercel Edge Runtime compatible — no Node.js APIs.
 */

import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { isRedisConfigured } from './redis';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20,
};

// ============================================================================
// UPSTASH RATE LIMITER (distributed, production)
// ============================================================================

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter) return upstashLimiter;
  if (!isRedisConfigured()) return null;

  upstashLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(20, '5 m'),
    analytics: true,
    prefix: 'flipfoundry:ratelimit',
  });

  return upstashLimiter;
}

// ============================================================================
// IN-MEMORY FALLBACK (local dev only)
// ============================================================================

interface MemoryEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function memoryRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const { windowMs, maxRequests } = config;
  const now = Date.now();

  const existing = memoryStore.get(identifier);
  if (existing && existing.resetTime < now) {
    memoryStore.delete(identifier);
  }

  const entry = memoryStore.get(identifier);

  if (!entry) {
    memoryStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return { success: true, limit: maxRequests, remaining: maxRequests - entry.count, reset: entry.resetTime };
}

// ============================================================================
// PUBLIC API (same interface for both backends)
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export async function checkRateLimit(
  req: NextRequest,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const identifier = getClientIdentifier(req);
  const merged = { ...DEFAULT_CONFIG, ...config };

  const upstash = getUpstashLimiter();

  if (upstash) {
    try {
      const { success, limit, remaining, reset } = await upstash.limit(identifier);

      return {
        success,
        limit,
        remaining,
        reset,
        ...(!success && { retryAfter: Math.ceil((reset - Date.now()) / 1000) }),
      };
    } catch {
      // Redis unavailable — fall through to in-memory
    }
  }

  return memoryRateLimit(identifier, merged);
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
        ...(result.retryAfter && { 'Retry-After': String(result.retryAfter) }),
      },
    }
  );
}
