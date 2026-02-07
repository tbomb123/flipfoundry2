/**
 * Server-Side eBay API Service for Next.js
 * Secure backend service - credentials only accessible server-side
 */

import type {
  Listing,
  ComparableSale,
  SearchParams,
  Seller,
  Category,
  Marketplace,
  ListingCondition,
  RiskLevel,
} from '@/types';
import { 
  ebayQueue, 
  isCircuitBreakerOpen, 
  checkForRateLimitError,
  getCircuitBreakerStatus 
} from './ebayQueue';

// ============================================================================
// FEATURE FLAGS
// Centralized control for enabling/disabling features during early production
// Read from environment variables with safe defaults
// ============================================================================

export const FEATURE_FLAGS = {
  // Temporarily disabled to prioritize marketplace trust and request stability
  // Set to true to re-enable sold comparables (findCompletedItems)
  ENABLE_COMPARABLES: process.env.FEATURE_COMPARABLES === 'true',
  
  // Grade estimation for raw sports cards
  // Set FEATURE_GRADE_ESTIMATES=true to enable
  // Default: false (disabled in production)
  ENABLE_GRADE_ESTIMATION: process.env.FEATURE_GRADE_ESTIMATES === 'true',
};

// Log feature flag status on startup
console.log('[FEATURE FLAGS]', {
  ENABLE_COMPARABLES: FEATURE_FLAGS.ENABLE_COMPARABLES,
  ENABLE_GRADE_ESTIMATION: FEATURE_FLAGS.ENABLE_GRADE_ESTIMATION,
});

// ============================================================================
// SERVER-SIDE CONFIGURATION
// Credentials loaded ONLY from server environment variables
// ============================================================================

interface EbayServerConfig {
  appId: string;
  certId: string;
  devId: string;
  sandbox: boolean;
  siteId: number;
}

