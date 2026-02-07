/**
 * Mock Grading Provider
 * 
 * Development/testing provider that returns deterministic grades
 * without making any API calls.
 */

import type { 
  GradeInput, 
  GradeProvider, 
  GradeProviderResponse 
} from '../types';
import { GRADE_DISCLAIMER } from '../types';

/**
 * Generate deterministic hash from string
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Mock Grade Provider Implementation
 */
export const mockProvider: GradeProvider = {
  name: 'mock',
  
  isConfigured(): boolean {
    return true; // Always available
  },
  
  async estimate(input: GradeInput): Promise<GradeProviderResponse> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    
    // Generate deterministic grades based on itemId
    const hash = simpleHash(input.itemId);
    const baseGrade = 6 + (hash % 40) / 10; // 6.0 - 9.9 range
    const variance = 0.5;
    
    const roundGrade = (g: number) => Math.round(Math.max(1, Math.min(10, g)) * 10) / 10;
    
    const subgrades = {
      centering: roundGrade(baseGrade + ((hash * 2) % 10 - 5) / 10 * variance),
      corners: roundGrade(baseGrade + ((hash * 3) % 10 - 5) / 10 * variance),
      edges: roundGrade(baseGrade + ((hash * 5) % 10 - 5) / 10 * variance),
      surface: roundGrade(baseGrade + ((hash * 7) % 10 - 5) / 10 * variance),
    };
    
    return {
      success: true,
      result: {
        overallGrade: roundGrade(baseGrade),
        subgrades,
        confidence: 0.65 + (hash % 30) / 100, // 0.65 - 0.95 range
        provider: 'mock-v1',
        disclaimer: GRADE_DISCLAIMER + ' [MOCK DATA - NOT A REAL ESTIMATE]',
        estimatedAt: new Date().toISOString(),
      },
    };
  },
};

export default mockProvider;
