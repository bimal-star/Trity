'use client';

import { useEffect, useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import type { IndustryType } from '@/types/product';
import type { PremiumModule } from '@/lib/premiumUi';
import {
  pillarAccent,
  premiumFocusRing,
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';

export const CATEGORY_INDUSTRY_OPTIONS: IndustryType[] = [
  'bakery',
  'ready_meals',
  'pizza',
  'construction',
  'manufacturing',
  'retail',
  'other',
];

export function coerceIndustryType(raw: string): IndustryType {
  return CATEGORY_INDUSTRY_OPTIONS.includes(raw as IndustryType) ? (raw as IndustryType) : 'other';
}

export function formatIndustryLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  /** Which tier to create the node in. Defaults to 1 (top-level category). */
  tierNumber?: number;
  /** Default pillar styling (products = businessCore). */
  module?: PremiumModule;
  onCreated: (payload: { id: string; name: string }) => void;
}

export default function AddCategoryModal({
  open,
  onClose,
  tierNumber = 1,
  module = 'businessCore',
  onCreated,
}: AddCategoryModalProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { toast } = useToast();
  const bc = pillarAccent(module);
  const focus = premiumFocusRing(module);

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a category name.');
      return;
    }
    if (!tenant_id || !user?.id) {
      setError('Sign in and ensure a workspace is selected.');
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error: insErr } = await supabase
      .from('category_nodes')
      .insert({
        tenant_id,
        tier_number: tierNumber,
        name: trimmed,
        sort_order: 0,
        is_active: true,
      })
      .select('id, name')
      .single();

    setSaving(false);
    if (insErr) {
      toast.error(insErr.message || 'Could not create category.');
      return;
    }
    if (!data?.id) {
      toast.error('No row returned from server.');
      return;
    }
    toast.success('Category created.');
    onCreated({ id: data.id, name: data.name });
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-category-title"
        className={`${premiumSurfaces.cardElevated} max-w-md w-full`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`shrink-0 ${bc.iconTile}`}>
            <Tag className={`h-5 w-5 ${bc.iconColor}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="add-category-title"
              className={`${premiumTypography.pageTitle} ${bc.titleText}`}
            >
              New category
            </h2>
            <p className={`mt-1 ${premiumTypography.helper}`}>
              Adds a node to tier {tierNumber} of this workspace&apos;s category structure.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <div>
            <label htmlFor="add-category-name" className={`mb-1 block ${premiumTypography.label}`}>
              Name
            </label>
            <input
              id="add-category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${premiumInputComfortableBase} ${focus}`}
              placeholder="e.g. Beverages"
              autoComplete="off"
              disabled={saving}
              maxLength={200}
            />
          </div>

          {error && (
            <p
              className={`${premiumTypography.helper} text-red-600 dark:text-red-400`}
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              className={premiumSecondaryButton(module, 'sm', 'auto')}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={premiumPrimaryButton(module, 'sm', 'standard')}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                'Create category'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
