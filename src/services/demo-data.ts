/**
 * Demo Data Service
 * Provides sample listings for development and demo purposes
 * when eBay API credentials are not configured
 */

import type { Listing, ComparableSale, ValuationResult, Category, Marketplace } from '@/types';

// Sample categories
const categories: Category[] = [
  { id: '212', name: 'Sports Cards', level: 1, marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true } },
  { id: '183454', name: 'Trading Cards', level: 1, marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true } },
  { id: '15709', name: 'Sneakers', level: 1, marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true } },
  { id: '260324', name: 'Watches', level: 1, marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true } },
  { id: '625', name: 'Cameras', level: 1, marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true } },
  { id: '139971', name: 'Video Game Consoles', level: 1, marketplace: { id: 'ebay', name: 'eBay', logoUrl: '', supportedCategories: [], isActive: true } },
];

const marketplace: Marketplace = {
  id: 'ebay',
  name: 'eBay',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/EBay_logo.svg/1200px-EBay_logo.svg.png',
  supportedCategories: [],
  isActive: true,
};

// Generate a random seller
const createSeller = (riskLevel: 'low' | 'medium' | 'high' = 'low') => {
  const configs = {
    low: { feedback: 99.2, transactions: 2847, topRated: true },
    medium: { feedback: 96.5, transactions: 156, topRated: false },
    high: { feedback: 87.3, transactions: 12, topRated: false },
  };
  
  const config = configs[riskLevel];
  
  return {
    id: `seller_${Math.random().toString(36).substr(2, 9)}`,
    username: `Flipper${Math.floor(Math.random() * 9999)}`,
    feedbackScore: Math.floor(config.transactions * 0.8),
    feedbackPercentage: config.feedback,
    totalTransactions: config.transactions,
    accountAgeDays: Math.floor(Math.random() * 2000) + 100,
    isTopRated: config.topRated,
    riskLevel,
    riskFactors: riskLevel === 'high' ? ['Low feedback percentage', 'Low transaction volume'] : [],
  };
};

