'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Check, Copy, Loader2, Pencil, Plus, X } from 'lucide-react';
import CostCardPanelHeader from '@/components/costCard/CostCardPanelHeader';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import { formatDateRange } from '@/lib/costCardCalculations';
import {
  pillarAccent,
  premiumFocusRing,
  premiumInputCompact,
  premiumPrimaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import type {
  CostCardCostSet,
  CostCardCostSetFormData,
  CostCardCostSetType,
} from '@/types/costCard';
import { COST_CARD_COST_SET_STATUS_MAP, COST_CARD_COST_SET_TYPE_LABELS } from '@/types/costCard';

const MODULE = 'businessCore' as const;
const bc = pillarAccent(MODULE);

const thClass = `px-1.5 py-0.5 text-left align-middle ${premiumTypography.tableHeaderDense}`;
const tdClass = 'px-1.5 py-0.5 align-middle';
const inlineInputClass = `${premiumInputCompact} ${premiumFocusRing(MODULE)} ${premiumTypography.tableCell}`;
const editRowClass = 'bg-green-50/60 dark:bg-green-950/30';
const theadClass =
  'sticky top-0 z-[1] border-b border-green-200/60 bg-green-50/90 dark:border-green-900/50 dark:bg-green-950/40';

const COST_SET_TYPES: { value: CostCardCostSetType; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'annual_budget', label: 'Budget' },
  { value: 'half_year', label: 'Half year' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

function emptyCostSetDraft(): CostCardCostSetFormData {
  return {
    label: '',
    cost_set_type: 'custom',
    effective_date_from: new Date().toISOString().slice(0, 10),
    effective_date_to: '',
    status: 'active',
  };
}

function costSetToFormData(row: CostCardCostSet): CostCardCostSetFormData {
  return {
    label: row.label,
    cost_set_type: row.cost_set_type as CostCardCostSetType,
    effective_date_from: row.effective_date_from,
    effective_date_to: row.effective_date_to ?? '',
    status: row.status as CostCardCostSetFormData['status'],
  };
}

function selectedRowClass(isSelected: boolean): string {
  if (!isSelected) return 'hover:bg-green-50/40 dark:hover:bg-green-950/20';
  return `${bc.pillSelected} ring-1 ring-inset ring-green-500/30`;
}

interface CostSetRowListProps {
  costSets: CostCardCostSet[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (
    data: CostCardCostSetFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  onUpdate: (
    id: string,
    data: CostCardCostSetFormData
  ) => Promise<{ success: boolean; error?: string }>;
  onArchive: (id: string) => Promise<{ success: boolean; error?: string }>;
  onClone: (id: string) => void;
}

function CostSetFormCells({
  draft,
  onChange,
  disabled,
}: {
  draft: CostCardCostSetFormData;
  onChange: (next: CostCardCostSetFormData) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <td className={tdClass}>
        <input
          className={inlineInputClass}
          value={draft.label}
          disabled={disabled}
          placeholder="Label"
          onChange={(e) => onChange({ ...draft, label: e.target.value })}
        />
      </td>
      <td className={tdClass}>
        <select
          className={inlineInputClass}
          value={draft.cost_set_type}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...draft, cost_set_type: e.target.value as CostCardCostSetType })
          }
        >
          {COST_SET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </td>
      <td className={tdClass}>
        <div className="flex flex-col gap-0.5">
          <input
            type="date"
            className={inlineInputClass}
            value={draft.effective_date_from}
            disabled={disabled}
            onChange={(e) => onChange({ ...draft, effective_date_from: e.target.value })}
          />
          <input
            type="date"
            className={inlineInputClass}
            value={draft.effective_date_to}
            disabled={disabled}
            title="To (optional)"
            onChange={(e) => onChange({ ...draft, effective_date_to: e.target.value })}
          />
        </div>
      </td>
    </>
  );
}

function RowActions({
  saving,
  onSave,
  onCancel,
  saveLabel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <div className="flex justify-end gap-0.5">
      <button
        type="button"
        aria-label={saveLabel}
        disabled={saving}
        className={`rounded p-0.5 ${bc.titleText} hover:bg-green-100/80 dark:hover:bg-green-900/30`}
        onClick={onSave}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        aria-label="Cancel"
        disabled={saving}
        className="rounded p-0.5 text-gray-400 hover:text-gray-600"
        onClick={onCancel}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function iconActionClass(disabled?: boolean): string {
  return `rounded p-0.5 text-gray-500 hover:text-green-700 dark:hover:text-green-400 disabled:opacity-30 ${disabled ? 'pointer-events-none' : ''}`;
}

export default function CostSetRowList({
  costSets,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onArchive,
  onClone,
}: CostSetRowListProps) {
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<CostCardCostSetFormData>(emptyCostSetDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CostCardCostSetFormData>(emptyCostSetDraft);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const cancelAll = useCallback(() => {
    setCreating(false);
    setEditingId(null);
    setRowError(null);
    setCreateDraft(emptyCostSetDraft());
  }, []);

  const startCreate = () => {
    cancelAll();
    setCreating(true);
    setCreateDraft(emptyCostSetDraft());
  };

  const startEdit = (row: CostCardCostSet) => {
    setCreating(false);
    setEditingId(row.id);
    setEditDraft(costSetToFormData(row));
    setRowError(null);
  };

  const handleCreateSave = async () => {
    if (!createDraft.label.trim()) {
      setRowError('Label is required.');
      return;
    }
    setSaving(true);
    setRowError(null);
    const result = await onCreate(createDraft);
    setSaving(false);
    if (result.success) {
      if (result.id) onSelect(result.id);
      cancelAll();
    } else {
      setRowError(result.error ?? 'Failed to create cost set');
    }
  };

  const handleEditSave = async () => {
    if (!editingId || !editDraft.label.trim()) {
      setRowError('Label is required.');
      return;
    }
    setSaving(true);
    setRowError(null);
    const result = await onUpdate(editingId, editDraft);
    setSaving(false);
    if (result.success) {
      setEditingId(null);
      setRowError(null);
    } else {
      setRowError(result.error ?? 'Failed to update cost set');
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Archive this cost set?')) return;
    setRowError(null);
    const result = await onArchive(id);
    if (!result.success) setRowError(result.error ?? 'Failed to archive cost set');
    if (editingId === id) setEditingId(null);
  };

  const formBusy = creating || editingId !== null;
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayCostSets = useMemo(
    () =>
      [...costSets].sort((a, b) => {
        const aArchived = a.status === 'archived' ? 1 : 0;
        const bArchived = b.status === 'archived' ? 1 : 0;
        return aArchived - bArchived;
      }),
    [costSets]
  );

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    scrollRef.current
      .querySelector(`[data-row-id="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, displayCostSets.length, creating, editingId]);

  return (
    <PremiumCard className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden !rounded-xl !p-0 ring-1 ring-green-200/50 dark:ring-green-900/40 lg:w-[40rem] xl:w-[44rem]">
      {rowError && (
        <p className="shrink-0 border-b border-red-200/60 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {rowError}
        </p>
      )}

      <CostCardPanelHeader
        title="Cost Sets"
        count={displayCostSets.length}
        action={
          <button
            type="button"
            className={`${premiumPrimaryButton(MODULE, 'sm', 'auto')} !h-6 !min-w-0 !px-1.5`}
            disabled={formBusy}
            title="New cost set"
            aria-label="New cost set"
            onClick={startCreate}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        }
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
        <table
          className={`w-full min-w-[36rem] table-fixed border-collapse ${premiumTypography.tableCell}`}
        >
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Label</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Effective</th>
              <th className={`${thClass} text-right`}> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {displayCostSets.length === 0 && !creating && (
              <tr>
                <td colSpan={4} className={`${tdClass} py-2 ${premiumTypography.helper}`}>
                  No cost sets yet.
                </td>
              </tr>
            )}
            {displayCostSets.map((row) => {
              const isSelected = row.id === selectedId;
              const isEditing = editingId === row.id;
              const typeLabel =
                COST_CARD_COST_SET_TYPE_LABELS[row.cost_set_type as CostCardCostSetType] ??
                row.cost_set_type;

              if (isEditing) {
                return (
                  <tr key={row.id} className={editRowClass} data-row-id={row.id}>
                    <CostSetFormCells draft={editDraft} onChange={setEditDraft} disabled={saving} />
                    <td className={tdClass}>
                      <RowActions
                        saving={saving}
                        saveLabel="Save cost set"
                        onSave={() => void handleEditSave()}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={row.id}
                  data-row-id={row.id}
                  onClick={() => onSelect(row.id)}
                  className={`cursor-pointer transition-colors ${selectedRowClass(isSelected)}`}
                >
                  <td className={`${tdClass} font-medium text-gray-900 dark:text-white`}>
                    <span className="inline-flex max-w-full flex-wrap items-center gap-1">
                      <span>{row.label}</span>
                      <EntityStatusBadge
                        status={row.status}
                        statusMap={COST_CARD_COST_SET_STATUS_MAP}
                      />
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span
                      className={`rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide ${bc.pillSelected}`}
                    >
                      {typeLabel}
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap ${premiumTypography.helper}`}>
                    {formatDateRange(row.effective_date_from, row.effective_date_to)}
                  </td>
                  <td className={tdClass}>
                    <div
                      className="flex justify-end gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {row.status === 'active' && (
                        <>
                          <button
                            type="button"
                            aria-label="Edit cost set"
                            disabled={formBusy}
                            className={iconActionClass(formBusy)}
                            onClick={() => startEdit(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Clone cost set"
                            disabled={formBusy}
                            className={iconActionClass(formBusy)}
                            onClick={() => onClone(row.id)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Archive cost set"
                            disabled={formBusy}
                            className="rounded p-0.5 text-gray-500 hover:text-amber-600 disabled:opacity-40"
                            onClick={() => void handleArchive(row.id)}
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {row.status === 'archived' && (
                        <button
                          type="button"
                          aria-label="Clone cost set"
                          disabled={formBusy}
                          className={iconActionClass(formBusy)}
                          onClick={() => onClone(row.id)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {creating && (
              <tr className={editRowClass}>
                <CostSetFormCells draft={createDraft} onChange={setCreateDraft} disabled={saving} />
                <td className={tdClass}>
                  <RowActions
                    saving={saving}
                    saveLabel="Create cost set"
                    onSave={() => void handleCreateSave()}
                    onCancel={cancelAll}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PremiumCard>
  );
}
