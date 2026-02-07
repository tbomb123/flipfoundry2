/**
 * Saved Searches Hook
 * 
 * Manage saved searches via API.
 */

import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface SavedSearchFilters {
  priceMin?: number;
  priceMax?: number;
  category?: string;
  condition?: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: SavedSearchFilters;
  alertEnabled: boolean;
  minimumScore: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchInput {
  name: string;
  query: string;
  filters?: SavedSearchFilters;
  alertEnabled?: boolean;
  minimumScore?: number;
}

export interface UpdateSavedSearchInput {
  name?: string;
  query?: string;
  filters?: SavedSearchFilters;
  alertEnabled?: boolean;
  minimumScore?: number;
}

// =============================================================================
// API HELPERS
// =============================================================================

const getApiKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  return process.env.NEXT_PUBLIC_API_KEY || null;
};

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
};

// =============================================================================
// HOOK
// =============================================================================

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all saved searches
  const fetchSearches = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/saved-searches', {
        headers: getHeaders(),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch saved searches');
      }
      
      setSearches(data.data.searches);
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch saved searches';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new saved search
  const createSearch = useCallback(async (input: CreateSavedSearchInput): Promise<SavedSearch> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(input),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create saved search');
      }
      
      setSearches(prev => [data.data, ...prev]);
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create saved search';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update a saved search
  const updateSearch = useCallback(async (
    id: string, 
    input: UpdateSavedSearchInput
  ): Promise<SavedSearch> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/saved-searches/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(input),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update saved search');
      }
      
      setSearches(prev => prev.map(s => s.id === id ? data.data : s));
      return data.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update saved search';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a saved search
  const deleteSearch = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/saved-searches/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete saved search');
      }
      
      setSearches(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete saved search';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle alert for a saved search
  const toggleAlert = useCallback(async (id: string, enabled: boolean): Promise<SavedSearch> => {
    return updateSearch(id, { alertEnabled: enabled });
  }, [updateSearch]);

  return {
    searches,
    isLoading,
    error,
    fetchSearches,
    createSearch,
    updateSearch,
    deleteSearch,
    toggleAlert,
  };
}
