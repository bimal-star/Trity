'use client';

import { useEffect, useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTenant } from '@/contexts/TenantContext';
import type { IndustryType } from '@/types/product';
import type { Database } from '@/types/database';
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

/**
 * Coerce a free-form industry string (e.g. `tenants.industry` slug) to a
 * valid `IndustryType` enum value. Unknown values fall back to `other` so a
 * tenant whose industry was added to the shared `industries` table but is
 * not in the narrow product enum still gets a sane default rather than
 * being silently tagged `manufacturing`.
 */
export function coerceIndustryType(raw: string): IndustryType {
  return CATEGORY_INDUSTRY_OPTIONS.includes(raw as IndustryType)
    ? (raw as IndustryType)
    : 'other';
}

export function formatIndustryLabel(t: string): string {
  return t
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  /** Default pillar styling (products = businessCore). */
  module?: PremiumModule;
  onCreated: (payload: { id: string; name: string }) => void;
}

export default function AddCategoryModal({
  open,
  onClose,
  module = 'businessCore',
  onCreated,
}: AddCategoryModalProps) {
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { toast } = useToast();
  const bc = pillarAccent(module);
  const focus = premiumFocusRing(module);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tenantIndustry, setTenantIndustry] = useState<string | null>(null);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError(null);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !tenant_id) return;
    let cancelled = false;
    setIndustryLoading(true);
    void (async () => {
      const { data } = await supabase
        .from('tenants')
        .select('industry')
        .eq('id', tenant_id)
        .maybeSingle();
      if (!cancelled) {
        setTenantIndustry((data?.industry as string | null) ?? null);
        setIndustryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tenant_id]);

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
    if (industryLoading) {
      setError('Loading tenant industry, please wait a moment…');
      return;
    }

    setSaving(true);
    setError(null);

    const row: Database['public']['Tables']['categories']['Insert'] = {
      tenant_id,
      name: trimmed,
      description: description.trim() || null,
      industry_type: coerceIndustryType(tenantIndustry ?? ''),
      is_active: true,
      is_deleted: false,
      metadata: {},
      integration_metadata: {},
      created_by: user.id,
      updated_by: user.id,
    };

    const { data, error: insErr } = await supabase.from('categories').insert(row).select('id, name').single();

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
            <h2 id="add-category-title" className={`${premiumTypography.pageTitle} ${bc.titleText}`}>
              New category
            </h2>
            <p className={`mt-1 ${premiumTypography.helper}`}>
              Adds a catalog group for this workspace. Industry is inherited from the tenant.
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
          <div>
            <label htmlFor="add-category-desc" className={`mb-1 block ${premiumTypography.label}`}>
              Description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="add-category-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${premiumInputComfortableBase} ${focus} resize-y min-h-[4rem]`}
              placeholder="Short note for your team"
              disabled={saving}
              maxLength={2000}
            />
          </div>

          {error && (
            <p className={`${premiumTypography.helper} text-red-600 dark:text-red-400`} role="alert">
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
              disabled={saving || industryLoading}
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
