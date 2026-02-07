/**
 * useGradeEstimate Hook
 * 
 * Handles grade estimation API calls with loading and error states.
 */

import { useState, useCallback } from 'react';

export interface GradeEstimateResult {
  overallGrade: number;
  subgrades: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
  };
  confidence: number;
  provider: string;
  disclaimer: string;
}

interface UseGradeEstimateReturn {
  estimate: GradeEstimateResult | null;
  loading: boolean;
  error: string | null;
  estimateGrade: (itemId: string, imageUrl: string, additionalImageUrls?: string[]) => Promise<void>;
  reset: () => void;
}

export function useGradeEstimate(): UseGradeEstimateReturn {
  const [estimate, setEstimate] = useState<GradeEstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimateGrade = useCallback(async (
    itemId: string,
    imageUrl: string,
    additionalImageUrls?: string[]
  ) => {
    setLoading(true);
    setError(null);
    setEstimate(null);

    try {
      const response = await fetch('/api/cards/estimate-grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          imageUrl,
          additionalImageUrls,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error?.message || 'Failed to estimate grade';
        setError(errorMessage);
        return;
      }

      setEstimate(data.data);
    } catch (err) {
      console.error('Grade estimation error:', err);
      setError('Unable to connect to grading service. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setEstimate(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    estimate,
    loading,
    error,
    estimateGrade,
    reset,
  };
}

export default useGradeEstimate;