// Sample listing templates
const listingTemplates: Array<{
  title: string;
  category: Category;
  condition: Listing['condition'];
  basePrice: number;
  marketValue: number;
  imageUrl: string;
}> = [
  {
    title: '2023 Panini Prizm Victor Wembanyama Rookie Card RC #136 Spurs PSA 10',
    category: categories[0],
    condition: 'new',
    basePrice: 285.00,
    marketValue: 450.00,
    imageUrl: 'https://i.ebayimg.com/images/g/8YUAAOSwX~FkRFL4/s-l400.jpg',
  },
  {
    title: 'Jordan 1 Retro High OG Chicago Lost and Found Size 10.5 DS',
    category: categories[2],
    condition: 'new',
    basePrice: 320.00,
    marketValue: 485.00,
    imageUrl: 'https://i.ebayimg.com/images/g/voUAAOSw1WBj9k8Q/s-l400.jpg',
  },
  {
    title: 'Rolex Submariner 16610 Date Black Dial Stainless Steel 40mm',
    category: categories[3],
    condition: 'good',
    basePrice: 8200.00,
    marketValue: 9500.00,
    imageUrl: 'https://i.ebayimg.com/images/g/1OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'Sony A7III Mirrorless Camera Body Only - Low Shutter Count',
    category: categories[4],
    condition: 'like_new',
    basePrice: 1150.00,
    marketValue: 1450.00,
    imageUrl: 'https://i.ebayimg.com/images/g/5OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'Nintendo Switch OLED Model White Joy-Cons - Brand New Sealed',
    category: categories[5],
    condition: 'new',
    basePrice: 265.00,
    marketValue: 349.99,
    imageUrl: 'https://i.ebayimg.com/images/g/3OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'Pokemon Charizard Base Set 4/102 Holo Rare - PSA 7 NM',
    category: categories[1],
    condition: 'good',
    basePrice: 320.00,
    marketValue: 425.00,
    imageUrl: 'https://i.ebayimg.com/images/g/2OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'Vintage Omega Speedmaster Professional Moonwatch 3570.50',
    category: categories[3],
    condition: 'good',
    basePrice: 4200.00,
    marketValue: 5500.00,
    imageUrl: 'https://i.ebayimg.com/images/g/4OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'Fujifilm X100V Silver - Excellent Condition with Box',
    category: categories[4],
    condition: 'like_new',
    basePrice: 1100.00,
    marketValue: 1399.00,
    imageUrl: 'https://i.ebayimg.com/images/g/6OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: '2022 Topps Chrome Julio Rodriguez Rookie Auto Refractor /499',
    category: categories[0],
    condition: 'new',
    basePrice: 180.00,
    marketValue: 275.00,
    imageUrl: 'https://i.ebayimg.com/images/g/7OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'Yeezy Boost 350 V2 Bred Size 11 - Deadstock',
    category: categories[2],
    condition: 'new',
    basePrice: 280.00,
    marketValue: 380.00,
    imageUrl: 'https://i.ebayimg.com/images/g/8OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'Canon EOS R6 Mirrorless Camera with RF 24-105mm Lens Kit',
    category: categories[4],
    condition: 'like_new',
    basePrice: 2400.00,
    marketValue: 2899.00,
    imageUrl: 'https://i.ebayimg.com/images/g/9OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
  {
    title: 'PlayStation 5 Disc Edition Console - Brand New In Hand',
    category: categories[5],
    condition: 'new',
    basePrice: 425.00,
    marketValue: 499.99,
    imageUrl: 'https://i.ebayimg.com/images/g/0OUAAOSw8w5j6k8Q/s-l400.jpg',
  },
];

// Generate demo listings
export const generateDemoListings = (
  keywords: string,
  count: number = 12
): Listing[] => {
  const listings: Listing[] = [];
  const riskLevels: ('low' | 'medium' | 'high')[] = ['low', 'low', 'low', 'medium', 'medium', 'high'];
  
  // Filter templates based on keywords (simple matching)
  const lowerKeywords = keywords.toLowerCase();
  let templates = listingTemplates.filter(t => 
    t.title.toLowerCase().includes(lowerKeywords) ||
    t.category.name.toLowerCase().includes(lowerKeywords)
  );
  
  // If no matches, use all templates
  if (templates.length === 0) {
    templates = listingTemplates;
  }
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    
    // Add some price variation
    const priceVariation = (Math.random() - 0.5) * 0.2; // ±10%
    const currentPrice = Math.round(template.basePrice * (1 + priceVariation) * 100) / 100;
    
    const listing: Listing = {
      id: `demo_${Math.random().toString(36).substr(2, 9)}`,
      title: template.title,
      currentPrice,
      currency: 'USD',
      condition: template.condition,
      conditionDisplayName: template.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      imageUrls: [template.imageUrl],
      primaryImageUrl: template.imageUrl,
      listingUrl: `https://www.ebay.com/itm/demo-${i}`,
      seller: createSeller(riskLevel),
      category: template.category,
      marketplace,
      shippingCost: Math.random() > 0.5 ? Math.round(Math.random() * 20 + 5) : 0,
      shippingType: Math.random() > 0.5 ? 'FreeShipping' : 'Calculated',
      location: ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Miami, FL'][Math.floor(Math.random() * 4)],
      startTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      watchCount: Math.floor(Math.random() * 50),
      bidCount: Math.floor(Math.random() * 10),
      status: 'active',
    };
    
    listings.push(listing);
  }
  
  return listings;
};

// Generate demo comparable sales
export const generateDemoComparables = (
  listing: Listing,
  count: number = 10
): ComparableSale[] => {
  const comparables: ComparableSale[] = [];
  const baseValue = listing.currentPrice * (1.2 + Math.random() * 0.3); // 20-50% higher
  
  for (let i = 0; i < count; i++) {
    const variation = (Math.random() - 0.5) * 0.3; // ±15%
    const soldPrice = Math.round(baseValue * (1 + variation) * 100) / 100;
    const daysAgo = Math.floor(Math.random() * 60) + 1;
    
    comparables.push({
      id: `comp_${Math.random().toString(36).substr(2, 9)}`,
      title: listing.title.substring(0, 50) + '...',
      soldPrice,
      currency: listing.currency,
      condition: listing.condition,
      soldDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      imageUrl: listing.primaryImageUrl,
      listingUrl: `https://www.ebay.com/itm/comp-${i}`,
      marketplace,
    });
  }
  
  return comparables.sort((a, b) => 
    new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime()
  );
};