function getServerConfig(): EbayServerConfig {
  return {
    appId: process.env.EBAY_APP_ID!,
    certId: process.env.EBAY_CERT_ID!,
    devId: process.env.EBAY_DEV_ID!,
    sandbox: false,
    siteId: 0,
  };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

const EBAY_API_ENDPOINTS = {
  finding: {
    production: 'https://svcs.ebay.com/services/search/FindingService/v1',
    sandbox: 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1',
  },
};

const CONDITION_MAPPINGS: Record<string, string> = {
  '1000': 'new',
  '1500': 'new',
  '1750': 'like_new',
  '2000': 'like_new',
  '2500': 'good',
  '3000': 'good',
  '4000': 'fair',
  '5000': 'poor',
  '6000': 'poor',
};

// ============================================================================
// TYPES
// ============================================================================

interface EbayFindingItem {
  itemId?: string[];
  title?: string[];
  globalId?: string[];
  primaryCategory?: Array<{
    categoryId?: string[];
    categoryName?: string[];
  }>;
  galleryURL?: string[];
  viewItemURL?: string[];
  location?: string[];
  country?: string[];
  shippingInfo?: Array<{
    shippingServiceCost?: Array<{ __value__: string }>;
    shippingType?: string[];
  }>;
  sellingStatus?: Array<{
    currentPrice?: Array<{ __value__: string; '@currencyId': string }>;
    bidCount?: string[];
    sellingState?: string[];
    timeLeft?: string[];
  }>;
  listingInfo?: Array<{
    startTime?: string[];
    endTime?: string[];
    listingType?: string[];
    watchCount?: string[];
  }>;
  condition?: Array<{
    conditionId?: string[];
    conditionDisplayName?: string[];
  }>;
  sellerInfo?: Array<{
    sellerUserName?: string[];
    feedbackScore?: string[];
    positiveFeedbackPercent?: string[];
    topRatedSeller?: string[];
  }>;
}

interface EbayFindingResponse {
  findItemsByKeywordsResponse?: Array<{
    ack?: string[];
    version?: string[];
    timestamp?: string[];
    searchResult?: Array<{
      '@count': string;
      item?: EbayFindingItem[];
    }>;
    paginationOutput?: Array<{
      pageNumber?: string[];
      entriesPerPage?: string[];
      totalPages?: string[];
      totalEntries?: string[];
    }>;
  }>;
}

interface EbayCompletedResponse {
  findCompletedItemsResponse?: Array<{
    ack?: string[];
    version?: string[];
    timestamp?: string[];
    searchResult?: Array<{
      '@count': string;
      item?: EbayFindingItem[];
    }>;
    paginationOutput?: Array<{
      pageNumber?: string[];
      entriesPerPage?: string[];
      totalPages?: string[];
      totalEntries?: string[];
    }>;
  }>;
}

// ============================================================================
// API CLIENT
// ============================================================================

class EbayApiError extends Error {
  code: string;
  statusCode?: number;
  
  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'EbayApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ============================================================================
// RATE PROTECTION - Conservative retry with circuit breaker
// ============================================================================

// Conservative backoff schedule: 3s → 8s → 20s
const RETRY_DELAYS = [3000, 8000, 20000];
const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, options: RequestInit, operation: string): Promise<Response> {
  let lastError: Error | null = null;
  let lastStatusCode: number | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const isLastAttempt = attempt > MAX_RETRIES;
    
    console.log(`[EBAY RETRY] Attempt ${attempt}/${MAX_RETRIES + 1} for ${operation}`);
    
    try {
      const response = await fetch(url, options);
      
      // Check for rate limit in response body (need to clone to read twice)
      if (!response.ok) {
        const clonedResponse = response.clone();
        const text = await clonedResponse.text();
        lastStatusCode = response.status;
        
        // Check for eBay rate limit error (errorId 10001) - TRIPS CIRCUIT BREAKER
        if (checkForRateLimitError(text)) {
          // Circuit breaker is now tripped - do NOT retry, throw immediately
          console.log(`[EBAY RETRY] Rate limit detected. Circuit breaker tripped. Aborting retries.`);
          throw new EbayApiError(
            `eBay rate limit triggered (errorId 10001). Circuit breaker activated.`,
            'CIRCUIT_BREAKER_TRIPPED',
            429
          );
        }
        
        // For 500+ errors, retry with backoff (unless last attempt)
        if (response.status >= 500 && !isLastAttempt) {
          const backoffTime = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.log(`[EBAY RETRY] HTTP ${response.status} error. Backing off ${backoffTime / 1000}s before retry...`);
          await delay(backoffTime);
          continue;
        }
        
        // For 4xx errors (except rate limit), don't retry - it's a client error
        if (response.status >= 400 && response.status < 500) {
          console.log(`[EBAY RETRY] HTTP ${response.status} client error. Not retrying.`);
          return response;
        }
      }
      
      // Success
      if (attempt > 1) {
        console.log(`[EBAY RETRY] Success on attempt ${attempt}`);
      }
      return response;
      
    } catch (error) {
      // Re-throw circuit breaker errors immediately - no retry
      if (error instanceof EbayApiError && error.code === 'CIRCUIT_BREAKER_TRIPPED') {
        throw error;
      }
      
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!isLastAttempt) {
        const backoffTime = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`[EBAY RETRY] Network error: ${lastError.message}. Backing off ${backoffTime / 1000}s...`);
        await delay(backoffTime);
      } else {
        console.log(`[EBAY RETRY] All ${MAX_RETRIES} retries exhausted. Surfacing error gracefully.`);
      }
    }
  }
  
  // All retries exhausted - surface error gracefully
  const errorMessage = lastError?.message || 'Request failed after all retries';
  console.error(`[EBAY RETRY] FAILED: ${errorMessage} (last status: ${lastStatusCode})`);
  
  throw new EbayApiError(
    `eBay API request failed after ${MAX_RETRIES} retries: ${errorMessage}`,
    'MAX_RETRIES_EXCEEDED',
    lastStatusCode || 500
  );
}

