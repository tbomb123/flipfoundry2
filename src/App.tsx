/**
 * FlipFoundry - Main Application
 * AI-powered arbitrage platform for finding undervalued assets
 */

import { useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from '@/components/Header';
import { Hero } from '@/sections/Hero';
import { DealsGrid } from '@/sections/DealsGrid';
import { useSearch } from '@/hooks/useSearch';
import type { ValuationResult, SearchParams } from '@/types';
import './App.css';

function App() {
  const { 
    results, 
    isLoading, 
    error, 
    hasMore, 
    search, 
    loadMore,
  } = useSearch();
  
  const handleSearch = useCallback(async (params: SearchParams) => {
    try {
      await search(params);
      toast.success(`Found ${results.length} potential flips!`);
    } catch (err) {
      toast.error('Failed to search. Please try again.');
    }
  }, [search, results.length]);
  
  const handleViewDetails = useCallback((valuation: ValuationResult) => {
    toast.info(`Viewing details for: ${valuation.listing.title.substring(0, 50)}...`);
  }, []);
  
  const handleAddToWatchlist = useCallback(() => {
    toast.success('Added to watchlist!', {
      description: 'You\'ll be notified of price changes.',
    });
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Toaster 
        position="top-right" 
        theme="dark"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            color: '#fff',
          },
        }}
      />
      
      <Header />
      
      <main className="pt-16">
        <Hero 
          onSearch={handleSearch}
          isLoading={isLoading}
          resultCount={results.length > 0 ? results.length : undefined}
        />
        
        {results.length > 0 && (
          <DealsGrid
            results={results}
            isLoading={isLoading}
            error={error}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onViewDetails={handleViewDetails}
            onAddToWatchlist={handleAddToWatchlist}
          />
        )}
        
        {/* Features Section */}
        <section id="features" className="py-20 px-4 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Why Choose <span className="text-emerald-400">FlipFoundry</span>?
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Our AI-powered platform analyzes thousands of listings to find the best flip opportunities.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'AI Valuation Engine',
                  description: 'Our algorithm analyzes sold comparables, removes outliers, and weights by recency to estimate true market value.',
                  icon: '🎯',
                },
                {
                  title: 'Deal Scoring',
                  description: 'Each listing gets a grade from A+ to F based on profit potential, ROI, and seller risk factors.',
                  icon: '📊',
                },
                {
                  title: 'Risk Assessment',
                  description: 'We analyze seller feedback, transaction history, and account age to flag potential risks.',
                  icon: '🛡️',
                },
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition-colors"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* How It Works */}
        <section id="how-it-works" className="py-20 px-4 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                How It <span className="text-cyan-400">Works</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Find profitable flips in three simple steps.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Search',
                  description: 'Enter keywords for items you want to flip. Filter by price, category, and condition.',
                },
                {
                  step: '02',
                  title: 'Analyze',
                  description: 'Our AI scans eBay, analyzes sold comparables, and calculates deal scores in seconds.',
                },
                {
                  step: '03',
                  title: 'Profit',
                  description: 'Review graded deals, check seller risk, and click through to purchase on eBay.',
                },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="text-6xl font-bold text-slate-800/50 mb-4">{item.step}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.description}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-slate-800" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="py-12 px-4 border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="text-lg font-semibold text-white">FlipFoundry</span>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Contact</a>
              </div>
              
              <p className="text-sm text-slate-600">
                © 2024 FlipFoundry. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;
