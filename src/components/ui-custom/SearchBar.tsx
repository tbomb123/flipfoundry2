/**
 * SearchBar Component
 * Premium search interface with filters
 */

import React, { useState, useCallback } from 'react';
import { Search, SlidersHorizontal, X, TrendingUp, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { SaveSearchButton } from './SaveSearchButton';
import type { SearchParams, SearchFilters } from '@/types';

interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
  initialValues?: Partial<SearchFilters>;
  className?: string;
}

const trendingSearches = [
  'Pokemon cards',
  'Vintage watches',
  'Jordan sneakers',
  'Marvel comics',
  'Trading cards',
  'Retro games',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading = false,
  initialValues,
  className,
}) => {
  const [keywords, setKeywords] = useState(initialValues?.keywords || '');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialValues?.minPrice || 0,
    initialValues?.maxPrice || 2000,
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialValues?.categoryId || '');
  
  const handleSearch = useCallback(() => {
    if (!keywords.trim()) return;
    
    const params: SearchParams = {
      keywords: keywords.trim(),
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 2000 ? priceRange[1] : undefined,
      categoryId: selectedCategory || undefined,
      sortBy: 'dealScore',
      perPage: 12,
    };
    
    onSearch(params);
  }, [keywords, priceRange, selectedCategory, onSearch]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);
  
  const clearFilters = useCallback(() => {
    setPriceRange([0, 2000]);
    setSelectedCategory('');
  }, []);
  
  const hasActiveFilters = priceRange[0] > 0 || priceRange[1] < 2000 || selectedCategory !== '';
  
  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      {/* Main Search Input */}
      <div className="relative group">
        <div className={cn(
          'absolute inset-0 rounded-2xl transition-all duration-300',
          'bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-blue-500/20',
          'blur-xl opacity-50 group-hover:opacity-70'
        )} />
        
        <div className={cn(
          'relative flex items-center gap-2 p-2 rounded-2xl',
          'bg-slate-900/80 backdrop-blur-xl',
          'border border-slate-700/50',
          'focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20',
          'transition-all duration-300'
        )}>
          <Search className="ml-3 text-slate-400" size={22} />
          
          <Input
            type="text"
            placeholder="Search for items to flip..."
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex-1 border-0 bg-transparent text-lg text-white placeholder:text-slate-500',
              'focus-visible:ring-0 focus-visible:ring-offset-0'
            )}
            disabled={isLoading}
          />
          
          {keywords && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => setKeywords('')}
            >
              <X size={18} />
            </Button>
          )}
          
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'text-slate-400 hover:text-white hover:bg-slate-800',
                  hasActiveFilters && 'text-emerald-400'
                )}
              >
                <SlidersHorizontal size={18} />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            
            <PopoverContent 
              className="w-80 p-4 bg-slate-900/95 backdrop-blur-xl border-slate-700"
              align="end"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white">Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                      onClick={clearFilters}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                
                {/* Price Range */}
                <div className="space-y-3">
                  <label className="text-sm text-slate-400">Price Range</label>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    max={2000}
                    step={10}
                    className="py-2"
                  />
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}+</span>
                  </div>
                </div>
                
                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['Sports Cards', 'Sneakers', 'Watches', 'Electronics', 'Games'].map((cat) => (
                      <Badge
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedCategory === cat 
                            ? 'bg-emerald-600 hover:bg-emerald-500' 
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-600'
                        )}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            onClick={handleSearch}
            disabled={!keywords.trim() || isLoading}
            className={cn(
              'px-6 py-2.5 rounded-xl font-semibold',
              'bg-gradient-to-r from-emerald-600 to-cyan-600',
              'hover:from-emerald-500 hover:to-cyan-500',
              'text-white transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search size={18} className="mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Trending Searches */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-500 flex items-center gap-1">
          <TrendingUp size={14} />
          Trending:
        </span>
        {trendingSearches.map((term) => (
          <button
            key={term}
            onClick={() => {
              setKeywords(term);
              onSearch({ 
                keywords: term, 
                sortBy: 'dealScore',
                perPage: 12 
              });
            }}
            className={cn(
              'text-sm text-slate-400 hover:text-emerald-400',
              'transition-colors duration-200'
            )}
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
};