// Generate complete demo valuation results
export const generateDemoValuations = (
  keywords: string,
  count: number = 12
): ValuationResult[] => {
  const listings = generateDemoListings(keywords, count);
  
  return listings.map(listing => {
    const comparables = generateDemoComparables(listing, 8 + Math.floor(Math.random() * 8));
    
    // Calculate market value from comparables
    const prices = comparables.map(c => c.soldPrice);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = Math.sqrt(prices.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / prices.length);
    
    const estimatedValue = Math.round(avgPrice * 100) / 100;
    const confidence = Math.min(0.95, 0.5 + (comparables.length / 20));
    
    // Calculate deal score
    const potentialProfit = estimatedValue - listing.currentPrice;
    const roiPercentage = (potentialProfit / listing.currentPrice) * 100;
    const profitMargin = potentialProfit / estimatedValue;
    
    // Score calculation
    let score = Math.min(100, Math.max(0, 
      (profitMargin * 200 * 0.4) + 
      (Math.min(roiPercentage * 1.5, 100) * 0.35) +
      ((listing.seller.riskLevel === 'low' ? 100 : listing.seller.riskLevel === 'medium' ? 60 : 20) * 0.15) +
      (confidence * 100 * 0.1)
    ));
    
    // Determine grade
    let grade: ValuationResult['dealScore']['grade'];
    let label: string;
    let color: string;
    
    if (score >= 70) { grade = 'A+'; label = 'Excellent Deal'; color = '#10B981'; }
    else if (score >= 55) { grade = 'A'; label = 'Great Deal'; color = '#34D399'; }
    else if (score >= 40) { grade = 'B+'; label = 'Good Deal'; color = '#22D3EE'; }
    else if (score >= 25) { grade = 'B'; label = 'Fair Deal'; color = '#60A5FA'; }
    else if (score >= 10) { grade = 'C'; label = 'Below Average'; color = '#FBBF24'; }
    else if (score > 0) { grade = 'D'; label = 'Poor Deal'; color = '#F97316'; }
    else { grade = 'F'; label = 'Overpriced'; color = '#EF4444'; }
    
    return {
      listing,
      comparableSales: comparables,
      marketValue: {
        estimatedValue,
        confidenceInterval: {
          low: Math.round((estimatedValue - stdDev) * 100) / 100,
          high: Math.round((estimatedValue + stdDev) * 100) / 100,
        },
        methodology: `Weighted average of ${comparables.length} recent comparable sales`,
        sampleSize: comparables.length,
        confidence: Math.round(confidence * 100) / 100,
      },
      dealScore: {
        score: Math.round(score),
        grade,
        label,
        color,
        potentialProfit: Math.round(potentialProfit * 100) / 100,
        roiPercentage: Math.round(roiPercentage * 10) / 10,
        confidence,
      },
      sellerRisk: {
        level: listing.seller.riskLevel,
        score: listing.seller.riskLevel === 'low' ? 92 : listing.seller.riskLevel === 'medium' ? 65 : 35,
        factors: listing.seller.riskFactors.length > 0 
          ? listing.seller.riskFactors 
          : ['No significant risk factors'],
        recommendation: listing.seller.riskLevel === 'low' 
          ? 'This seller has excellent credentials. Low risk transaction.'
          : listing.seller.riskLevel === 'medium'
          ? 'Exercise normal caution. Review seller feedback before purchasing.'
          : 'High risk seller. Proceed with caution.',
      },
      analysisTimestamp: new Date().toISOString(),
    };
  });
};
