'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Loader2, Lock, Pencil, PlayCircle, Plus, X } from 'lucide-react';
import CostCardPanelHeader from '@/components/costCard/CostCardPanelHeader';
import PremiumCard from '@/components/layout/premium/PremiumCard';
import { EntityStatusBadge } from '@/components/common/EntityStatusBadge';
import {
  pillarAccent,
  premiumFocusRing,
  premiumInputCompact,
  premiumPrimaryButton,
  premiumTypography,
} from '@/lib/premiumUi';
import type { CostCardVersion, CostCardVersionFormData } from '@/types/costCard';
import { COST_CARD_VERSION_STATUS_MAP } from '@/types/costCard';

const MODULE = 'businessCore' as const;
const bc = pillarAccent(MODULE);

const thClass = `px-1.5 py-0.5 text-left align-middle ${premiumTypography.tableHeaderDense}`;
const tdClass = 'px-1.5 py-0.5 align-middle';
const inlineInputClass = `${premiumInputCompact} ${premiumFocusRing(MODULE)} ${premiumTypography.tableCell}`;
const editRowClass = 'bg-green-50/60 dark:bg-green-950/30';
const theadClass =
  'sticky top-0 z-[1] border-b border-green-200/60 bg-green-50/90 dark:border-green-900/50 dark:bg-green-950/40';

function emptyVersionDraft(): CostCardVersionFormData {
  return {
    label: '',
    effective_date: new Date().toISOString().slice(0, 10),
    notes: '',
  };
}

function versionToFormData(row: CostCardVersion): CostCardVersionFormData {
  return {
    label: row.label ?? '',
    effective_date: row.effective_date,
    notes: row.notes ?? '',
  };
}

function formatDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function selectedRowClass(isSelected: boolean): string {
  if (!isSelected) return 'hover:bg-green-50/40 dark:hover:bg-green-950/20';
  return `${bc.pillSelected} ring-1 ring-inset ring-green-500/30`;
}

interface VersionRowListProps {
  versions: CostCardVersion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (
    data: CostCardVersionFormData
  ) => Promise<{ success: boolean; id?: string; error?: string }>;
  onUpdate: (
    id: string,
    data: CostCardVersionFormData
  ) => Promise<{ success: boolean; error?: string }>;
  onClone: (versionId: string) => void;
  onActivate: (versionId: string) => void;
  onLock: (versionId: string) => void;
  actionsDisabled?: boolean;
}

function VersionFormCells({
  draft,
  onChange,
  disabled,
}: {
  draft: CostCardVersionFormData;
  onChange: (next: CostCardVersionFormData) => void;
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
        <input
          type="date"
          className={inlineInputClass}
          value={draft.effective_date}
          disabled={disabled}
          required
          onChange={(e) => onChange({ ...draft, effective_date: e.target.value })}
        />
      </td>
      <td className={tdClass}>
        <EntityStatusBadge status="draft" statusMap={COST_CARD_VERSION_STATUS_MAP} />
      </td>
    </>
  );
}

function iconActionClass(disabled?: boolean): string {
  return `rounded p-0.5 text-gray-500 hover:text-green-700 dark:hover:text-green-400 disabled:opacity-30 ${disabled ? 'pointer-events-none' : ''}`;
}

