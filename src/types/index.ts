/**
 * FlipFoundry - Core Type Definitions
 * Production-grade TypeScript models for the arbitrage platform
 */

// ============================================================================
// SELLER TYPES
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Seller {
  id: string;
  username: string;
  feedbackScore: number;
  feedbackPercentage: number;
  totalTransactions: number;
  accountAgeDays: number;
  isTopRated: boolean;
  riskLevel: RiskLevel;
  riskFactors: string[];
}

export interface SellerRiskProfile {
  level: RiskLevel;
  score: number; // 0-100
  factors: string[];
  recommendation: string;
}

// ============================================================================
// LISTING TYPES
// ============================================================================

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';
export type ListingStatus = 'active' | 'ended' | 'sold';

export interface Listing {
  id: string;
  title: string;
  description?: string;
  currentPrice: number;
  currency: string;
  buyItNowPrice?: number;
  bidCount: number;
  watchCount: number;
  condition: ListingCondition;
  conditionDisplayName?: string;
  imageUrls: string[];
  primaryImageUrl: string;
  listingUrl: string;
  seller: Seller;
  endTime?: string;
  startTime: string;
  category: Category;
  marketplace: Marketplace;
  shippingCost?: number;
  shippingType?: string;
  location: string;
  status: ListingStatus;
}

export interface ComparableSale {
  id: string;
  title: string;
  soldPrice: number;
  currency: string;
  condition: ListingCondition;
  soldDate: string;
  imageUrl?: string;
  listingUrl?: string;
  marketplace: Marketplace;
}

// ============================================================================
// CATEGORY & MARKETPLACE TYPES
// ============================================================================

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  marketplace: Marketplace;
}

export type MarketplaceId = 'ebay' | 'mercari' | 'facebook' | 'stockx' | 'goat';

export interface Marketplace {
  id: MarketplaceId;
  name: string;
  logoUrl: string;
  supportedCategories: string[];
  isActive: boolean;
}

// ============================================================================
// SCORING TYPES
// ============================================================================

export interface DealScore {
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
  potentialProfit: number;
  roiPercentage: number;
  confidence: number; // 0-1
}

export interface MarketValueEstimate {
  estimatedValue: number;
  confidenceInterval: {
    low: number;
    high: number;
  };
  methodology: string;
  sampleSize: number;
  confidence: number; // 0-1
}

export interface ValuationResult {
  listing: Listing;
  comparableSales: ComparableSale[];
  marketValue: MarketValueEstimate;
  dealScore: DealScore;
  sellerRisk: SellerRiskProfile;
  analysisTimestamp: string;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchFilters {
  keywords: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: ListingCondition[];
  sellerRiskLevel?: RiskLevel[];
  minDealScore?: number;
  marketplace?: MarketplaceId[];
}

export interface SearchResult {
  listings: ValuationResult[];
  totalResults: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  searchId: string;
  executionTimeMs: number;
}

export interface SearchParams extends SearchFilters {
  page?: number;
  perPage?: number;
  sortBy?: 'dealScore' | 'price' | 'roi' | 'endingSoon' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// USER & ACCOUNT TYPES (Future-proofing)
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  searchesRemaining: number;
  savedSearches: SavedSearch[];
  watchlist: string[];
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  alertEnabled: boolean;
  createdAt: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  timestamp: string;
  requestId: string;
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
}

// ============================================================================
// UI TYPES
// ============================================================================

export type ViewMode = 'grid' | 'list';

export interface DealCardProps {
  valuation: ValuationResult;
  onViewDetails?: (valuation: ValuationResult) => void;
  onAddToWatchlist?: (listingId: string) => void;
}

export interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
  initialValues?: Partial<SearchFilters>;
}

export interface FilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  availableCategories: Category[];
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface ScoringConfig {
  dealScore: {
    profitWeight: number;
    roiWeight: number;
    sellerRiskWeight: number;
    marketConfidenceWeight: number;
  };
  sellerRisk: {
    feedbackThresholds: {
      low: number;
      medium: number;
    };
    transactionThresholds: {
      low: number;
      medium: number;
    };
  };
  marketValue: {
    outlierStdDev: number;
    recencyDecayDays: number;
    minSampleSize: number;
  };
}

export interface EbayApiConfig {
  appId: string;
  certId: string;
  devId: string;
  redirectUri: string;
  sandbox: boolean;
  siteId: number;
  compatibilityLevel: number;
}
