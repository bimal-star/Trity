'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Loader2, Plus } from 'lucide-react';
import BomComponentPickerPanel from '@/components/bom/BomComponentPickerPanel';
import BomLinesTable from '@/components/bom/BomLinesTable';
import BomRecordSummaryCard from '@/components/bom/BomRecordSummaryCard';
import BomSummaryStrip from '@/components/bom/BomSummaryStrip';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTenant } from '@/contexts/TenantContext';
import { createBomHeader, useBom } from '@/hooks/useBom';
import { useBomOutputProducts } from '@/hooks/useBomOutputProducts';
import { useProduct } from '@/hooks/useProduct';
import { useProducts } from '@/hooks/useProducts';
import { emptyBomKeyDetailsDraft, type BomKeyDetailsDraft } from '@/lib/bomKeyDetails';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { useToast } from '@/lib/toast';
import type { ProductUsagePatch } from '@/components/products/ProductUsageToggles';

const bc = pillarAccent('businessCore');

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export default function BomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { effectiveTenantId: tenant_id } = useTenant();
  const rawId = params?.id;
  const bomId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const isCreateMode = bomId === 'new';

  const {
    header,
    headerMeta,
    lines,
    isLoading,
    error,
    updateHeader,
    addLine,
    updateLine,
    removeLine,
    reorderLines,
  } = useBom(isCreateMode ? undefined : bomId);

  const [outputProductId, setOutputProductId] = useState('');
  const [keyDetails, setKeyDetails] = useState<BomKeyDetailsDraft>(emptyBomKeyDetailsDraft);
  const [creating, setCreating] = useState(false);

  const { products: outputProducts, isLoading: outputProductsLoading } =
    useBomOutputProducts(isCreateMode);
  const { product: outputProduct, isLoading: outputProductLoading } = useProduct(
    isCreateMode ? outputProductId || undefined : (header?.product_id ?? undefined)
  );
  const { updateProduct } = useProducts(undefined, 'name', 'asc', { loadProducts: false });

  const excludePickerIds = useMemo(() => {
    const ids = lines.map((l) => l.component_product_id).filter((id): id is string => Boolean(id));
    const parent = isCreateMode ? outputProductId : header?.product_id;
    return parent ? [parent, ...ids] : ids;
  }, [lines, isCreateMode, outputProductId, header?.product_id]);

  const handleCreateBom = useCallback(async () => {
    if (!tenant_id || !outputProductId) {
      toast.error('Select an output product first.');
      return;
    }
    const out = parseFloat(keyDetails.output_quantity);
    if (!Number.isFinite(out) || out <= 0) {
      toast.error('Output quantity must be positive.');
      return;
    }
    setCreating(true);
    const result = await createBomHeader(tenant_id, outputProductId, {
      version: keyDetails.version.trim() || '1',
      output_quantity: out,
      output_unit_id: outputProduct?.base_unit_id ?? null,
      name: outputProduct?.name ?? null,
      notes: keyDetails.notes.trim() || null,
    });
    setCreating(false);
    if (!result.success || !result.id) {
      toast.error(result.error ?? 'Failed to create BOM');
      return;
    }
    toast.success('Bill of materials created.');
    router.replace(`/boms/${result.id}`);
  }, [tenant_id, outputProductId, keyDetails, outputProduct, toast, router]);

  useEffect(() => {
    if (isCreateMode || !bomId || bomId === 'new' || !header) return;
    setKeyDetails({
      version: header.version ?? '1',
      output_quantity: String(header.output_quantity ?? 1),
      notes: headerMeta?.notes ?? '',
    });
  }, [isCreateMode, bomId, header, headerMeta?.notes]);

  const handleKeyDetailsCommit = useCallback(async () => {
    if (isCreateMode || !bomId) return;
    const out = parseFloat(keyDetails.output_quantity);
    if (!Number.isFinite(out) || out <= 0) {
      toast.error('Output quantity must be positive.');
      return;
    }
    const result = await updateHeader({
      version: keyDetails.version.trim(),
      output_quantity: out,
      notes: keyDetails.notes.trim() || null,
    });
    if (result.success) toast.success('BOM details saved.');
    else toast.error(result.error ?? 'Update failed');
  }, [isCreateMode, bomId, keyDetails, updateHeader, toast]);

  const handleUsageUpdate = useCallback(
    async (patch: ProductUsagePatch) => {
      const pid = isCreateMode ? outputProductId : header?.product_id;
      if (!pid) return;
      const result = await updateProduct(pid, patch);
      if (!result.success) throw new Error(result.error ?? 'Update failed');
    },
    [isCreateMode, outputProductId, header?.product_id, updateProduct]
  );

  const handleAddComponent = useCallback(
    async (productId: string, quantity = 1) => {
      if (isCreateMode) {
        toast.error('Create the BOM first, then add components.');
        return { success: false, error: 'BOM not created' };
      }
      const result = await addLine(productId, quantity);
      if (result.success) toast.success('Component added.');
      else toast.error(result.error ?? 'Failed to add');
      return result;
    },
    [isCreateMode, addLine, toast]
  );

  const handleRemoveLine = async (lineId: string) => {
    const result = await removeLine(lineId);
    if (result.success) toast.success('Component removed.');
    else toast.error(result.error ?? 'Remove failed');
    return result;
  };

  const outputUnitSymbol = header?.output_unit_symbol ?? outputProduct?.base_unit_symbol ?? null;

  const showWorkspace = isCreateMode || Boolean(header);
  const pickerEnabled = Boolean(bomId) && !isCreateMode;
  const showPicker = isCreateMode || pickerEnabled;

  return (
    <ProtectedRoute>
      <PageContainer
        module="businessCore"
        rootClassName="flex min-h-0 max-h-dvh flex-1 flex-col overflow-hidden bg-gray-50 px-3 pb-2 pt-4 dark:bg-gray-900 sm:px-6"
        innerClassName="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PremiumStickyHeader
            module="businessCore"
            sticky={false}
            className="relative z-20 mb-3 shrink-0"
            backHref="/boms"
            backLabel="All BOMs"
            icon={Layers}
            title={isCreateMode ? 'New bill of materials' : 'Bill of materials'}
            subtitle={
              isCreateMode
                ? 'Define the output product and BOM recipe'
                : header
                  ? `${header.bom_code ?? header.product_sku ?? '—'} · v${header.version ?? '1'}`
                  : 'Loading…'
            }
            subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
          />

          {!isCreateMode && isLoading && !header ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className={`h-8 w-8 animate-spin ${bc.iconColor}`} />
            </div>
          ) : !isCreateMode && error && !header ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </p>
          ) : showWorkspace ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <BomRecordSummaryCard
                isCreateMode={isCreateMode}
                product={outputProduct}
                className="shrink-0"
                updatedAt={
                  !isCreateMode ? formatShortDate(headerMeta?.updated_at ?? undefined) : undefined
                }
                keyDetails={keyDetails}
                onKeyDetailsChange={setKeyDetails}
                onKeyDetailsCommit={handleKeyDetailsCommit}
                outputUnitSymbol={outputUnitSymbol}
                outputProducts={outputProducts}
                outputProductsLoading={outputProductsLoading}
                selectedOutputProductId={
                  isCreateMode ? outputProductId : (header?.product_id ?? '')
                }
                onOutputProductChange={setOutputProductId}
                onUsageUpdate={outputProduct ? handleUsageUpdate : undefined}
                bomCode={!isCreateMode ? (header?.bom_code ?? headerMeta?.bom_code ?? null) : null}
                actions={
                  isCreateMode ? (
                    <button
                      type="button"
                      disabled={creating || !outputProductId}
                      onClick={() => void handleCreateBom()}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {creating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      Create BOM
                    </button>
                  ) : null
                }
                footer={
                  isCreateMode ? (
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Draft — save BOM to add components from the panel on the right.
                    </p>
                  ) : undefined
                }
              />

              {!isCreateMode && header && <BomSummaryStrip header={header} />}

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <BomLinesTable
                    lines={lines}
                    isLoading={isLoading}
                    error={error}
                    readOnly={isCreateMode}
                    dropEnabled={pickerEnabled}
                    emptyHint={
                      isCreateMode
                        ? 'Create the BOM above, then drag components from the right.'
                        : undefined
                    }
                    onAddLine={handleAddComponent}
                    onUpdateLine={updateLine}
                    onRemoveLine={handleRemoveLine}
                    onReorderLines={reorderLines}
                  />
                </div>
                {showPicker && (
                  <BomComponentPickerPanel
                    excludeProductIds={excludePickerIds}
                    loadCandidates
                    canAdd={pickerEnabled}
                    onDoubleClickAdd={(id) => void handleAddComponent(id, 1)}
                  />
                )}
              </div>
            </div>
          ) : (
            <p className={`${premiumTypography.helper} py-8 text-center`}>
              BOM not found or you do not have access.
            </p>
          )}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