export default function VersionRowList({
  versions,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onClone,
  onActivate,
  onLock,
  actionsDisabled = false,
}: VersionRowListProps) {
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<CostCardVersionFormData>(emptyVersionDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CostCardVersionFormData>(emptyVersionDraft);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const cancelAll = useCallback(() => {
    setCreating(false);
    setEditingId(null);
    setRowError(null);
    setCreateDraft(emptyVersionDraft());
  }, []);

  const startCreate = () => {
    cancelAll();
    setCreating(true);
    setCreateDraft(emptyVersionDraft());
  };

  const startEdit = (row: CostCardVersion) => {
    if (row.locked || row.status === 'archived') return;
    setCreating(false);
    setEditingId(row.id);
    setEditDraft(versionToFormData(row));
    setRowError(null);
  };

  const handleCreateSave = async () => {
    setSaving(true);
    setRowError(null);
    const result = await onCreate(createDraft);
    setSaving(false);
    if (result.success) {
      if (result.id) onSelect(result.id);
      cancelAll();
    } else {
      setRowError(result.error ?? 'Failed to create version');
    }
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setSaving(true);
    setRowError(null);
    const result = await onUpdate(editingId, editDraft);
    setSaving(false);
    if (result.success) {
      setEditingId(null);
      setRowError(null);
    } else {
      setRowError(result.error ?? 'Failed to update version');
    }
  };

  const formBusy = creating || editingId !== null;
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayVersions = useMemo(
    () =>
      [...versions].sort((a, b) => {
        const rank = (status: string) => (status === 'archived' ? 2 : status === 'active' ? 0 : 1);
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return b.version_number - a.version_number;
      }),
    [versions]
  );

  useEffect(() => {
    if (!selectedId || !scrollRef.current) return;
    scrollRef.current
      .querySelector(`[data-row-id="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId, displayVersions.length, creating, editingId]);

  return (
    <PremiumCard className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden !rounded-xl !p-0 ring-1 ring-green-200/50 dark:ring-green-900/40 lg:w-[38rem] xl:w-[42rem]">
      {rowError && (
        <p className="shrink-0 border-b border-red-200/60 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          {rowError}
        </p>
      )}

      <CostCardPanelHeader
        title="Versions"
        count={displayVersions.length}
        action={
          <button
            type="button"
            className={`${premiumPrimaryButton(MODULE, 'sm', 'auto')} !h-6 !min-w-0 !px-1.5`}
            disabled={actionsDisabled || formBusy}
            title="New version"
            aria-label="New version"
            onClick={startCreate}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </button>
        }
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
        <table
          className={`w-full min-w-[34rem] table-fixed border-collapse ${premiumTypography.tableCell}`}
        >
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[32%]" />
            <col className="w-[24%]" />
            <col className="w-[15%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Ver</th>
              <th className={thClass}>Label</th>
              <th className={thClass}>Effective</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {displayVersions.length === 0 && !creating && (
              <tr>
                <td colSpan={5} className={`${tdClass} py-2 ${premiumTypography.helper}`}>
                  No versions yet.
                </td>
              </tr>
            )}
            {displayVersions.map((row) => {
              const isSelected = row.id === selectedId;
              const isEditing = editingId === row.id;
              const rowReadOnly = row.locked || row.status === 'archived';

              if (isEditing) {
                return (
                  <tr key={row.id} className={editRowClass} data-row-id={row.id}>
                    <td className={`${tdClass} font-semibold`}>v{row.version_number}</td>
                    <VersionFormCells draft={editDraft} onChange={setEditDraft} disabled={saving} />
                    <td className={tdClass}>
                      <div className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          aria-label="Save"
                          disabled={saving}
                          className={`rounded p-0.5 ${bc.titleText} hover:bg-green-100/80 dark:hover:bg-green-900/30`}
                          onClick={() => void handleEditSave()}
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
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
                  <td className={`${tdClass} font-semibold`}>
                    <span className="inline-flex items-center gap-0.5">
                      v{row.version_number}
                      {row.locked && <Lock className="h-3 w-3 text-gray-500" aria-label="Locked" />}
                    </span>
                  </td>
                  <td className={`${tdClass} text-gray-900 dark:text-white`}>
                    {row.label || <span className="text-gray-400">—</span>}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap ${premiumTypography.helper}`}>
                    {formatDateShort(row.effective_date)}
                  </td>
                  <td className={tdClass}>
                    <EntityStatusBadge
                      status={row.status}
                      statusMap={COST_CARD_VERSION_STATUS_MAP}
                    />
                  </td>
                  <td className={tdClass}>
                    <div
                      className="flex justify-end gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {!rowReadOnly && !actionsDisabled && (
                        <>
                          <button
                            type="button"
                            aria-label="Edit version"
                            disabled={formBusy}
                            className={iconActionClass(formBusy)}
                            onClick={() => startEdit(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Clone version"
                            disabled={formBusy}
                            className={iconActionClass(formBusy)}
                            onClick={() => onClone(row.id)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {row.status !== 'active' && (
                            <button
                              type="button"
                              aria-label="Activate version"
                              disabled={formBusy}
                              className={iconActionClass(formBusy)}
                              onClick={() => onActivate(row.id)}
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!row.locked && (
                            <button
                              type="button"
                              aria-label="Lock version"
                              disabled={formBusy}
                              className={iconActionClass(formBusy)}
                              onClick={() => onLock(row.id)}
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {creating && (
              <tr className={editRowClass}>
                <td className={`${tdClass} text-gray-400`}>—</td>
                <VersionFormCells draft={createDraft} onChange={setCreateDraft} disabled={saving} />
                <td className={tdClass}>
                  <div className="flex justify-end gap-0.5">
                    <button
                      type="button"
                      aria-label="Create"
                      disabled={saving}
                      className={`rounded p-0.5 ${bc.titleText} hover:bg-green-100/80 dark:hover:bg-green-900/30`}
                      onClick={() => void handleCreateSave()}
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
                      onClick={cancelAll}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PremiumCard>
  );
}
