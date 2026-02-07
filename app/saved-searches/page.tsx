/**
 * Saved Searches Dashboard
 * 
 * Manage all saved searches with alert controls.
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Bell, 
  BellOff, 
  Trash2, 
  Edit2, 
  ArrowLeft,
  Bookmark,
  Clock,
  Filter,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useSavedSearches, 
  type SavedSearch,
  type UpdateSavedSearchInput,
} from '@/hooks/useSavedSearches';

export default function SavedSearchesPage() {
  const { 
    searches, 
    isLoading, 
    error, 
    fetchSearches, 
    updateSearch, 
    deleteSearch, 
    toggleAlert 
  } = useSavedSearches();

  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [deletingSearchId, setDeletingSearchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateSavedSearchInput>({});

  // Fetch searches on mount
  useEffect(() => {
    fetchSearches().catch(console.error);
  }, [fetchSearches]);

  // Handle edit
  const handleEdit = (search: SavedSearch) => {
    setEditingSearch(search);
    setEditForm({
      name: search.name,
      minimumScore: search.minimumScore,
      alertEnabled: search.alertEnabled,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSearch) return;
    try {
      await updateSearch(editingSearch.id, editForm);
      setEditingSearch(null);
    } catch (error) {
      console.error('Failed to update search:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingSearchId) return;
    try {
      await deleteSearch(deletingSearchId);
      setDeletingSearchId(null);
    } catch (error) {
      console.error('Failed to delete search:', error);
    }
  };

  // Handle alert toggle
  const handleToggleAlert = async (search: SavedSearch) => {
    try {
      await toggleAlert(search.id, !search.alertEnabled);
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Bookmark className="text-emerald-400" size={22} />
                Saved Searches
              </h1>
              <p className="text-sm text-slate-400">
                {searches.length} saved search{searches.length !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
          <Link href="/">
            <Button className="bg-emerald-600 hover:bg-emerald-500">
              <Plus size={16} className="mr-2" />
              New Search
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Loading State */}
        {isLoading && searches.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
            <AlertCircle size={20} />
            <span>{error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fetchSearches()}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && searches.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="text-slate-600" size={32} />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No Saved Searches</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Save your searches to quickly run them again and get notified when new deals match your criteria.
            </p>
            <Link href="/">
              <Button className="bg-emerald-600 hover:bg-emerald-500">
                <Search size={16} className="mr-2" />
                Start Searching
              </Button>
            </Link>
          </div>
        )}

        {/* Searches Grid */}
        {searches.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {searches.map((search) => (
              <Card 
                key={search.id} 
                className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors"
                data-testid={`saved-search-card-${search.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold text-white truncate">
                        {search.name}
                      </CardTitle>
                      <CardDescription className="text-slate-400 text-sm mt-1">
                        &quot;{search.query}&quot;
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => handleEdit(search)}
                        data-testid={`edit-search-${search.id}`}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-400"
                        onClick={() => setDeletingSearchId(search.id)}
                        data-testid={`delete-search-${search.id}`}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Filters */}
                  {search.filters && Object.keys(search.filters).length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter size={12} className="text-slate-500" />
                      {(() => {
                        const filters = search.filters as { priceMin?: number; priceMax?: number; category?: string };
                        return (
                          <>
                            {filters.priceMin != null && (
                              <Badge variant="outline" className="text-xs bg-slate-800 border-slate-700">
                                Min: ${filters.priceMin}
                              </Badge>
                            )}
                            {filters.priceMax != null && (
                              <Badge variant="outline" className="text-xs bg-slate-800 border-slate-700">
                                Max: ${filters.priceMax}
                              </Badge>
                            )}
                            {filters.category && (
                              <Badge variant="outline" className="text-xs bg-slate-800 border-slate-700">
                                {filters.category}
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>Last run: {formatDate(search.lastRunAt)}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        search.alertEnabled 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-slate-800 border-slate-700 text-slate-500"
                      )}
                    >
                      Score ≥ {search.minimumScore}
                    </Badge>
                  </div>

                  {/* Alert Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      {search.alertEnabled ? (
                        <Bell size={16} className="text-emerald-400" />
                      ) : (
                        <BellOff size={16} className="text-slate-500" />
                      )}
                      <span className={cn(
                        "text-sm",
                        search.alertEnabled ? "text-emerald-400" : "text-slate-500"
                      )}>
                        {search.alertEnabled ? 'Alerts on' : 'Alerts off'}
                      </span>
                    </div>
                    <Switch
                      checked={search.alertEnabled}
                      onCheckedChange={() => handleToggleAlert(search)}
                      data-testid={`alert-toggle-${search.id}`}
                    />
                  </div>

                  {/* Run Search Button */}
                  <Link href={`/?q=${encodeURIComponent(search.query)}`}>
                    <Button 
                      variant="outline" 
                      className="w-full border-slate-700 hover:bg-slate-800 hover:border-emerald-500/50"
                    >
                      <Search size={14} className="mr-2" />
                      Run Search
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingSearch} onOpenChange={() => setEditingSearch(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Saved Search</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your saved search settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Name</label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Email Alerts</span>
              <Switch
                checked={editForm.alertEnabled ?? false}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, alertEnabled: checked }))}
              />
            </div>

            {editForm.alertEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-300">Minimum Score</label>
                  <span className="text-sm text-emerald-400">{editForm.minimumScore}</span>
                </div>
                <Slider
                  value={[editForm.minimumScore ?? 70]}
                  onValueChange={([value]) => setEditForm(prev => ({ ...prev, minimumScore: value }))}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingSearch(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-500">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSearchId} onOpenChange={() => setDeletingSearchId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Search?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete this saved search and disable any alerts associated with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
