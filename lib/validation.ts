/**
 * Input Validation Schemas
 * Zod schemas for API request validation
 */

import { z } from 'zod';

// ============================================================================
// SEARCH VALIDATION
// ============================================================================

export const SearchParamsSchema = z.object({
  keywords: z
    .string()
    .min(1, 'Keywords are required')
    .max(100, 'Keywords too long (max 100 characters)')
    .transform((val) => val.trim()),

  categoryId: z
    .string()
    .max(20)
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),

  minPrice: z
    .union([z.number().min(0).max(1000000), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? undefined : Math.max(0, num);
    }),

  maxPrice: z
    .union([z.number().min(0).max(1000000), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? undefined : Math.max(0, num);
    }),

  condition: z
    .array(z.enum(['new', 'like_new', 'good', 'fair', 'poor']))
    .optional()
    .default([]),

  page: z
    .union([z.number().int().positive(), z.string()])
    .optional()
    .default(1)
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? 1 : Math.max(1, num);
    }),

  perPage: z
    .union([z.number().int().positive().max(100), z.string()])
    .optional()
    .default(12)
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? 12 : Math.min(100, Math.max(1, num));
    }),

  sortBy: z
    .enum(['dealScore', 'price', 'roi', 'endingSoon', 'newest'])
    .optional()
    .default('dealScore'),

  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type SearchParamsInput = z.input<typeof SearchParamsSchema>;
export type SearchParamsValidated = z.infer<typeof SearchParamsSchema>;

// ============================================================================
// COMPARABLES VALIDATION
// ============================================================================

export const ComparablesParamsSchema = z.object({
  keywords: z
    .string()
    .min(1, 'Keywords are required')
    .max(100)
    .transform((val) => val.trim()),

  categoryId: z.string().max(20).optional(),

  condition: z
    .enum(['new', 'like_new', 'good', 'fair', 'poor', 'unknown'])
    .optional(),

  daysBack: z
    .union([z.number().int().positive().max(365), z.string()])
    .optional()
    .default(90)
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? 90 : Math.min(365, Math.max(1, num));
    }),

  maxResults: z
    .union([z.number().int().positive().max(100), z.string()])
    .optional()
    .default(20)
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) ? 20 : Math.min(100, Math.max(1, num));
    }),
});

export type ComparablesParamsInput = z.input<typeof ComparablesParamsSchema>;
export type ComparablesParamsValidated = z.infer<typeof ComparablesParamsSchema>;

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

export function sanitizeKeywords(keywords: string): string {
  return keywords
    .replace(/[<>\"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}

export function validatePriceRange(
  minPrice?: number,
  maxPrice?: number
): { valid: boolean; error?: string } {
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { valid: false, error: 'minPrice cannot be greater than maxPrice' };
  }
  return { valid: true };
}
