'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageContainer from '@/components/PageContainer';
import { supabase } from '@/lib/supabaseClient';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { GripVertical, Plus, Trash2, AlertCircle, CheckCircle2, Edit2, Check, X } from 'lucide-react';
import {
  comparePositions,
  enrichWithMetadata,
  getNextRootPosition,
  getNextChildPosition,
  getDescendants,
  recalculateDescendantPosition,
  organizeHierarchy,
  getParentPosition,
} from '@/lib/navigation-hierarchy';

const VISIBILITY_REFETCH_MS = 60_000;

interface NavigationLabel {
  id: string;
  label: string;
  position: string;
  is_enabled: boolean;
  path?: string | null;
  is_deleted?: boolean;
  // Virtual fields derived from position string
  parent_id?: string | null;
  level: number;
  order: number;
}

export default function NavigationManagerPage() {
  const { tenant_id } = useTenant();
  const [labels, setLabels] = useState<NavigationLabel[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newPath, setNewPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropZone, setDropZone] = useState<{ index: number; position: 'before' | 'after' | 'child' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPath, setEditPath] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render key
  const hasFetchedOnce = useRef(false);
  const lastFetchAt = useRef(0);

  // Build hierarchical tree and sort using the navigation hierarchy algorithm
  const sortLabels = (labels: any[]): NavigationLabel[] => {
    // Enrich labels with metadata using the hierarchy algorithm
    const enriched = labels.map(l => {
      const enriched = enrichWithMetadata(l, labels);
      // Ensure the return type matches NavigationLabel interface exactly
      return {
        ...l,
        ...enriched,
        parent_id: enriched.parent_id,
        level: enriched.level,
        order: enriched.order,
      } as NavigationLabel;
    });
    
    // Sort by position string (preserves hierarchy)
    return enriched.sort((a, b) => comparePositions(a.position, b.position));
  };

  // Fetch labels from Supabase. When tenant_id exists, filter by it (tenant-scoped nav).
  // background=true: refetch without loading state (e.g. after mutations, tab return).
  const fetchLabels = useCallback(async (background = false) => {
    const showLoading = !background && !hasFetchedOnce.current;
    if (showLoading) {
      setIsLoading(true);
      setError(null);
    }
    try {
      if (!tenant_id) {
        setLabels([]);
        setError('Your account is not associated with a tenant.');
        return;
      }
      let query = supabase
        .from('navigation')
        .select('*')
        .order('position', { ascending: true });
      if (tenant_id) query = query.eq('tenant_id', tenant_id);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const normalizedData = (data || []).map((item: any) => ({
        ...item,
        position: String(item.position || '1')
      }));
      const sorted = sortLabels(normalizedData);
      setLabels(sorted);
      setRefreshKey(prev => prev + 1);
      hasFetchedOnce.current = true;
      lastFetchAt.current = Date.now();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch labels');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [tenant_id]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  useEffect(() => {
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchAt.current < VISIBILITY_REFETCH_MS) return;
      fetchLabels(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchLabels]);

  // Add new label. Requires tenant_id when nav is tenant-scoped (RLS).
  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLabel.trim()) {
      setError('Label cannot be empty');
      return;
    }

    if (tenant_id == null) {
      setError('Your account is not associated with a tenant. Cannot add navigation labels.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      // Calculate next root position using the hierarchy algorithm
      const nextPosition = getNextRootPosition(labels);

      // Match actual navigation table: label, position, is_enabled, path, is_deleted, tenant_id.
      // No "order" column in DB (schema CSV). metadata, version have defaults.
      const row: Record<string, unknown> = {
        label: newLabel.trim(),
        position: nextPosition,
        is_enabled: true,
        path: newPath.trim() || null,
        is_deleted: false,
        tenant_id,
      };

      const { error: insertError } = await supabase
        .from('navigation')
        .insert([row] as any);

      if (insertError) {
        const msg = insertError.message || 'Failed to add label';
        const code = insertError.code ? ` (${insertError.code})` : '';
        throw new Error(`${msg}${code}`);
      }

      await fetchLabels(true);
      setNewLabel('');
      setNewPath('');
      setSuccess('Label added!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('navigation-updated'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add label';
      setError(message);
      console.error('Navigation add label error:', err);
    }
  };

  // Toggle is_deleted
  const handleToggleDeleted = async (id: string, currentStatus: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('navigation')
        .update({ is_deleted: !currentStatus } as any)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchLabels(true);
      setSuccess(`Label ${!currentStatus ? 'deleted' : 'restored'}!`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('navigation-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update label');
    }
  };

  // Delete permanently
  const handleDeleteLabel = async (id: string) => {
    if (!confirm('Permanently delete this label?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('navigation')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchLabels(true);
      setSuccess('Label deleted!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('navigation-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete label');
    }
  };

  // Edit label
  const handleEditStart = (label: NavigationLabel) => {
    setEditingId(label.id);
    setEditLabel(label.label);
    setEditPath(label.path || '');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditLabel('');
    setEditPath('');
  };

  const handleEditSave = async (id: string) => {
    if (!editLabel.trim()) {
      setError('Label cannot be empty');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('navigation')
        .update({ 
          label: editLabel.trim(),
          path: editPath.trim() || null
        } as any)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchLabels(true);
      setSuccess('Label updated!');
      setTimeout(() => setSuccess(null), 3000);
      setEditingId(null);
      setEditLabel('');
      setEditPath('');
      
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('navigation-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update label');
    }
  };

  // Drag handlers - using extracted hierarchy algorithm
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDropZone(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    let position: 'before' | 'after' | 'child';
    if (y < height * 0.33) position = 'before';
    else if (y > height * 0.67) position = 'after';
    else position = 'child';

    setDropZone({ index, position });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop zone if we're leaving the entire draggable area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropZone(null);
    }
  };

  const handleDragEnd = async (e?: React.DragEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (draggedIndex === null || !dropZone) {
      setDraggedIndex(null);
      setDropZone(null);
      return;
    }

    try {
      const draggedItem = labels[draggedIndex];
      const targetItem = labels[dropZone.index];
      const draggedPosition = String(draggedItem.position);
      const targetPosition = String(targetItem.position);
      
      let newPosition: string;
      
      if (dropZone.position === 'child') {
        // Make child of target - use getNextChildPosition
        newPosition = getNextChildPosition(targetPosition, labels.filter(l => l.id !== draggedItem.id));
      } else {
        // Insert before/after target (same parent)
        const targetParentPos = getParentPosition(targetPosition);
        
        // Get all siblings (items with same parent) excluding the dragged item
        const siblings = labels.filter(l => {
          if (l.id === draggedItem.id) return false;
          const lParentPos = getParentPosition(String(l.position));
          // Compare parent positions (handles null case)
          return targetParentPos === null 
            ? lParentPos === null 
            : lParentPos === targetParentPos;
        }).sort((a, b) => comparePositions(a.position, b.position));
        
        // Find target in siblings and determine insert position
        const targetIndex = siblings.findIndex(s => s.id === targetItem.id);
        
        if (targetIndex === -1) {
          throw new Error('Target item not found in siblings');
        }
        
        const insertIndex = dropZone.position === 'before' ? targetIndex : targetIndex + 1;
        
        // Insert dragged item at the correct position
        siblings.splice(insertIndex, 0, draggedItem);
        
        // Calculate new positions for all siblings
        const updates: Promise<any>[] = [];
        
        siblings.forEach((sibling, idx) => {
          const oldPos = String(sibling.position);
          const newPos = targetParentPos === null
            ? String(idx + 1)
            : `${targetParentPos}.${idx + 1}`;
          
          const needsUpdate = oldPos !== newPos;
          
          // Update if position changed
          if (needsUpdate) {
            // Update the sibling itself
            const updatePromise = supabase
              .from('navigation')
              .update({ position: newPos } as any)
              .eq('id', sibling.id);
            
            updates.push(updatePromise);
            
            // Update all descendants of this sibling using the hierarchy algorithm
            const descendants = getDescendants(oldPos, labels);
            
            descendants.forEach(desc => {
              const updatedPos = recalculateDescendantPosition(oldPos, newPos, desc);
              const descUpdate = supabase
                .from('navigation')
                .update({ position: updatedPos } as any)
                .eq('id', desc.id);
              updates.push(descUpdate);
            });
          }
        });
        
        console.error(`🔄 Total updates queued: ${updates.length}`);
        
        if (updates.length === 0) {
          setError('No position changes detected.');
          setTimeout(() => setError(null), 3000);
          setDraggedIndex(null);
          setDropZone(null);
          return;
        }
        
        try {
          await Promise.all(updates);
        } catch (updateErr) {
          console.error('Update failed:', updateErr);
          setError('Failed to update positions. Please try again.');
          setTimeout(() => setError(null), 5000);
          setDraggedIndex(null);
          setDropZone(null);
          return;
        }
        
        // Refresh the list (same pattern as child case)
        await fetchLabels(true);
        setRefreshKey(prev => prev + 1);
        
        setSuccess('Position updated!');
        setTimeout(() => setSuccess(null), 3000);
        setDraggedIndex(null);
        setDropZone(null);
        
        // Notify sidebar to refresh
        window.dispatchEvent(new Event('navigation-updated'));
        return;
      }
      
      // For "child" case, update dragged item and its descendants
      const { error: updateError } = await supabase
        .from('navigation')
        .update({ position: newPosition } as any)
        .eq('id', draggedItem.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      
      // Update descendants using the hierarchy algorithm
      const descendants = getDescendants(draggedPosition, labels);
      
      if (descendants.length > 0) {
        const descendantUpdates = descendants.map(desc => {
          const updatedPos = recalculateDescendantPosition(
            draggedPosition,
            newPosition,
            desc
          );
          return supabase
            .from('navigation')
            .update({ position: updatedPos } as any)
            .eq('id', desc.id);
        });
        await Promise.all(descendantUpdates);
      }
      
      // Refresh the list
      await fetchLabels(true);
      setRefreshKey(prev => prev + 1);
      
      setSuccess('Position updated!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notify sidebar to refresh
      window.dispatchEvent(new Event('navigation-updated'));
    } catch (err) {
      console.error('Drag error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update position');
      await fetchLabels(true);
    } finally {
      setDraggedIndex(null);
      setDropZone(null);
    }
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        {/* Two-Tier Header */}
        <div className="mb-6 -mt-1">
          {/* Primary Row - Title with Icon */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2">
              <GripVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              Navigation Manager
            </h1>
          </div>
          {/* Secondary Row - Supporting Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
            Customize and organize workspace navigation structure
          </p>
        </div>

        {/* Subtle Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-4" />

      <div className="space-y-4">
        {/* Top Section - Form and Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Add Navigation Label
                </h2>
              </div>
            </div>

            {tenant_id == null && (
              <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Your account is not associated with a tenant. Add navigation labels only when signed in with a tenant.
                </p>
              </div>
            )}
            <form onSubmit={handleAddLabel} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <label
                  htmlFor="label"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Label Name <span className="text-gray-400">({newLabel.length}/100)</span>
                </label>
                <input
                  type="text"
                  id="label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  maxLength={100}
                  placeholder="e.g., Products, Analytics"
                  disabled={tenant_id == null}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-green-500 focus:border-transparent
                           placeholder-gray-400 dark:placeholder-gray-500 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label
                  htmlFor="path"
                  className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Route Path
                </label>
                <input
                  type="text"
                  id="path"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  maxLength={200}
                  placeholder="/products"
                  disabled={tenant_id == null}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-green-500 focus:border-transparent
                           placeholder-gray-400 dark:placeholder-gray-500 transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={tenant_id == null}
                  className="px-5 py-1.5 flex items-center justify-center gap-1.5
                           bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed
                           text-white text-sm rounded-md 
                           transition-all font-medium shadow-sm hover:shadow whitespace-nowrap h-[34px]"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Main Content - Navigation List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Navigation Structure
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {labels.length} {labels.length === 1 ? 'label' : 'labels'} • Drag to reorder or nest
                </p>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-xs text-gray-600 dark:text-gray-400">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Drag Guide:</span>
                <span>Top <span className="inline-block w-2 h-1 bg-blue-500 align-middle mx-0.5"></span> Before</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span>Middle <span className="inline-block w-2 h-2 rounded-sm bg-green-500 align-middle mx-0.5"></span> Child</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span>Bottom <span className="inline-block w-2 h-1 bg-amber-500 align-middle mx-0.5"></span> After</span>
              </div>
            </div>
          </div>

          {/* Messages - Top Right */}
          {error && (
            <div className="absolute top-3 right-4 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex flex-col gap-2 shadow-lg z-10 max-w-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
              </div>
              {(error.toLowerCase().includes('rls') || error.toLowerCase().includes('row-level security') || error.toLowerCase().includes('policy') || error.toLowerCase().includes('permission')) && (
                <p className="text-[11px] text-red-700 dark:text-red-400 pl-6">
                  Try running in Supabase SQL Editor:{' '}
                  <code className="bg-red-100 dark:bg-red-900/40 px-1 rounded">ALTER TABLE public.navigation DISABLE ROW LEVEL SECURITY;</code>
                </p>
              )}
            </div>
          )}

          {success && (
            <div className="absolute top-3 right-4 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-start gap-2 shadow-lg z-10 max-w-md">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-800 dark:text-green-300">{success}</p>
            </div>
          )}


          <div className="p-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && labels.length === 0 && (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <Plus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                  No navigation labels yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first label above
                </p>
              </div>
            )}

            {/* Labels List */}
            {!isLoading && labels.length > 0 && (
              <div 
                className="space-y-0"
                onDragOver={(e) => {
                  e.preventDefault(); // Allow dropping on the container
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  console.log('📦 Container onDrop fired');
                  e.preventDefault();
                  e.stopPropagation();
                  // Don't call handleDragEnd here - let the item's onDrop handle it
                }}
              >
                {labels.map((label, index) => {
                  // Use refreshKey in key to force React to re-render when it changes
                  const itemKey = `${label.id}-${refreshKey}`;
                  const isDeleted = label.is_deleted;
                  const isLastChild = index < labels.length - 1 ? labels[index + 1].level < label.level : true;
                  
                  return (
                    <div
                      key={`${label.id}-${refreshKey}`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDragOver(e, index);
                      }}
                      onDragLeave={handleDragLeave}
                      onDragEnd={(e) => handleDragEnd(e)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDragEnd(e);
                      }}
                      className={`flex items-center gap-2 py-1 px-2 transition-all group relative hover:bg-gray-50 dark:hover:bg-gray-700/30
                                 ${label.level === 0 ? 'mt-3 first:mt-0 font-semibold' : ''}
                                 ${draggedIndex === index ? 'opacity-40' : ''}
                                 ${dropZone?.index === index && draggedIndex !== null ? 
                                   dropZone.position === 'before' ? 'border-t-2 border-t-blue-500' :
                                   dropZone.position === 'after' ? 'border-b-2 border-b-amber-500' :
                                   'bg-green-50 dark:bg-green-900/20' : ''}
                                 cursor-move`}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      <div
                        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical 
                          className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 pointer-events-none"
                        />
                      </div>
                      
                      {/* Tree lines */}
                      {label.level > 0 && (
                        <div className="flex items-center" style={{ width: `${label.level * 20}px` }}>
                          {Array.from({ length: label.level }).map((_, i) => (
                            <div key={i} className="w-5 h-4 flex items-center">
                              {i === label.level - 1 ? (
                                <div className="flex">
                                  <div className="w-2.5 border-b border-l border-gray-300 dark:border-gray-600 rounded-bl"></div>
                                  <div className="w-2.5"></div>
                                </div>
                              ) : (
                                <div className="w-5 border-l border-gray-300 dark:border-gray-600"></div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div 
                        className="flex-1 min-w-0 flex items-center gap-2"
                      >
                        {editingId === label.id ? (
                          <>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              maxLength={100}
                              className="px-2 py-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded 
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                       focus:ring-1 focus:ring-green-500 focus:border-transparent w-48"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              draggable={false}
                            />
                            <input
                              type="text"
                              value={editPath}
                              onChange={(e) => setEditPath(e.target.value)}
                              maxLength={200}
                              placeholder="/path"
                              className="px-2 py-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded 
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                       focus:ring-1 focus:ring-green-500 focus:border-transparent w-32"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              draggable={false}
                            />
                          </>
                        ) : (
                          <>
                            <span 
                              className={`text-sm ${
                                isDeleted 
                                  ? 'text-gray-400 dark:text-gray-500 line-through' 
                                  : label.level === 0
                                  ? 'text-gray-900 dark:text-white font-semibold'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                              draggable={false}
                            >
                              {label.label}
                            </span>
                            <code 
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono"
                              draggable={false}
                            >
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                {label.position}
                              </span>
                            </code>
                            {label.path && (
                              <code 
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-mono"
                                draggable={false}
                              >
                                {label.path}
                              </code>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className={`flex items-center gap-1.5 flex-shrink-0 ${editingId === label.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {editingId === label.id ? (
                          <>
                            <button
                              onClick={() => handleEditSave(label.id)}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-all"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              label.level === 0 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                : label.level === 1
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            }`}>
                              L{label.level}
                            </span>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStart(label);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault(); // Prevent drag when clicking button
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 
                                       hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all"
                              title="Edit label"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDeleted(label.id, label.is_deleted || false);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              className={`p-1 rounded transition-all ${
                                isDeleted
                                  ? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'
                                  : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                              }`}
                              title={isDeleted ? 'Restore' : 'Soft delete'}
                            >
                              {isDeleted ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLabel(label.id);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 
                                       hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
