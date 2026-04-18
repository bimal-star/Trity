'use client';

import { useEffect, useState } from 'react';
import type { PriceList } from '@/types/product';
import type { PriceListUpsertInput } from '@/hooks/usePriceLists';
import {
  pillarAccent,
  premiumFocusRing,
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
  type PremiumModule,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';

function dateInputValue(d: string | null | undefined): string {
  if (!d) return '';
  return d.slice(0, 10);
}

const ROUNDING_PRESETS = [
  { value: '', label: 'Not set' },
  { value: 'half_up', label: 'Half up' },
  { value: 'half_even', label: 'Half even (banker)' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'floor', label: 'Floor' },
  { value: 'truncate', label: 'Truncate' },
] as const;

export interface PriceListEditorModalProps {
  open: boolean;
  onClose: () => void;
  module?: PremiumModule | null;
  initial: PriceList | null;
  onSubmit: (input: PriceListUpsertInput) => Promise<{ success: boolean; error?: string }>;
}

export default function PriceListEditorModal({
  open,
  onClose,
  module = 'businessCore',
  initial,
  onSubmit,
}: PriceListEditorModalProps) {
  const a = pillarAccent(module);
  const focus = premiumFocusRing(module);
  const inputClass = `${premiumInputComfortableBase} ${focus}`;
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [roundingPreset, setRoundingPreset] = useState('');
  const [roundingCustom, setRoundingCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    if (initial) {
      setName(initial.name);
      setDescription(initial.description ?? '');
      setCurrency((initial.currency || 'GBP').trim());
      setEffectiveFrom(dateInputValue(initial.effective_from));
      setEffectiveTo(dateInputValue(initial.effective_to));
      setIsActive(initial.is_active !== false);
      setIsDefault(!!initial.is_default);
      setTaxInclusive(!!initial.tax_inclusive);
      const rm = initial.rounding_mode?.trim() ?? '';
      const preset = ROUNDING_PRESETS.find((p) => p.value === rm);
      if (preset && rm) {
        setRoundingPreset(rm);
        setRoundingCustom('');
      } else if (rm) {
        setRoundingPreset('__custom__');
        setRoundingCustom(rm);
      } else {
        setRoundingPreset('');
        setRoundingCustom('');
      }
    } else {
      setName('');
      setDescription('');
      setCurrency('GBP');
      setEffectiveFrom('');
      setEffectiveTo('');
      setIsActive(true);
      setIsDefault(false);
      setTaxInclusive(false);
      setRoundingPreset('');
      setRoundingCustom('');
    }
  }, [open, initial]);

  if (!open) return null;

  const roundingMode =
    roundingPreset === '__custom__'
      ? roundingCustom.trim() || null
      : roundingPreset || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) {
      setMsg('Name is required.');
      return;
    }
    setBusy(true);
    const input: PriceListUpsertInput = {
      name: name.trim(),
      description: description.trim() || null,
      currency: currency.trim() || 'GBP',
      effective_from: effectiveFrom || null,
      effective_to: effectiveTo || null,
      is_active: isActive,
      is_default: isDefault,
      tax_inclusive: taxInclusive,
      rounding_mode: roundingMode,
    };
    const r = await onSubmit(input);
    setBusy(false);
    if (r.success) {
      toast.success(initial ? 'Price tier saved.' : 'Price tier created.');
      onClose();
    } else {
      toast.error(r.error ?? 'Save failed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-list-editor-title"
        className={`${premiumSurfaces.cardElevated} max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="price-list-editor-title" className={`${premiumTypography.pageTitle} ${a.titleText}`}>
          {initial ? 'Edit price tier' : 'New price tier'}
        </h2>
        <p className={`mt-1 ${premiumTypography.helper}`}>
          This defines the tier header (currency, validity, default tier). Set each product&apos;s price on that
          tier from the product&apos;s Pricing tab.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <div>
            <label className={`block ${premiumTypography.label}`}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-1 ${inputClass}`}
              required
              autoFocus
            />
          </div>
          <div>
            <label className={`block ${premiumTypography.label}`}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block ${premiumTypography.label}`}>Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={8}
                className={`mt-1 ${inputClass}`}
                placeholder="GBP"
              />
            </div>
            <div>
              <label className={`block ${premiumTypography.label}`}>Rounding</label>
              <select
                value={roundingPreset}
                onChange={(e) => setRoundingPreset(e.target.value)}
                className={`mt-1 ${inputClass}`}
              >
                {ROUNDING_PRESETS.map((p) => (
                  <option key={p.value || 'empty'} value={p.value}>
                    {p.label}
                  </option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
            </div>
          </div>
          {roundingPreset === '__custom__' && (
            <div>
              <label className={`block ${premiumTypography.label}`}>Custom rounding key</label>
              <input
                value={roundingCustom}
                onChange={(e) => setRoundingCustom(e.target.value)}
                className={`mt-1 ${inputClass}`}
                placeholder="e.g. half_up_2dp"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block ${premiumTypography.label}`}>Effective from</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label className={`block ${premiumTypography.label}`}>Effective to</label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className={premiumTypography.body}>Active</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className={premiumTypography.body}>Default list for new assignments</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={taxInclusive}
                onChange={(e) => setTaxInclusive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className={premiumTypography.body}>Tax-inclusive display</span>
            </label>
          </div>

          {msg && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {msg}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={premiumSecondaryButton(module, 'md', 'auto')}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={premiumPrimaryButton(module, 'md', 'standard')}
            >
              {busy ? 'Saving…' : initial ? 'Save changes' : 'Create list'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