// Core API request function (called within queue)
async function executeEbayRequest<T>(
  operation: string,
  params: Record<string, string | number>
): Promise<T> {
  // Check circuit breaker FIRST
  if (isCircuitBreakerOpen()) {
    const status = getCircuitBreakerStatus();
    const remainingSec = Math.ceil(status.remainingCooldownMs / 1000);
    console.log(`[CIRCUIT BREAKER] Request blocked. Cooldown remaining: ${remainingSec}s`);
    throw new EbayApiError(
      `eBay API temporarily unavailable. Circuit breaker open. Retry in ${remainingSec} seconds.`,
      'CIRCUIT_BREAKER_OPEN',
      503
    );
  }

  const config = getServerConfig();
  
  if (!config.appId) {
    throw new EbayApiError('eBay API not configured', 'NOT_CONFIGURED');
  }
  
  const baseUrl = EBAY_API_ENDPOINTS.finding.production;

  const queryParams = new URLSearchParams();

  queryParams.append('OPERATION-NAME', operation);
  queryParams.append('SERVICE-VERSION', '1.13.0');
  queryParams.append('SECURITY-APPNAME', config.appId);
  queryParams.append('GLOBAL-ID', 'EBAY-US');
  queryParams.append('RESPONSE-DATA-FORMAT', 'JSON');
  queryParams.append('REST-PAYLOAD', '');

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const url = `${baseUrl}?${queryParams.toString()}`;

  console.log("=== EBAY REQUEST ===");
  console.log("APP ID:", config.appId ? "Loaded" : "MISSING");
  console.log("OPERATION:", operation);

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'X-EBAY-SOA-SECURITY-APPNAME': config.appId,
      'X-EBAY-SOA-OPERATION-NAME': operation,
      'X-EBAY-SOA-SERVICE-NAME': 'FindingService',
      'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON',
      'X-EBAY-SOA-GLOBAL-ID': 'EBAY-US',
      'Content-Type': 'application/json',
    },
  }, operation);

  console.log("EBAY STATUS:", response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error("EBAY ERROR BODY:", text);

    throw new EbayApiError(
      `HTTP Error ${response.status} - ${text}`,
      'HTTP_ERROR',
      response.status
    );
  }

  const data = (await response.json()) as T;
  const anyData = data as Record<string, unknown>;
  
  if (anyData.errorMessage) {
    throw new EbayApiError(JSON.stringify(anyData.errorMessage), 'EBAY_API_ERROR');
  }

  return data;
}

