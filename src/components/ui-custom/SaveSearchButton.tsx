/**
 * Save Search Button
 * 
 * Quick-save component for the search interface.
 * Allows users to save their current search with one click.
 */

'use client';

import React, { useState } from 'react';
import { Bookmark, Bell, BellOff, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSavedSearches, type SavedSearchFilters } from '@/hooks/useSavedSearches';

interface SaveSearchButtonProps {
  query: string;
  filters?: SavedSearchFilters;
  className?: string;
  variant?: 'icon' | 'button';
  onSaved?: () => void;
}

export const SaveSearchButton: React.FC<SaveSearchButtonProps> = ({
  query,
  filters = {},
  className,
  variant = 'icon',
  onSaved,
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [minimumScore, setMinimumScore] = useState(70);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { createSearch } = useSavedSearches();

  const handleSave = async () => {
    if (!name.trim() || !query.trim()) return;

    setIsSaving(true);
    try {
      await createSearch({
        name: name.trim(),
        query: query.trim(),
        filters,
        alertEnabled,
        minimumScore,
      });
      
      setSaved(true);
      setTimeout(() => {
        setOpen(false);
        setSaved(false);
        setName('');
        onSaved?.();
      }, 1000);
    } catch (error) {
      console.error('Failed to save search:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setName(query.slice(0, 50)); // Default name from query
      setSaved(false);
    }
  };

  if (!query.trim()) {
    return null; // Don't show if no query
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn('text-slate-400 hover:text-emerald-400 hover:bg-slate-800', className)}
            data-testid="save-search-trigger"
          >
            <Bookmark size={18} />
          </Button>
        ) : (
          <Button
            variant="outline"
            className={cn(
              'border-slate-700 bg-slate-800/50 text-slate-300',
              'hover:bg-slate-700 hover:text-white hover:border-emerald-500/50',
              className
            )}
            data-testid="save-search-trigger"
          >
            <Bookmark size={16} className="mr-2" />
            Save Search
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="text-emerald-400" size={20} />
            Save Search
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Save this search and get notified when new deals match your criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search Query Preview */}
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="text-xs text-slate-500 mb-1">Search Query</div>
            <div className="text-sm text-white font-medium">{query}</div>
            {Object.keys(filters).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {filters.priceMin && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    Min: ${filters.priceMin}
                  </span>
                )}
                {filters.priceMax && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    Max: ${filters.priceMax}
                  </span>
                )}
                {filters.category && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {filters.category}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="search-name" className="text-slate-300">
              Search Name
            </Label>
            <Input
              id="search-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pokemon cards under $50"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              maxLength={100}
              data-testid="save-search-name-input"
            />
          </div>

          {/* Alert Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-center gap-3">
              {alertEnabled ? (
                <Bell className="text-emerald-400" size={20} />
              ) : (
                <BellOff className="text-slate-500" size={20} />
              )}
              <div>
                <div className="text-sm font-medium text-white">Email Alerts</div>
                <div className="text-xs text-slate-400">
                  Get notified when deals are found
                </div>
              </div>
            </div>
            <Switch
              checked={alertEnabled}
              onCheckedChange={setAlertEnabled}
              data-testid="save-search-alert-toggle"
            />
          </div>

          {/* Minimum Score (only if alerts enabled) */}
          {alertEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Minimum Deal Score</Label>
                <span className="text-sm font-mono text-emerald-400">{minimumScore}</span>
              </div>
              <Slider
                value={[minimumScore]}
                onValueChange={([value]) => setMinimumScore(value)}
                min={0}
                max={100}
                step={5}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>All deals (0)</span>
                <span>Great deals only (100)</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || saved}
            className={cn(
              'bg-emerald-600 hover:bg-emerald-500 text-white',
              saved && 'bg-green-600'
            )}
            data-testid="save-search-submit"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check size={16} className="mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Bookmark size={16} className="mr-2" />
                Save Search
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
