/**
 * Raw Sports Card Detection
 * 
 * Determines if a listing is a "raw" (ungraded) sports card vs professionally graded.
 * Used to conditionally show grade estimation features.
 * 
 * Definition of "raw" for v1:
 * - Listing condition does NOT indicate a professional grader
 * - Title does NOT contain grading company names or graded terminology
 */

// Professional grading companies and their variations
const GRADING_COMPANIES = [
  'PSA',
  'BGS',
  'SGC',
  'CGC',
  'CSG',
  'HGA',
  'KSA',
  'GMA',
  'ISA',
  'AGS',
];

// Keywords that indicate a graded/slabbed card
const GRADED_KEYWORDS = [
  'graded',
  'slab',
  'slabbed',
  'gem mint',
  'gem-mint',
  'gm 10',
  'gm10',
  'mint 9',
  'mint 10',
  'pristine',
  'authenticated',
  'encapsulated',
  'certified',
];

// Condition names that indicate professional grading
const GRADED_CONDITIONS = [
  'graded',
  'certified',
  'authenticated',
  'professionally graded',
];

/**
 * Check if a title contains grading indicators
 */
function titleContainsGradingIndicators(title: string): boolean {
  const normalizedTitle = title.toLowerCase();
  
  // Check for grading company names (case insensitive, word boundary)
  for (const company of GRADING_COMPANIES) {
    // Match whole word or with numbers (e.g., "PSA 10", "BGS 9.5")
    const regex = new RegExp(`\\b${company.toLowerCase()}\\b`, 'i');
    if (regex.test(normalizedTitle)) {
      return true;
    }
  }
  
  // Check for graded keywords
  for (const keyword of GRADED_KEYWORDS) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if condition indicates professional grading
 */
function conditionIndicatesGrading(condition: string | undefined): boolean {
  if (!condition) return false;
  
  const normalizedCondition = condition.toLowerCase();
  
  for (const gradedCondition of GRADED_CONDITIONS) {
    if (normalizedCondition.includes(gradedCondition)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a listing appears to be a sports card
 * (Basic heuristic - can be expanded)
 */
function looksLikeSportsCard(title: string, categoryId?: string): boolean {
  const normalizedTitle = title.toLowerCase();
  
  // Sports card keywords
  const sportsCardKeywords = [
    'card',
    'rookie',
    'rc',
    'base',
    'insert',
    'parallel',
    'auto',
    'autograph',
    'patch',
    'relic',
    'refractor',
    'prizm',
    'topps',
    'panini',
    'upper deck',
    'bowman',
    'donruss',
    'fleer',
    'score',
    'select',
    'mosaic',
    'optic',
    'chrome',
  ];
  
  // Sports card category IDs (eBay)
  const sportsCardCategories = [
    '212',    // Sports Trading Cards
    '213',    // Baseball Cards
    '214',    // Basketball Cards  
    '215',    // Football Cards
    '216',    // Hockey Cards
    '217',    // Soccer Cards
    '218',    // Racing Cards
    '219',    // Wrestling Cards
    '220',    // Golf Cards
    '221',    // Tennis Cards
    '261328', // Sports Cards Singles
  ];
  
  // Check category if provided
  if (categoryId && sportsCardCategories.includes(categoryId)) {
    return true;
  }
  
  // Check title for sports card keywords
  return sportsCardKeywords.some(keyword => normalizedTitle.includes(keyword));
}

export interface RawCardCheckResult {
  isRaw: boolean;
  isSportsCard: boolean;
  showGradeEstimate: boolean;
  reasons: string[];
}

/**
 * Main detection function - determines if listing is a raw sports card
 * 
 * @param title - Listing title
 * @param condition - Listing condition (optional)
 * @param categoryId - eBay category ID (optional)
 * @returns Detection result with reasons
 */
export function isRawSportsCard(
  title: string,
  condition?: string,
  categoryId?: string
): RawCardCheckResult {
  const reasons: string[] = [];
  
  // First check if it looks like a sports card
  const isSportsCard = looksLikeSportsCard(title, categoryId);
  if (!isSportsCard) {
    return {
      isRaw: false,
      isSportsCard: false,
      showGradeEstimate: false,
      reasons: ['Not detected as sports card'],
    };
  }
  reasons.push('Detected as sports card');
  
  // Check for grading indicators in title
  const titleHasGrading = titleContainsGradingIndicators(title);
  if (titleHasGrading) {
    reasons.push('Title contains grading indicators');
    return {
      isRaw: false,
      isSportsCard: true,
      showGradeEstimate: false,
      reasons,
    };
  }
  reasons.push('No grading indicators in title');
  
  // Check condition
  const conditionHasGrading = conditionIndicatesGrading(condition);
  if (conditionHasGrading) {
    reasons.push('Condition indicates professional grading');
    return {
      isRaw: false,
      isSportsCard: true,
      showGradeEstimate: false,
      reasons,
    };
  }
  reasons.push('Condition does not indicate grading');
  
  // It's a raw sports card!
  return {
    isRaw: true,
    isSportsCard: true,
    showGradeEstimate: true,
    reasons,
  };
}

/**
 * Simple boolean check for UI components
 */
export function shouldShowGradeEstimate(
  title: string,
  condition?: string,
  categoryId?: string
): boolean {
  return isRawSportsCard(title, condition, categoryId).showGradeEstimate;
}

// Export constants for testing/customization
export const RAW_CARD_CONFIG = {
  GRADING_COMPANIES,
  GRADED_KEYWORDS,
  GRADED_CONDITIONS,
};