// Queued API request function - ALL eBay calls go through this
async function makeFindingApiRequest<T>(
  operation: string,
  params: Record<string, string | number>
): Promise<T> {
  console.log(`[EBAY QUEUE] Queuing ${operation}. Queue size: ${ebayQueue.size}, Pending: ${ebayQueue.pending}`);
  
  return ebayQueue.add(async () => {
    console.log(`[EBAY QUEUE] Executing ${operation}`);
    return executeEbayRequest<T>(operation, params);
  }) as Promise<T>;
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

function normalizeCondition(ebayConditionId?: string, displayName?: string): ListingCondition {
  if (!ebayConditionId) return 'unknown';

  const mapped = CONDITION_MAPPINGS[ebayConditionId];
  if (mapped) return mapped as ListingCondition;

  const name = displayName?.toLowerCase() || '';
  if (name.includes('new')) return 'new';
  if (name.includes('like new') || name.includes('open box')) return 'like_new';
  if (name.includes('good') || name.includes('very good')) return 'good';
  if (name.includes('fair') || name.includes('acceptable')) return 'fair';
  if (name.includes('poor') || name.includes('for parts')) return 'poor';

  return 'unknown';
}

function calculateRiskLevel(
  feedbackPercent: number,
  feedbackScore: number,
  isTopRated: boolean
): RiskLevel {
  if (isTopRated && feedbackPercent >= 98 && feedbackScore >= 100) return 'low';
  if (feedbackPercent >= 95 && feedbackScore >= 50) return 'low';
  if (feedbackPercent >= 90 && feedbackScore >= 10) return 'medium';
  return 'high';
}

function parseEbayItem(item: EbayFindingItem): Listing | null {
  try {
    const itemId = item.itemId?.[0];
    const title = item.title?.[0];
    const currentPrice = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0');
    const currency = item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD';

    if (!itemId || !title || !currentPrice) return null;

    const sellerInfo = item.sellerInfo?.[0];
    const feedbackPercent = parseFloat(sellerInfo?.positiveFeedbackPercent?.[0] || '0');
    const feedbackScore = parseInt(sellerInfo?.feedbackScore?.[0] || '0');
    const isTopRated = sellerInfo?.topRatedSeller?.[0] === 'true';
    const riskLevel = calculateRiskLevel(feedbackPercent, feedbackScore, isTopRated);

    const seller: Seller = {
      id: sellerInfo?.sellerUserName?.[0] || 'unknown',
      username: sellerInfo?.sellerUserName?.[0] || 'Unknown Seller',
      feedbackScore,
      feedbackPercentage: feedbackPercent,
      totalTransactions: feedbackScore,
      accountAgeDays: 0,
      isTopRated,
      riskLevel,
      riskFactors: riskLevel === 'high' ? ['Low feedback score or percentage'] : [],
    };

    const categoryInfo = item.primaryCategory?.[0];
    const category: Category = {
      id: categoryInfo?.categoryId?.[0] || '0',
      name: categoryInfo?.categoryName?.[0] || 'Unknown',
      level: 1,
      marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true },
    };

    const conditionId = item.condition?.[0]?.conditionId?.[0];
    const conditionDisplay = item.condition?.[0]?.conditionDisplayName?.[0];
    const condition = normalizeCondition(conditionId, conditionDisplay);

    const shippingCost = parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || '0');
    const startTime = item.listingInfo?.[0]?.startTime?.[0] || new Date().toISOString();
    const endTime = item.listingInfo?.[0]?.endTime?.[0];
    const watchCount = parseInt(item.listingInfo?.[0]?.watchCount?.[0] || '0');
    const bidCount = parseInt(item.sellingStatus?.[0]?.bidCount?.[0] || '0');
    const primaryImageUrl = item.galleryURL?.[0] || '';

    const marketplace: Marketplace = {
      id: 'ebay',
      name: 'eBay',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/1200px-EBay_logo.svg.png',
      supportedCategories: [],
      isActive: true,
    };

    return {
      id: itemId,
      title,
      currentPrice,
      currency,
      condition,
      conditionDisplayName: conditionDisplay,
      imageUrls: primaryImageUrl ? [primaryImageUrl] : [],
      primaryImageUrl,
      listingUrl: item.viewItemURL?.[0] || `https://www.ebay.com/itm/${itemId}`,
      seller,
      category,
      marketplace,
      shippingCost: shippingCost || undefined,
      shippingType: item.shippingInfo?.[0]?.shippingType?.[0],
      location: item.location?.[0] || 'Unknown',
      startTime,
      endTime,
      watchCount,
      bidCount,
      status: 'active',
    };
  } catch (error) {
    console.error('Error parsing eBay item:', error);
    return null;
  }
}

function parseCompletedItem(item: EbayFindingItem): ComparableSale | null {
  try {
    const itemId = item.itemId?.[0];
    const title = item.title?.[0];
    const soldPrice = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0');
    const currency = item.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] || 'USD';

    if (!itemId || !title || !soldPrice) return null;

    const conditionId = item.condition?.[0]?.conditionId?.[0];
    const conditionDisplay = item.condition?.[0]?.conditionDisplayName?.[0];
    const condition = normalizeCondition(conditionId, conditionDisplay);
    const endTime = item.listingInfo?.[0]?.endTime?.[0] || new Date().toISOString();

    return {
      id: itemId,
      title,
      soldPrice,
      currency,
      condition,
      soldDate: endTime,
      imageUrl: item.galleryURL?.[0],
      listingUrl: item.viewItemURL?.[0],
      marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true },
    };
  } catch (error) {
    console.error('Error parsing completed item:', error);
    return null;
  }
}

// ============================================================================
// PUBLIC API METHODS
// ============================================================================

export interface SearchListingsResult {
  listings: Listing[];
  total: number;
  hasMore: boolean;
}

