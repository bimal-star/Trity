'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Truck } from 'lucide-react';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import LogisticsRateLinesTable, {
  emptyRateLine,
  lineFromDb,
  type EditableRateLine,
} from '@/components/logistics/LogisticsRateLinesTable';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useLogisticsRateCard } from '@/hooks/useLogisticsRateCard';
import { useLogisticsRateCards } from '@/hooks/useLogisticsRateCards';
import { formInputClass as inputClass, formLabelClass as labelClass } from '@/lib/formTokens';
import {
  pillarAccent,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import type {
  LogisticsDirection,
  LogisticsRateCardFormData,
  LogisticsRateCardStatus,
} from '@/types/logistics';

const MODULE = 'analytics' as const;
const ac = pillarAccent('analytics');

const DIRECTIONS: LogisticsDirection[] = ['inbound', 'outbound', 'both'];

function emptyForm(): LogisticsRateCardFormData {
  return {
    label: '',
    provider: '',
    direction: 'both',
    effective_date_from: new Date().toISOString().slice(0, 10),
    effective_date_to: '',
    status: 'active',
    notes: '',
  };
}

export default function LogisticsRateCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rawId = params?.id;
  const rateCardId =
    typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const isCreateMode = rateCardId === 'new';

  const { rateCard, isLoading, error, updateRateCard, archiveRateCard, saveLines } =
    useLogisticsRateCard(isCreateMode ? undefined : rateCardId);
  const { createRateCard } = useLogisticsRateCards();

  const [form, setForm] = useState<LogisticsRateCardFormData>(emptyForm);
  const [lines, setLines] = useState<EditableRateLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateMode || !rateCard) return;
    setForm({
      label: rateCard.label,
      provider: rateCard.provider ?? '',
      direction: rateCard.direction as LogisticsDirection,
      effective_date_from: rateCard.effective_date_from,
      effective_date_to: rateCard.effective_date_to ?? '',
      status: rateCard.status as LogisticsRateCardStatus,
      notes: rateCard.notes ?? '',
    });
    setLines((rateCard.logistics_rate_lines ?? []).map(lineFromDb));
  }, [isCreateMode, rateCard]);

  const readOnly = !isCreateMode && rateCard?.status === 'archived';

  const handleSave = useCallback(async () => {
    if (!form.label.trim()) {
      setPageError('Label is required.');
      return;
    }
    setSaving(true);
    setPageError(null);

    if (isCreateMode) {
      const created = await createRateCard(form);
      if (!created.success || !created.id) {
        setSaving(false);
        setPageError(created.error ?? 'Failed to create rate card');
        return;
      }
      if (lines.length > 0) {
        const lineResult = await saveLines(created.id, lines);
        if (!lineResult.success) {
          setSaving(false);
          toast.error(lineResult.error ?? 'Rate card created but lines failed to save');
          router.replace(`/logistics/${created.id}`);
          return;
        }
      }
      toast.success('Rate card created');
      router.replace(`/logistics/${created.id}`);
      setSaving(false);
      return;
    }

    if (!rateCardId) return;
    const upd = await updateRateCard(rateCardId, form);
    if (!upd.success) {
      setSaving(false);
      setPageError(upd.error ?? 'Failed to save');
      return;
    }
    const lineResult = await saveLines(rateCardId, lines);
    setSaving(false);
    if (lineResult.success) toast.success('Rate card saved');
    else toast.error(lineResult.error ?? 'Header saved but lines failed');
  }, [
    form,
    isCreateMode,
    createRateCard,
    lines,
    rateCardId,
    router,
    saveLines,
    toast,
    updateRateCard,
  ]);

  const handleArchive = async () => {
    if (!rateCardId || isCreateMode) return;
    if (!window.confirm('Archive this rate card?')) return;
    const result = await archiveRateCard(rateCardId);
    if (result.success) {
      toast.success('Rate card archived');
      router.push('/logistics');
    } else toast.error(result.error ?? 'Archive failed');
  };

  return (
    <ProtectedRoute>
      <PageContainer
        module="analytics"
        backLink={{ href: '/logistics', label: 'Back to logistics' }}
      >
        <PremiumStickyHeader
          module="analytics"
          icon={Truck}
          title={isCreateMode ? 'New rate card' : form.label || 'Rate card'}
          subtitle={
            isLoading && !isCreateMode
              ? 'Loading…'
              : readOnly
                ? 'Archived — read only'
                : 'Freight and distribution rate lines'
          }
          subtitleClassName={`${premiumTypography.pageSubtitle} ${ac.subtitleTint}`}
        />

        {(error || pageError) && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {pageError || error}
          </p>
        )}

        {isLoading && !isCreateMode ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Label</label>
                <input
                  className={inputClass}
                  value={form.label}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Provider</label>
                <input
                  className={inputClass}
                  value={form.provider}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Direction</label>
                <select
                  className={inputClass}
                  value={form.direction}
                  disabled={readOnly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, direction: e.target.value as LogisticsDirection }))
                  }
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  disabled={readOnly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as LogisticsRateCardStatus }))
                  }
                >
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Effective from</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.effective_date_from}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, effective_date_from: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Effective to</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.effective_date_to}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, effective_date_to: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Notes</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.notes}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={premiumTypography.sectionTitle}>Rate lines</p>
                {!readOnly && (
                  <button
                    type="button"
                    className={premiumSecondaryButton(MODULE, 'sm')}
                    onClick={() => setLines((prev) => [...prev, emptyRateLine()])}
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    Add Rate Line
                  </button>
                )}
              </div>
              <LogisticsRateLinesTable lines={lines} onChange={setLines} readOnly={readOnly} />
            </section>

            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={premiumPrimaryButton(MODULE, 'md')}
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
                {!isCreateMode && (
                  <button
                    type="button"
                    className={premiumSecondaryButton(MODULE, 'md')}
                    onClick={() => void handleArchive()}
                  >
                    Archive
                  </button>
                )}
                <Link href="/logistics" className={premiumSecondaryButton(MODULE, 'md')}>
                  Cancel
                </Link>
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </ProtectedRoute>
  );
}
