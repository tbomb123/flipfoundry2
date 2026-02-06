/**
 * useSearch Hook
 * Manages search state and executes searches with valuation analysis
 * Uses secure backend API (no direct eBay API calls from client)
 */

import { useState, useCallback, useRef } from 'react';
import type { SearchParams, ValuationResult, ApiError } from '@/types';
import { searchListings, getSoldComparables } from '@/services/api-client';
import { analyzeListings } from '@/services/scoring';
import { generateDemoValuations } from '@/services/demo-data';
import { getEbayStatus } from '@/services/api-client';

interface UseSearchState {
  results: ValuationResult[];
  isLoading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  totalResults: number;
  searchId: string | null;
  progress: {
    completed: number;
    total: number;
  } | null;
}

interface UseSearchReturn extends UseSearchState {
  search: (params: SearchParams) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
}

const initialState: UseSearchState = {
  results: [],
  isLoading: false,
  error: null,
  hasMore: false,
  totalResults: 0,
  searchId: null,
  progress: null,
};

export const useSearch = (): UseSearchReturn => {
  const [state, setState] = useState<UseSearchState>(initialState);
  const currentSearchParams = useRef<SearchParams | null>(null);
  const currentPage = useRef(1);

  const search = useCallback(async (params: SearchParams) => {
    // Reset state for new search
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: { completed: 0, total: params.perPage || 12 },
    }));
    currentSearchParams.current = params;
    currentPage.current = 1;

    try {
      // Check if backend API is available and eBay is configured
      let useDemoMode = false;
      try {
        const status = await getEbayStatus();
        if (!status.configured) {
          console.warn('eBay API not configured on server, using demo mode');
          useDemoMode = true;
        }
      } catch {
        console.warn('Backend API unavailable, using demo mode');
        useDemoMode = true;
      }

      let valuations: ValuationResult[] = [];

      if (useDemoMode) {
        // Use demo data for development/testing
        console.log('Using demo data');
        valuations = generateDemoValuations(params.keywords, params.perPage || 12);

        setState({
          results: valuations,
          isLoading: false,
          error: null,
          hasMore: false,
          totalResults: valuations.length,
          searchId: crypto.randomUUID(),
          progress: null,
        });
        return;
      }

      // Search for listings via backend API
      const { listings, total, hasMore } = await searchListings({
        ...params,
        page: 1,
      });

      if (listings.length === 0) {
        setState({
          results: [],
          isLoading: false,
          error: null,
          hasMore: false,
          totalResults: 0,
          searchId: crypto.randomUUID(),
          progress: null,
        });
        return;
      }

      // Analyze each listing with comparable sales (parallel with concurrency)
      valuations = await analyzeListings(
        listings,
        async (keywords) => {
          return getSoldComparables(keywords, {
            categoryId: params.categoryId,
            daysBack: 90,
            maxResults: 20,
          });
        },
        {
          concurrency: 4,
          onProgress: (completed, total) => {
            setState((prev) => ({
              ...prev,
              progress: { completed, total },
            }));
          },
        }
      );

      // Sort by deal score if requested
      if (params.sortBy === 'dealScore') {
        valuations.sort((a, b) => b.dealScore.score - a.dealScore.score);
      } else if (params.sortBy === 'roi') {
        valuations.sort((a, b) => b.dealScore.roiPercentage - a.dealScore.roiPercentage);
      }

      setState({
        results: valuations,
        isLoading: false,
        error: null,
        hasMore,
        totalResults: total,
        searchId: crypto.randomUUID(),
        progress: null,
      });
    } catch (error) {
      console.error('Search error:', error);

      const apiError: ApiError =
        error && typeof error === 'object' && 'code' in error
          ? (error as ApiError)
          : {
              code: 'SEARCH_ERROR',
              message: error instanceof Error ? error.message : 'An unexpected error occurred',
            };

      setState({
        results: [],
        isLoading: false,
        error: apiError,
        hasMore: false,
        totalResults: 0,
        searchId: null,
        progress: null,
      });
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!currentSearchParams.current || !state.hasMore || state.isLoading) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));
    currentPage.current += 1;

    try {
      // Check if backend is available
      let useDemoMode = false;
      try {
        const status = await getEbayStatus();
        if (!status.configured) {
          useDemoMode = true;
        }
      } catch {
        useDemoMode = true;
      }

      if (useDemoMode) {
        // No more demo data
        setState((prev) => ({ ...prev, isLoading: false, hasMore: false }));
        return;
      }

      const { listings, hasMore } = await searchListings({
        ...currentSearchParams.current,
        page: currentPage.current,
      });

      const newValuations = await analyzeListings(
        listings,
        async (keywords) => {
          return getSoldComparables(keywords, {
            categoryId: currentSearchParams.current?.categoryId,
            daysBack: 90,
            maxResults: 20,
          });
        },
        { concurrency: 4 }
      );

      setState((prev) => ({
        ...prev,
        results: [...prev.results, ...newValuations],
        isLoading: false,
        hasMore,
      }));
    } catch (error) {
      console.error('Load more error:', error);

      const apiError: ApiError =
        error && typeof error === 'object' && 'code' in error
          ? (error as ApiError)
          : {
              code: 'LOAD_MORE_ERROR',
              message: error instanceof Error ? error.message : 'Failed to load more results',
            };

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: apiError,
      }));
    }
  }, [state.hasMore, state.isLoading]);

  const clearResults = useCallback(() => {
    setState(initialState);
    currentSearchParams.current = null;
    currentPage.current = 1;
  }, []);

  return {
    ...state,
    search,
    loadMore,
    clearResults,
  };
};