export async function searchListings(params: SearchParams): Promise<SearchListingsResult> {
  const searchParams: Record<string, string | number> = {
    keywords: params.keywords,
    'paginationInput.entriesPerPage': params.perPage || 12,
    'paginationInput.pageNumber': params.page || 1,
  };

  if (params.categoryId) searchParams['categoryId'] = params.categoryId;

  if (params.minPrice !== undefined) {
    searchParams['itemFilter(0).name'] = 'MinPrice';
    searchParams['itemFilter(0).value'] = params.minPrice;
  }

  if (params.maxPrice !== undefined) {
    const index = params.minPrice !== undefined ? 1 : 0;
    searchParams[`itemFilter(${index}).name`] = 'MaxPrice';
    searchParams[`itemFilter(${index}).value`] = params.maxPrice;
  }

  if (params.condition && params.condition.length > 0) {
    const conditionMapping: Record<string, string[]> = {
      new: ['1000', '1500'],
      like_new: ['1750', '2000'],
      good: ['2500', '3000'],
      fair: ['4000'],
      poor: ['5000', '6000'],
    };

    const ebayConditionIds: string[] = [];
    params.condition.forEach((cond) => {
      const ids = conditionMapping[cond];
      if (ids) ebayConditionIds.push(...ids);
    });

    if (ebayConditionIds.length > 0) {
      const index = Object.keys(searchParams).filter((k) => k.startsWith('itemFilter')).length / 2;
      searchParams[`itemFilter(${index}).name`] = 'Condition';
      ebayConditionIds.forEach((id, i) => {
        searchParams[`itemFilter(${index}).value(${i})`] = id;
      });
    }
  }

  const sortMapping: Record<string, string> = {
    price: 'PricePlusShippingLowest',
    endingSoon: 'EndTimeSoonest',
    newest: 'StartTimeNewest',
  };

  if (params.sortBy && sortMapping[params.sortBy]) {
    searchParams['sortOrder'] = sortMapping[params.sortBy];
  }

  const response = await makeFindingApiRequest<EbayFindingResponse>('findItemsByKeywords', searchParams);

  const searchResponse = response.findItemsByKeywordsResponse?.[0];
  const items = searchResponse?.searchResult?.[0]?.item || [];
  const totalCount = parseInt(searchResponse?.searchResult?.[0]?.['@count'] || '0');
  const pagination = searchResponse?.paginationOutput?.[0];
  const totalPages = parseInt(pagination?.totalPages?.[0] || '1');
  const currentPage = parseInt(pagination?.pageNumber?.[0] || '1');

  const listings = items.map(parseEbayItem).filter((item): item is Listing => item !== null);

  return { listings, total: totalCount, hasMore: currentPage < totalPages };
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
  const searchParams: Record<string, string | number> = {
    keywords,
    'paginationInput.entriesPerPage': options.maxResults || 20,
    'paginationInput.pageNumber': 1,
  };

  if (options.categoryId) searchParams['categoryId'] = options.categoryId;

  let filterIndex = 0;
  searchParams[`itemFilter(${filterIndex}).name`] = 'SoldItemsOnly';
  searchParams[`itemFilter(${filterIndex}).value`] = 'true';
  filterIndex++;

  if (options.condition) {
    const conditionMapping: Record<string, string[]> = {
      new: ['1000', '1500'],
      like_new: ['1750', '2000'],
      good: ['2500', '3000'],
      fair: ['4000'],
      poor: ['5000', '6000'],
    };

    const ids = conditionMapping[options.condition];
    if (ids) {
      searchParams[`itemFilter(${filterIndex}).name`] = 'Condition';
      ids.forEach((id, i) => {
        searchParams[`itemFilter(${filterIndex}).value(${i})`] = id;
      });
      filterIndex++;
    }
  }

  if (options.daysBack) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - options.daysBack);
    searchParams[`itemFilter(${filterIndex}).name`] = 'EndTimeFrom';
    searchParams[`itemFilter(${filterIndex}).value`] = endDate.toISOString();
  }

  await delay(1000);

  const response = await makeFindingApiRequest<EbayCompletedResponse>('findCompletedItems', searchParams);

  const searchResponse = response.findCompletedItemsResponse?.[0];
  const items = searchResponse?.searchResult?.[0]?.item || [];

  return items
    .map(parseCompletedItem)
    .filter((item): item is ComparableSale => item !== null)
    .sort((a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime());
}

export function isEbayConfigured(): boolean {
  const config = getServerConfig();
  return !!config.appId;
}

export function getEbayStatus(): { configured: boolean; sandbox: boolean; message: string } {
  const config = getServerConfig();
  
  if (!config.appId) {
    return { configured: false, sandbox: false, message: 'eBay API not configured' };
  }
  
  return {
    configured: true,
    sandbox: false,
    message: 'Connected to eBay Production',
  };
}
