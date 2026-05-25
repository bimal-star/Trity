'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';
import { premiumPrimaryButton, premiumSecondaryButton } from '@/lib/premiumUi';
import CostCardModalShell from '@/components/costCard/CostCardModalShell';

const MODULE = 'businessCore' as const;

interface CloneCostCardVersionModalProps {
  open: boolean;
  sourceVersionNumber: number | null;
  onClose: () => void;
  onSave: (
    label: string,
    effectiveDate: string
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
}

export default function CloneCostCardVersionModal({
  open,
  sourceVersionNumber,
  onClose,
  onSave,
}: CloneCostCardVersionModalProps) {
  const [label, setLabel] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(sourceVersionNumber != null ? `Copy of v${sourceVersionNumber}` : '');
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setError(null);
    }
  }, [open, sourceVersionNumber]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError('Label is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(label.trim(), effectiveDate);
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error ?? 'Failed to clone version');
  };

  return (
    <CostCardModalShell title="Clone version" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}
        <div>
          <label className={labelClass}>New label</label>
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Effective date</label>
          <input
            type="date"
            className={inputClass}
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            required
          />
        </div>
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
