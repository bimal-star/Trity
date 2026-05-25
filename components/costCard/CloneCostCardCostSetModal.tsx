'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';
import { premiumPrimaryButton, premiumSecondaryButton } from '@/lib/premiumUi';
import CostCardModalShell from '@/components/costCard/CostCardModalShell';

const MODULE = 'businessCore' as const;

export interface CloneCostCardCostSetFormResult {
  label: string;
  effectiveDateFrom: string;
  effectiveDateTo: string;
  includeArchivedVersions: boolean;
}

interface CloneCostCardCostSetModalProps {
  open: boolean;
  sourceLabel: string | null;
  sourceEffectiveFrom: string | null;
  sourceEffectiveTo: string | null;
  onClose: () => void;
  onSave: (data: CloneCostCardCostSetFormResult) => Promise<{ success: boolean; error?: string }>;
}

export default function CloneCostCardCostSetModal({
  open,
  sourceLabel,
  sourceEffectiveFrom,
  sourceEffectiveTo,
  onClose,
  onSave,
}: CloneCostCardCostSetModalProps) {
  const [label, setLabel] = useState('');
  const [effectiveDateFrom, setEffectiveDateFrom] = useState('');
  const [effectiveDateTo, setEffectiveDateTo] = useState('');
  const [includeArchivedVersions, setIncludeArchivedVersions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(sourceLabel ? `Copy of ${sourceLabel}` : '');
      setEffectiveDateFrom(sourceEffectiveFrom ?? new Date().toISOString().slice(0, 10));
      setEffectiveDateTo(sourceEffectiveTo ?? '');
      setIncludeArchivedVersions(true);
      setError(null);
    }
  }, [open, sourceLabel, sourceEffectiveFrom, sourceEffectiveTo]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required.');
      return;
    }
    if (!effectiveDateFrom) {
      setError('Effective from date is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave({
      label: label.trim(),
      effectiveDateFrom,
      effectiveDateTo,
      includeArchivedVersions,
    });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error ?? 'Failed to clone cost set');
  };

  return (
    <CostCardModalShell title="Clone cost set" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {sourceLabel && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Copies all versions, product rows, and cost lines from{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{sourceLabel}</span>.
            Version labels are copied; you can rename them after cloning.
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}
        <div>
          <label className={labelClass}>New cost set label</label>
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Effective from</label>
            <input
              type="date"
              className={inputClass}
              value={effectiveDateFrom}
              onChange={(e) => setEffectiveDateFrom(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Effective to (optional)</label>
            <input
              type="date"
              className={inputClass}
              value={effectiveDateTo}
              onChange={(e) => setEffectiveDateTo(e.target.value)}
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            checked={includeArchivedVersions}
            onChange={(e) => setIncludeArchivedVersions(e.target.checked)}
          />
          Include archived versions
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={premiumSecondaryButton(MODULE, 'sm')} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={premiumPrimaryButton(MODULE, 'sm')} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Clone'}
          </button>
        </div>
      </form>
    </CostCardModalShell>
  );
}
