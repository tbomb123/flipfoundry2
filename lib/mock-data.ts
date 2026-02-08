/**
 * Mock eBay Data Generator
 * 
 * Returns realistic mock data when eBay API calls are disabled.
 * Used during rate limit periods to keep the UI functional.
 */

import type { 
  SearchResult, 
  ValuationResult, 
  Listing, 
  DealScore, 
  MarketValueEstimate,
  SellerRiskProfile,
  ComparableSale,
  RiskLevel,
} from '@/types';

// Sample product data for different categories
const MOCK_PRODUCTS = [
  { title: 'Pokemon Charizard Base Set Holo 4/102 - Near Mint', category: 'Trading Cards', priceRange: [150, 400] },
  { title: 'Nike Air Jordan 1 Retro High OG Chicago - Size 10', category: 'Sneakers', priceRange: [180, 350] },
  { title: 'Vintage Rolex Submariner 5513 - 1970s', category: 'Watches', priceRange: [8000, 15000] },
  { title: 'Sony PlayStation 5 Console - Disc Edition', category: 'Electronics', priceRange: [400, 550] },
  { title: 'Topps 2023 Baseball Complete Set Factory Sealed', category: 'Sports Cards', priceRange: [50, 120] },
  { title: 'Nintendo Switch OLED Model - White', category: 'Gaming', priceRange: [280, 380] },
  { title: 'Marvel Comics Amazing Spider-Man #300 CGC 9.8', category: 'Comics', priceRange: [800, 1500] },
  { title: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium', category: 'Electronics', priceRange: [900, 1200] },
];

function generateId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDealScoreValue(): number {
  const base = randomInRange(50, 95);
  return Math.max(40, Math.min(100, base + randomInRange(-10, 10)));
}

function getDealGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'low';
  if (score >= 50) return 'medium';
  return 'high';
}

export function generateMockSearchResults(
  keywords: string,
  count: number = 12
): SearchResult {
  const keywordLower = keywords.toLowerCase();
  let relevantProducts = MOCK_PRODUCTS.filter(p => 
    p.title.toLowerCase().includes(keywordLower) ||
    p.category.toLowerCase().includes(keywordLower)
  );
  
  if (relevantProducts.length === 0) {
    relevantProducts = MOCK_PRODUCTS;
  }

  const startTime = Date.now();
  
  const listings: ValuationResult[] = Array.from({ length: count }, (_, i) => {
    const product = relevantProducts[i % relevantProducts.length];
    const currentPrice = randomInRange(product.priceRange[0], product.priceRange[1]);
    const marketValue = currentPrice * (1 + randomInRange(10, 40) / 100);
    const scoreValue = generateDealScoreValue();
    const profit = marketValue - currentPrice;
    const roi = (profit / currentPrice) * 100;

    const listing: Listing = {
      id: generateId(),
      title: `${product.title} [MOCK DATA]`,
      currentPrice,
      currency: 'USD',
      bidCount: 0,
      watchCount: randomInRange(5, 50),
      condition: 'like_new',
      conditionDisplayName: 'Like New',
      imageUrls: ['https://via.placeholder.com/400'],
      primaryImageUrl: 'https://via.placeholder.com/400',
      listingUrl: `https://www.ebay.com/itm/${generateId()}`,
      seller: {
        id: `seller-${randomInRange(1000, 9999)}`,
        username: `mock_seller_${randomInRange(1000, 9999)}`,
        feedbackScore: randomInRange(100, 50000),
        feedbackPercentage: randomInRange(95, 100),
        totalTransactions: randomInRange(500, 10000),
        accountAgeDays: randomInRange(365, 3650),
        isTopRated: randomInRange(0, 1) === 1,
        riskLevel: 'low',
        riskFactors: [],
      },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + randomInRange(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
      category: {
        id: 'mock-category',
        name: product.category,
        level: 1,
        marketplace: {
          id: 'ebay' as const,
          name: 'eBay US',
          countryCode: 'US',
          currency: 'USD',
        },
      },
      marketplace: {
        id: 'ebay' as const,
        name: 'eBay US',
        countryCode: 'US',
        currency: 'USD',
      },
      shippingCost: randomInRange(0, 15),
      shippingType: 'Standard',
      location: 'United States',
      status: 'active',
    };

    const dealScore: DealScore = {
      score: scoreValue,
      grade: getDealGrade(scoreValue),
      label: scoreValue >= 70 ? 'Great Deal' : scoreValue >= 50 ? 'Good Deal' : 'Fair Deal',
      color: scoreValue >= 70 ? '#10b981' : scoreValue >= 50 ? '#f59e0b' : '#ef4444',
      potentialProfit: Math.round(profit * 100) / 100,
      roiPercentage: Math.round(roi * 10) / 10,
      confidence: 0.75,
    };

    const marketValueEstimate: MarketValueEstimate = {
      estimatedValue: Math.round(marketValue * 100) / 100,
      confidenceInterval: {
        low: Math.round(marketValue * 0.85 * 100) / 100,
        high: Math.round(marketValue * 1.15 * 100) / 100,
      },
      methodology: 'mock-comparable-analysis',
      sampleSize: randomInRange(5, 20),
      confidence: 0.8,
    };

    const sellerRisk: SellerRiskProfile = {
      level: getRiskLevel(listing.seller.feedbackPercentage),
      score: listing.seller.feedbackPercentage,
      factors: [],
      recommendation: 'Safe to purchase',
    };

    const comparableSales: ComparableSale[] = [];

    return {
      listing,
      comparableSales,
      marketValue: marketValueEstimate,
      dealScore,
      sellerRisk,
      analysisTimestamp: new Date().toISOString(),
    };
  });

  // Sort by deal score descending
  listings.sort((a, b) => b.dealScore.score - a.dealScore.score);

  return {
    listings,
    totalResults: count,
    page: 1,
    perPage: count,
    hasMore: false,
    searchId: `mock-search-${Date.now()}`,
    executionTimeMs: Date.now() - startTime,
  };
}
