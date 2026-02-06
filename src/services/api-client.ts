/**
 * API Client
 * Client-side HTTP client for Next.js API routes
 * All eBay API calls go through secure backend proxy
 */

import type { ApiResponse, SearchParams, Listing, ComparableSale } from '@/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Use relative URLs for Next.js API routes
const API_BASE_URL = '/api';

const DEFAULT_TIMEOUT = 30000;

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class ApiClientError extends Error {
  code: string;
  statusCode?: number;
  details?: unknown;
  
  constructor(message: string, code: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ============================================================================
// CORE HTTP CLIENT
// ============================================================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeout?: number;
}

async function makeRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, timeout = DEFAULT_TIMEOUT } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(process.env.NEXT_PUBLIC_API_KEY && { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let data: ApiResponse<T>;
    try {
      data = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new ApiClientError('Invalid response format', 'PARSE_ERROR', response.status);
    }

    if (!response.ok) {
      throw new ApiClientError(
        data.error?.message || `HTTP Error: ${response.status}`,
        data.error?.code || 'HTTP_ERROR',
        response.status,
        data.error?.details
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiClientError('Request timed out', 'TIMEOUT_ERROR');
      }
      throw new ApiClientError(error.message, 'NETWORK_ERROR');
    }

    throw new ApiClientError('An unexpected error occurred', 'UNKNOWN_ERROR');
  }
}

// ============================================================================
// SEARCH API
// ============================================================================

export interface SearchListingsResult {
  listings: Listing[];
  total: number;
  hasMore: boolean;
}

export async function searchListings(params: SearchParams): Promise<SearchListingsResult> {
  const response = await makeRequest<SearchListingsResult>('/search', {
    method: 'POST',
    body: params,
    timeout: 15000,
  });

  if (!response.success || !response.data) {
    throw new ApiClientError(
      response.error?.message || 'Search failed',
      response.error?.code || 'SEARCH_ERROR'
    );
  }

  return response.data;
}

export async function getSoldComparables(
  keywords: string,
  options: {
    categoryId?: string;
    condition?: string;
    daysBack?: number;
    maxResults?: number;
  } = {}
): Promise<ComparableSale[]> {
  const response = await makeRequest<{ comparables: ComparableSale[] }>('/search/comparables', {
    method: 'POST',
    body: { keywords, ...options },
    timeout: 10000,
  });

  if (!response.success || !response.data) {
    throw new ApiClientError(
      response.error?.message || 'Failed to fetch comparables',
      response.error?.code || 'COMPARABLES_ERROR'
    );
  }

  return response.data.comparables;
}

export async function getEbayStatus(): Promise<{
  configured: boolean;
  sandbox: boolean;
  message: string;
}> {
  const response = await makeRequest<{
    configured: boolean;
    sandbox: boolean;
    message: string;
  }>('/search/status', {
    method: 'GET',
    timeout: 5000,
  });

  if (!response.success || !response.data) {
    return {
      configured: false,
      sandbox: false,
      message: 'Unable to check eBay status',
    };
  }

  return response.data;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch('/api/health', { method: 'GET' });

  if (!response.ok) {
    throw new ApiClientError('Health check failed', 'HEALTH_CHECK_ERROR');
  }

  return response.json();
}
