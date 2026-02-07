/**
 * Photo Quality Guardrails
 * 
 * Basic validation for grade estimation image quality.
 * No OCR or heavy processing - just URL and metadata checks.
 */

export interface PhotoQualityInput {
  imageUrl: string;
  additionalImageUrls?: string[];
}

export interface PhotoQualityResult {
  valid: boolean;
  imageCount: number;
  confidenceModifier: number;  // Multiplier (1.0 = no change, 0.8 = reduce by 20%)
  label: string | null;        // "Low confidence" etc.
  error?: {
    code: string;
    message: string;
  };
}

// Known low-quality image indicators in URLs
const LOW_QUALITY_INDICATORS = [
  's-l64',    // eBay 64px thumbnail
  's-l96',    // eBay 96px thumbnail  
  's-l140',   // eBay 140px thumbnail
  's-l225',   // eBay 225px small
  '_thumb',
  'thumbnail',
  '/t/',      // Common thumbnail path
  '64x64',
  '96x96',
  '100x100',
  '150x150',
];

// Minimum acceptable image dimensions in URL (if detectable)
const MIN_IMAGE_SIZE = 300;

/**
 * Check if URL appears to be a low-resolution image
 */
function isLowResolutionUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  
  // Check for known low-quality indicators
  for (const indicator of LOW_QUALITY_INDICATORS) {
    if (lowerUrl.includes(indicator.toLowerCase())) {
      return true;
    }
  }
  
  // Try to detect size from URL patterns like "300x300" or "s-l300"
  const sizeMatch = lowerUrl.match(/s-l(\d+)|(\d+)x(\d+)/);
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1] || sizeMatch[2] || '0', 10);
    if (size > 0 && size < MIN_IMAGE_SIZE) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if URL is a valid image URL
 */
function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const trimmed = url.trim();
  
  // Must have http/https protocol
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  
  // Must have some path after domain
  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === '/') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate photo quality for grade estimation
 */
export function validatePhotoQuality(input: PhotoQualityInput): PhotoQualityResult {
  const { imageUrl, additionalImageUrls = [] } = input;
  
  // Check primary image URL
  if (!isValidImageUrl(imageUrl)) {
    return {
      valid: false,
      imageCount: 0,
      confidenceModifier: 0,
      label: null,
      error: {
        code: 'MISSING_IMAGE',
        message: 'No image URL provided. Cannot estimate grade without photos.',
      },
    };
  }
  
  // Check if primary image is low resolution
  if (isLowResolutionUrl(imageUrl)) {
    return {
      valid: false,
      imageCount: 0,
      confidenceModifier: 0,
      label: null,
      error: {
        code: 'LOW_RESOLUTION',
        message: 'Image appears to be a low-resolution thumbnail. Please provide a larger image for accurate grading.',
      },
    };
  }
  
  // Count valid additional images
  const validAdditionalUrls = additionalImageUrls.filter(url => 
    isValidImageUrl(url) && !isLowResolutionUrl(url)
  );
  
  const totalImages = 1 + validAdditionalUrls.length;
  
  // Single image - allow but reduce confidence
  if (totalImages === 1) {
    return {
      valid: true,
      imageCount: 1,
      confidenceModifier: 0.8,  // Reduce confidence by 20%
      label: 'Low confidence (single image)',
    };
  }
  
  // 2 images - slight confidence reduction
  if (totalImages === 2) {
    return {
      valid: true,
      imageCount: 2,
      confidenceModifier: 0.9,  // Reduce confidence by 10%
      label: null,
    };
  }
  
  // 3+ images - full confidence
  return {
    valid: true,
    imageCount: totalImages,
    confidenceModifier: 1.0,
    label: null,
  };
}

/**
 * Apply confidence modifier from photo quality check
 */
export function applyConfidenceModifier(
  baseConfidence: number, 
  photoQuality: PhotoQualityResult
): number {
  return Math.round(baseConfidence * photoQuality.confidenceModifier * 100) / 100;
}

// Export for testing
export const PHOTO_QUALITY_CONFIG = {
  LOW_QUALITY_INDICATORS,
  MIN_IMAGE_SIZE,
};
