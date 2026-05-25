'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AddCostCardProductModal from '@/components/costCard/AddCostCardProductModal';
import CloneCostCardCostSetModal from '@/components/costCard/CloneCostCardCostSetModal';
import CloneCostCardVersionModal from '@/components/costCard/CloneCostCardVersionModal';
import CostCardProductEntriesTable from '@/components/costCard/CostCardProductEntriesTable';
import CostSetRowList from '@/components/costCard/CostSetRowList';
import VersionRowList from '@/components/costCard/VersionRowList';
import { useCostCardCostSets } from '@/hooks/useCostCardCostSets';
import { useCostCardProductEntries } from '@/hooks/useCostCardProductEntries';
import { useCostCardVersions } from '@/hooks/useCostCardVersions';
import { computeEntryMetrics } from '@/lib/costCardCalculations';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';

const bc = pillarAccent('businessCore');

export default function CostCardWorkspace() {
  const { toast } = useToast();
  const {
    costSets,
    isLoading: costSetsLoading,
    error: costSetsError,
    createCostSet,
    updateCostSet,
    archiveCostSet,
    cloneCostSet,
  } = useCostCardCostSets();

  const [selectedCostSetId, setSelectedCostSetId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(new Set());
  const [cloneVersionModalOpen, setCloneVersionModalOpen] = useState(false);
  const [cloneCostSetModalOpen, setCloneCostSetModalOpen] = useState(false);
  const [cloneCostSetSourceId, setCloneCostSetSourceId] = useState<string | null>(null);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);

  const {
    versions,
    isLoading: versionsLoading,
    error: versionsError,
    createVersion,
    updateVersion,
    activateVersion,
    lockVersion,
    cloneVersion,
  } = useCostCardVersions(selectedCostSetId);

  const {
    entries,
    isLoading: entriesLoading,
    error: entriesError,
    createEntry,
  } = useCostCardProductEntries(selectedVersionId);

  useEffect(() => {
    if (costSets.length === 0) {
      setSelectedCostSetId(null);
      return;
    }
    if (!selectedCostSetId || !costSets.some((s) => s.id === selectedCostSetId)) {
      const preferred =
        costSets.find((s) => s.status === 'active' && s.cost_set_type === 'live') ??
        costSets.find((s) => s.status === 'active') ??
        costSets[0];
      setSelectedCostSetId(preferred?.id ?? null);
    }
  }, [costSets, selectedCostSetId]);

  useEffect(() => {
    if (versions.length === 0) {
      setSelectedVersionId(null);
      return;
    }
    if (!selectedVersionId || !versions.some((v) => v.id === selectedVersionId)) {
      const preferred = versions.find((v) => v.status === 'active') ?? versions[0];
      setSelectedVersionId(preferred?.id ?? null);
    }
  }, [versions, selectedVersionId]);

  const selectedCostSet = costSets.find((s) => s.id === selectedCostSetId) ?? null;
  const cloneCostSetSource = costSets.find((s) => s.id === cloneCostSetSourceId) ?? null;
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;
  const versionReadOnly = Boolean(
    selectedVersion?.locked || selectedVersion?.status === 'archived'
  );

  const summary = useMemo(() => {
    const metricsList = entries.map((e) => computeEntryMetrics(e));
    const withMargin = metricsList.filter((m) => m.grossMarginPct != null);
    const averageMarginPct =
      withMargin.length > 0
        ? withMargin.reduce((s, m) => s + (m.grossMarginPct ?? 0), 0) / withMargin.length
        : null;
    return {
      productCount: entries.length,
      averageMarginPct,
      belowTargetCount: metricsList.filter((m) => m.marginStatus === 'red').length,
      fxExposureCount: metricsList.filter((m) => m.hasFxExposure).length,
    };
  }, [entries]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleActivate = async (versionId: string) => {
    if (!selectedCostSetId) return;
    const hasActive = versions.some((v) => v.status === 'active' && v.id !== versionId);
    if (hasActive && !window.confirm('This will archive the current active version. Continue?')) {
      return;
    }
    const result = await activateVersion(selectedCostSetId, versionId);
    if (result.success) {
      setSelectedVersionId(versionId);
      toast.success('Version activated');
    } else {
      toast.error(result.error ?? 'Activation failed');
    }
  };

  const handleLock = async (versionId: string) => {
    if (!window.confirm('Lock this version? It will become read-only.')) return;
    const result = await lockVersion(versionId);
    if (result.success) {
      setSelectedVersionId(versionId);
      toast.success('Version locked');
    } else {
      toast.error(result.error ?? 'Lock failed');
    }
  };

  const handleCloneCostSet = (costSetId: string) => {
    setCloneCostSetSourceId(costSetId);
    setCloneCostSetModalOpen(true);
  };

  const handleCloneVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    setCloneVersionModalOpen(true);
  };

  if (costSetsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className={`h-8 w-8 animate-spin ${bc.iconColor}`} />
        <span className={`ml-3 ${premiumTypography.body}`}>Loading cost card…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pb-1">
      {(costSetsError || versionsError) && (
        <p className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {costSetsError || versionsError}
        </p>
      )}

      <div className="flex max-h-[11rem] shrink-0 flex-col gap-2 overflow-x-auto overflow-y-hidden lg:flex-row lg:gap-3 lg:w-fit lg:max-w-full">
        <CostSetRowList
          costSets={costSets}
          selectedId={selectedCostSetId}
          onSelect={setSelectedCostSetId}
          onCreate={createCostSet}
          onUpdate={updateCostSet}
          onArchive={archiveCostSet}
          onClone={handleCloneCostSet}
        />
        {selectedCostSetId ? (
          versionsLoading ? (
            <div className="flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white py-6 dark:border-gray-700 dark:bg-gray-800 lg:w-[38rem] xl:w-[42rem]">
              <Loader2 className={`h-5 w-5 animate-spin ${bc.iconColor}`} />
              <span className={`ml-2 ${premiumTypography.helper}`}>Loading versions…</span>
            </div>
          ) : (
            <VersionRowList
              versions={versions}
              selectedId={selectedVersionId}
              onSelect={setSelectedVersionId}
              onCreate={async (data) => createVersion(selectedCostSetId, data)}
              onUpdate={updateVersion}
              onClone={handleCloneVersion}
              onActivate={(id) => void handleActivate(id)}
              onLock={(id) => void handleLock(id)}
              actionsDisabled={!selectedCostSetId}
            />
          )
        ) : (
          <div className="flex w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 px-4 py-6 dark:border-gray-700 dark:bg-gray-800/60 lg:w-[38rem] xl:w-[42rem]">
            <p className={premiumTypography.helper}>Select a cost set to view versions.</p>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {selectedVersionId ? (
          <CostCardProductEntriesTable
            entries={entries}
            isLoading={entriesLoading}
            error={entriesError}
            expandedIds={expandedEntryIds}
            onToggleExpand={toggleExpand}
            onAddProduct={() => setAddProductModalOpen(true)}
            readOnly={versionReadOnly}
            productCount={summary.productCount}
            averageMarginPct={summary.averageMarginPct}
            belowTargetCount={summary.belowTargetCount}
            fxExposureCount={summary.fxExposureCount}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 dark:border-gray-700 dark:bg-gray-800/60">
            <p className={premiumTypography.helper}>
              {selectedCostSetId
                ? 'Select a version to view and edit product costs.'
                : 'Create or select a cost set to get started.'}
            </p>
          </div>
        )}
      </div>

      <CloneCostCardCostSetModal
        open={cloneCostSetModalOpen}
        sourceLabel={cloneCostSetSource?.label ?? null}
        sourceEffectiveFrom={cloneCostSetSource?.effective_date_from ?? null}
        sourceEffectiveTo={cloneCostSetSource?.effective_date_to ?? null}
        onClose={() => {
          setCloneCostSetModalOpen(false);
          setCloneCostSetSourceId(null);
        }}
        onSave={async (data) => {
          if (!cloneCostSetSourceId) return { success: false, error: 'No cost set selected' };
          const result = await cloneCostSet(
            cloneCostSetSourceId,
            data.label,
            data.effectiveDateFrom,
            data.effectiveDateTo.trim() || null,
            data.includeArchivedVersions
          );
          if (result.success && result.result) {
            setSelectedCostSetId(result.result.cost_set_id);
            const versionsCopied = result.result.versions ?? [];
            const preferred =
              [...versionsCopied].sort((a, b) => b.version_number - a.version_number)[0] ??
              versionsCopied[0];
            if (preferred?.new_version_id) {
              setSelectedVersionId(preferred.new_version_id);
            } else {
              setSelectedVersionId(null);
            }
            toast.success('Cost set cloned with all versions');
          } else if (!result.success) {
            toast.error(result.error ?? 'Clone failed');
          }
          return { success: result.success, error: result.error };
        }}
      />

      <CloneCostCardVersionModal
        open={cloneVersionModalOpen}
        sourceVersionNumber={selectedVersion?.version_number ?? null}
        onClose={() => setCloneVersionModalOpen(false)}
        onSave={async (label, effectiveDate) => {
          if (!selectedVersionId) return { success: false, error: 'No version selected' };
          const result = await cloneVersion(selectedVersionId, label, effectiveDate);
          if (result.success && result.id) {
            setSelectedVersionId(result.id);
            toast.success('Version cloned');
          } else if (!result.success) {
            toast.error(result.error ?? 'Clone failed');
          }
          return result;
        }}
      />

      <AddCostCardProductModal
        open={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        onSave={async (data) => {
          if (!selectedVersionId) return { success: false, error: 'No version selected' };
          return createEntry(selectedVersionId, data);
        }}
      />
    </div>
  );
}
