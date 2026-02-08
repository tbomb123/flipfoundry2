/**
 * Mock eBay Data Generator
 * 
 * Returns realistic mock data when eBay API calls are disabled.
 * Used during rate limit periods to keep the UI functional.
 */

import type { SearchResult } from '@/types';

// Sample product data for different categories
const MOCK_PRODUCTS = [
  {
    title: 'Pokemon Charizard Base Set Holo 4/102 - Near Mint',
    category: 'Trading Cards',
    priceRange: [150, 400],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-pokemon.jpg',
  },
  {
    title: 'Nike Air Jordan 1 Retro High OG Chicago - Size 10',
    category: 'Sneakers',
    priceRange: [180, 350],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-jordans.jpg',
  },
  {
    title: 'Vintage Rolex Submariner 5513 - 1970s',
    category: 'Watches',
    priceRange: [8000, 15000],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-rolex.jpg',
  },
  {
    title: 'Sony PlayStation 5 Console - Disc Edition',
    category: 'Electronics',
    priceRange: [400, 550],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-ps5.jpg',
  },
  {
    title: 'Topps 2023 Baseball Complete Set Factory Sealed',
    category: 'Sports Cards',
    priceRange: [50, 120],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-topps.jpg',
  },
  {
    title: 'Nintendo Switch OLED Model - White',
    category: 'Gaming',
    priceRange: [280, 380],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-switch.jpg',
  },
  {
    title: 'Marvel Comics Amazing Spider-Man #300 CGC 9.8',
    category: 'Comics',
    priceRange: [800, 1500],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-comics.jpg',
  },
  {
    title: 'Apple iPhone 15 Pro Max 256GB - Natural Titanium',
    category: 'Electronics',
    priceRange: [900, 1200],
    imageUrl: 'https://i.ebayimg.com/images/g/placeholder-iphone.jpg',
  },
];

function generateMockItemId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDealScore(): number {
  // Generate scores with a distribution favoring mid-range (60-80)
  const base = randomInRange(50, 95);
  const adjustment = randomInRange(-10, 10);
  return Math.max(40, Math.min(100, base + adjustment));
}

export function generateMockSearchResults(
  keywords: string,
  count: number = 12
): SearchResult {
  // Filter products loosely by keywords
  const keywordLower = keywords.toLowerCase();
  let relevantProducts = MOCK_PRODUCTS.filter(p => 
    p.title.toLowerCase().includes(keywordLower) ||
    p.category.toLowerCase().includes(keywordLower)
  );
  
  // If no matches, use all products
  if (relevantProducts.length === 0) {
    relevantProducts = MOCK_PRODUCTS;
  }

  const startTime = Date.now();
  
  const listings = Array.from({ length: count }, (_, i) => {
    const product = relevantProducts[i % relevantProducts.length];
    const currentPrice = randomInRange(product.priceRange[0], product.priceRange[1]);
    const marketValue = currentPrice * (1 + randomInRange(10, 40) / 100);
    const dealScore = generateDealScore();
    
    return {
      listing: {
        itemId: generateMockItemId(),
        title: `${product.title} [MOCK DATA]`,
        price: {
          current: currentPrice,
          currency: 'USD',
          shipping: randomInRange(0, 15),
        },
        seller: {
          username: `mock_seller_${randomInRange(1000, 9999)}`,
          feedbackScore: randomInRange(100, 50000),
          feedbackPercent: randomInRange(95, 100),
        },
        condition: ['New', 'Like New', 'Very Good', 'Good'][randomInRange(0, 3)] as 'New' | 'Like New' | 'Very Good' | 'Good',
        imageUrl: product.imageUrl,
        viewItemUrl: `https://www.ebay.com/itm/${generateMockItemId()}`,
        listingType: 'FixedPrice' as const,
        location: 'United States',
        endTime: new Date(Date.now() + randomInRange(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
      },
      marketValue: Math.round(marketValue * 100) / 100,
      dealScore,
      profitPotential: Math.round((marketValue - currentPrice) * 100) / 100,
      riskLevel: dealScore > 75 ? 'low' : dealScore > 50 ? 'medium' : 'high' as 'low' | 'medium' | 'high',
      comparable: [],
    };
  });

  // Sort by deal score descending
  listings.sort((a, b) => b.dealScore - a.dealScore);

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
