/**
 * Ximilar Card Grading Provider
 * 
 * Integration with Ximilar's Card Grading API.
 * https://docs.ximilar.com/collectibles/card-grading
 * 
 * Requires: XIMILAR_API_TOKEN environment variable
 */

import type { 
  GradeInput, 
  GradeProvider, 
  GradeProviderResponse,
  GradeResult 
} from '../types';
import { GRADE_DISCLAIMER, LOW_CONFIDENCE_THRESHOLD } from '../types';

const XIMILAR_API_BASE = 'https://api.ximilar.com/card-grader/v2';
const XIMILAR_GRADE_ENDPOINT = `${XIMILAR_API_BASE}/grade`;

// Retry configuration - conservative to avoid hammering API
const MAX_RETRIES = 2;
const RETRY_DELAYS = [5000, 15000]; // 5s, then 15s

/**
 * Delay helper
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ximilar API Response Types (partial, relevant fields)
 */
interface XimilarGradeRecord {
  _status?: {
    code: number;
    text: string;
  };
  final?: number;           // Overall grade (1-10)
  corners?: number[];       // Array of corner grades
  edges?: number[];         // Array of edge grades
  surface?: number;         // Surface grade
  centering?: {
    value?: number;
    offsets?: {
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
    };
  };
  _tags?: string[];         // Condition tags like "Near Mint"
  scale_value?: number;
  max_scale_value?: number;
}

interface XimilarResponse {
  records?: XimilarGradeRecord[];
  status?: {
    code: number;
    text: string;
  };
}

/**
 * Check if Ximilar is configured
 */
function isXimilarConfigured(): boolean {
  return !!process.env.XIMILAR_API_TOKEN;
}

/**
 * Get API token
 */
function getApiToken(): string {
  const token = process.env.XIMILAR_API_TOKEN;
  if (!token) {
    throw new Error('XIMILAR_API_TOKEN not configured');
  }
  return token;
}

/**
 * Make request to Ximilar API with retry logic
 */
async function makeXimilarRequest(imageUrls: string[]): Promise<XimilarResponse> {
  const token = getApiToken();
  
  // Build records array - primary image as front, additional as back if available
  const records = imageUrls.map((url, index) => ({
    url,
    name: `image_${index}`,
    Side: index === 0 ? 'front' : 'back',
    mode: 'eBay', // Use eBay grading scale
  }));

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[XIMILAR] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      
      const response = await fetch(XIMILAR_GRADE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[XIMILAR] HTTP ${response.status}: ${errorText}`);
        
        // Don't retry on auth errors or bad requests
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${response.status}`);
        }
        if (response.status === 400) {
          throw new Error(`Bad request: ${errorText}`);
        }
        
        // Retry on server errors
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          const backoff = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.log(`[XIMILAR] Server error, backing off ${backoff / 1000}s...`);
          await delay(backoff);
          continue;
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as XimilarResponse;
      console.log(`[XIMILAR] Success on attempt ${attempt + 1}`);
      return data;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < MAX_RETRIES) {
        const backoff = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        console.log(`[XIMILAR] Error: ${lastError.message}. Backing off ${backoff / 1000}s...`);
        await delay(backoff);
      }
    }
  }
  
  throw lastError || new Error('Ximilar request failed after all retries');
}

/**
 * Parse Ximilar response into our standard format
 */
function parseXimilarResponse(response: XimilarResponse, itemId: string): GradeResult | null {
  const record = response.records?.[0];
  
  if (!record) {
    console.warn('[XIMILAR] No records in response');
    return null;
  }
  
  // Check for error status
  if (record._status?.code && record._status.code !== 200) {
    console.warn(`[XIMILAR] Record status error: ${record._status.text}`);
    return null;
  }
  
  // Extract grades
  const overallGrade = record.final;
  if (overallGrade === undefined || overallGrade === null) {
    console.warn('[XIMILAR] No final grade in response');
    return null;
  }
  
  // Calculate subgrades
  const cornersGrade = record.corners?.length 
    ? record.corners.reduce((a, b) => a + b, 0) / record.corners.length 
    : overallGrade;
    
  const edgesGrade = record.edges?.length
    ? record.edges.reduce((a, b) => a + b, 0) / record.edges.length
    : overallGrade;
    
  const surfaceGrade = record.surface ?? overallGrade;
  
  const centeringGrade = record.centering?.value ?? overallGrade;
  
  // Calculate confidence based on scale values
  let confidence = 0.7; // Default confidence
  if (record.scale_value !== undefined && record.max_scale_value !== undefined && record.max_scale_value > 0) {
    confidence = Math.min(0.95, (record.scale_value / record.max_scale_value) * 0.5 + 0.5);
  }
  
  // Round grades to 1 decimal
  const roundGrade = (g: number) => Math.round(g * 10) / 10;
  
  return {
    overallGrade: roundGrade(overallGrade),
    subgrades: {
      centering: roundGrade(centeringGrade),
      corners: roundGrade(cornersGrade),
      edges: roundGrade(edgesGrade),
      surface: roundGrade(surfaceGrade),
    },
    confidence: Math.round(confidence * 100) / 100,
    provider: 'ximilar',
    disclaimer: GRADE_DISCLAIMER,
    estimatedAt: new Date().toISOString(),
    rawResponse: record,
  };
}

/**
 * Ximilar Grade Provider Implementation
 */
export const ximilarProvider: GradeProvider = {
  name: 'ximilar',
  
  isConfigured(): boolean {
    return isXimilarConfigured();
  },
  
  async estimate(input: GradeInput): Promise<GradeProviderResponse> {
    // Check configuration
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Ximilar API token not configured',
          retryable: false,
        },
      };
    }
    
    try {
      // Collect all image URLs
      const imageUrls = [input.imageUrl];
      if (input.additionalImageUrls?.length) {
        imageUrls.push(...input.additionalImageUrls.slice(0, 1)); // Ximilar supports front/back
      }
      
      console.log(`[XIMILAR] Estimating grade for item ${input.itemId} with ${imageUrls.length} image(s)`);
      
      // Make API request with retries
      const response = await makeXimilarRequest(imageUrls);
      
      // Parse response
      const result = parseXimilarResponse(response, input.itemId);
      
      if (!result) {
        return {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: 'Unable to estimate grade from available photos. The image may be unclear or not showing a card properly.',
            retryable: false,
          },
        };
      }
      
      // Check confidence threshold
      if (result.confidence < LOW_CONFIDENCE_THRESHOLD) {
        console.warn(`[XIMILAR] Low confidence (${result.confidence}) - returning unable to estimate`);
        return {
          success: false,
          error: {
            code: 'LOW_CONFIDENCE',
            message: 'Unable to estimate grade with sufficient confidence from available photos. Try providing clearer images.',
            retryable: false,
          },
        };
      }
      
      return {
        success: true,
        result,
      };
      
    } catch (error) {
      console.error('[XIMILAR] Estimation failed:', error);
      
      const message = error instanceof Error ? error.message : 'Unknown error';
      const isRetryable = message.includes('500') || message.includes('timeout');
      
      return {
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: `Unable to estimate grade from available photos. ${isRetryable ? 'Please try again later.' : ''}`,
          retryable: isRetryable,
        },
      };
    }
  },
};

export default ximilarProvider;
