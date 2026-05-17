'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, ImageIcon, Upload, AlertCircle, Tag } from 'lucide-react';
import {
  IndustryType,
  ProductFormData,
  ProductImageEntry,
  ProductType,
  StatusType,
} from '@/types/product';
import { useTenant } from '@/contexts/TenantContext';
import { useCatalogueMode } from '@/hooks/useCatalogueMode';
import { useProductGroups, type ProductGroupRow } from '@/hooks/useProductGroups';
import { parseAttributeDimensions } from '@/lib/productCatalogue';
import { uploadProductImage } from '@/lib/productImageStorage';
import { productTypography } from '@/components/products/typography';
import AddCategoryModal from '@/components/products/AddCategoryModal';
import { premiumSecondaryButton } from '@/lib/premiumUi';
import { defaultUsageForProductType } from '@/lib/productUsageDefaults';
import { useToast } from '@/lib/toast';

export interface ProductCategoryOption {
  id: string;
  name: string;
  industry_type: string | null;
}

interface ProductCreateFormProps {
  availableCategories: ProductCategoryOption[];
  /** Refetch category master list after creating a category in-app. */
  refreshCategories?: () => Promise<void>;
  onCreate: (data: ProductFormData) => Promise<{
    success: boolean;
    error?: string | undefined;
    productId?: string;
  }>;
  onCancel: () => void;
  /** Called after a successful create; `productId` is set when the server returned the new row. */
  onSuccess?: (productId?: string) => void;
}

const industryOptions: IndustryType[] = [
  'bakery',
  'ready_meals',
  'pizza',
  'construction',
  'manufacturing',
  'retail',
  'other',
];

const productTypeOptions: ProductType[] = [
  'raw_material',
  'semi_finished',
  'finished_good',
  'service',
  'assembly',
  'packaging',
];

function formatProductTypeLabel(t: ProductType): string {
  return t.replace(/_/g, ' ');
}

const statusOptions: StatusType[] = [
  'active',
  'inactive',
  'discontinued',
  'planned',
  'development',
];

type RightSectionId = 'pricing' | 'lifecycle' | 'categories';

export default function ProductCreateForm({
  availableCategories,
  refreshCategories,
  onCreate,
  onCancel,
  onSuccess,
}: ProductCreateFormProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [industryType, setIndustryType] = useState<IndustryType>('manufacturing');
  const [productType, setProductType] = useState<ProductType>('finished_good');
  const [status, setStatus] = useState<StatusType>('active');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [minStock, setMinStock] = useState<string>('');
  const [maxStock, setMaxStock] = useState<string>('');
  const [reorderPoint, setReorderPoint] = useState<string>('');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('');
  const [shelfLifeDays, setShelfLifeDays] = useState<string>('');
  const [storageConditions, setStorageConditions] = useState('');
  const [lotControlled, setLotControlled] = useState(false);
  const [serialTracked, setSerialTracked] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { toast } = useToast();
  const [openSection, setOpenSection] = useState<RightSectionId | null>(null);
  const [tracksInventory, setTracksInventory] = useState(true);
  const [isSellable, setIsSellable] = useState(true);
  const [isPurchasable, setIsPurchasable] = useState(true);
  const [isManufacturable, setIsManufacturable] = useState(false);
  const [isComponent, setIsComponent] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const { effectiveTenantId: tenant_id } = useTenant();
  const { supportsGroups, isMatrix } = useCatalogueMode();
  const { fetchGroups, createGroup } = useProductGroups();
  const [productGroups, setProductGroups] = useState<ProductGroupRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupedVariantDetails, setGroupedVariantDetails] = useState('');
  const [matrixAttrSelection, setMatrixAttrSelection] = useState<Record<string, string>>({});

  useEffect(() => {
    const usage = defaultUsageForProductType(productType);
    setIsSellable(usage.is_sellable);
    setIsPurchasable(usage.is_purchasable);
    setIsManufacturable(usage.is_manufacturable);
    setIsComponent(usage.is_component);
    if (productType === 'service') {
      setTracksInventory(false);
    }
  }, [productType]);

  useEffect(() => {
    if (!supportsGroups || !tenant_id) {
      setProductGroups([]);
      return;
    }
    let cancelled = false;
    void fetchGroups()
      .then((rows) => {
        if (!cancelled) setProductGroups(rows);
      })
      .catch(() => {
        if (!cancelled) setProductGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [supportsGroups, tenant_id, fetchGroups]);
  const fieldLabelClass = `${productTypography.fieldLabel} text-gray-700 dark:text-gray-300 mb-1.5 block`;
  const sectionTitleClass = `${productTypography.sectionTitle} text-gray-500 dark:text-gray-400`;
  const helperTextClass = `${productTypography.helperText} text-gray-500 dark:text-gray-400`;
  const buttonTextClass = productTypography.buttonText;

  const hasPricingDetails =
    Boolean(sellPrice.trim()) ||
    Boolean(minStock.trim()) ||
    Boolean(maxStock.trim()) ||
    Boolean(reorderPoint.trim());
  const hasLifecycleDetails =
    Boolean(leadTimeDays.trim()) ||
    Boolean(shelfLifeDays.trim()) ||
    Boolean(storageConditions.trim()) ||
    lotControlled ||
    serialTracked ||
    Boolean(tagsInput.trim());
  const hasCategoryDetails = selectedCategories.length > 0;

  const sectionBtn = (id: RightSectionId, label: string, hasDetails: boolean) => {
    const isOpenSec = openSection === id;
    return (
      <button
        type="button"
        onClick={() => setOpenSection((prev) => (prev === id ? null : id))}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-left transition-colors ${buttonTextClass} ${
          isOpenSec
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        aria-expanded={isOpenSec}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              hasDetails
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            }`}
            title={hasDetails ? `${label} details added` : `No ${label.toLowerCase()} details yet`}
          >
            {!hasDetails && <AlertCircle className="mr-1 h-3 w-3" aria-hidden />}
            {hasDetails ? 'Added' : 'Missing'}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform ${isOpenSec ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>
    );
  };

  const resetForm = () => {
    setSku('');
    setName('');
    setShortDescription('');
    setDescription('');
    setIndustryType('manufacturing');
    setProductType('finished_good');
    setStatus('active');
    setSellPrice('');
    setMinStock('');
    setMaxStock('');
    setReorderPoint('');
    setLeadTimeDays('');
    setShelfLifeDays('');
    setStorageConditions('');
    setLotControlled(false);
    setSerialTracked(false);
    setTagsInput('');
    setSelectedCategories([]);
    setImageUrlInput('');
    setPendingImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setValidationError(null);
    setOpenSection(null);
    setTracksInventory(true);
    const usage = defaultUsageForProductType('finished_good');
    setIsSellable(usage.is_sellable);
    setIsPurchasable(usage.is_purchasable);
    setIsManufacturable(usage.is_manufacturable);
    setIsComponent(usage.is_component);
    setSelectedGroupId('');
    setNewGroupName('');
    setGroupedVariantDetails('');
    setMatrixAttrSelection({});
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onCancel();
  };

  const handleToggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const parseNumber = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!sku.trim() || !name.trim()) {
      setValidationError('SKU and Name are required');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    let resolvedImageUrl: string | undefined;
    let gallery: ProductImageEntry[] | undefined;

    try {
      if (pendingImageFile) {
        if (!tenant_id) {
          setValidationError('Tenant is required to upload images. Please sign in again.');
          setIsSubmitting(false);
          return;
        }
        resolvedImageUrl = await uploadProductImage(tenant_id, pendingImageFile);
        gallery = [{ url: resolvedImageUrl, sort_order: 0 }];
      } else {
        const trimmedUrl = imageUrlInput.trim();
        if (trimmedUrl) {
          resolvedImageUrl = trimmedUrl;
          gallery = [{ url: trimmedUrl, sort_order: 0 }];
        }
      }
    } catch (uploadErr: unknown) {
      const msg = uploadErr instanceof Error ? uploadErr.message : 'Image upload failed';
      toast.error(msg);
      setIsSubmitting(false);
      return;
    }

    const payload: ProductFormData = {
      sku: sku.trim(),
      name: name.trim(),
      short_description: shortDescription.trim() || undefined,
      description: description.trim() || undefined,
      industry_type: industryType,
      product_type: productType,
      status,
      categories: selectedCategories,
      sell_price: parseNumber(sellPrice),
      min_stock_level: parseNumber(minStock),
      max_stock_level: parseNumber(maxStock),
      reorder_point: parseNumber(reorderPoint),
      lead_time_days: parseNumber(leadTimeDays),
      shelf_life_days: parseNumber(shelfLifeDays),
      storage_conditions: storageConditions.trim() || undefined,
      lot_controlled: lotControlled,
      serial_tracked: serialTracked,
      tags:
        tagsInput.trim().length > 0
          ? tagsInput
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      is_active: true,
      tracks_inventory: tracksInventory,
      is_sellable: isSellable,
      is_purchasable: isPurchasable,
      is_manufacturable: isManufacturable,
      is_component: isComponent,
      ...(resolvedImageUrl ? { image_url: resolvedImageUrl, images: gallery } : {}),
    };

    if (supportsGroups && selectedGroupId) {
      payload.product_group_id = selectedGroupId;
      if (isMatrix) {
        const g = productGroups.find((x) => x.id === selectedGroupId);
        const dimList = parseAttributeDimensions(g?.attribute_dimensions);
        const attrs: Record<string, string> = {};
        for (const d of dimList) {
          const v = matrixAttrSelection[d.key]?.trim();
          if (v) attrs[d.key] = v;
        }
        if (Object.keys(attrs).length > 0) payload.variant_attributes = attrs;
      } else if (groupedVariantDetails.trim()) {
        payload.variant_attributes = { details: groupedVariantDetails.trim() };
      }
    }

    try {
      const result = await onCreate(payload);
      if (!result.success) {
        toast.error(result.error || 'Failed to create product');
        return;
      }
      toast.success('Product created.');
      resetForm();
      onSuccess?.(result.productId);
    } catch (err: any) {
      console.error('Error creating product:', err);
      toast.error(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-900/50"
        >
          <div className="shrink-0 px-4 pt-4">
            {validationError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 pb-4 lg:flex-row lg:gap-6 lg:overflow-hidden">
            <div className="flex flex-col shrink-0 w-full lg:w-[min(45rem,54%)] rounded-xl border border-gray-200/90 dark:border-gray-700/90 bg-white dark:bg-gray-800/60 p-4 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <h3
                className={`${sectionTitleClass} mb-3 border-b border-gray-200 pb-2 dark:border-gray-700`}
              >
                Basics & classification
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabelClass}>
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      placeholder="e.g., PROD-001"
                      autoFocus
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="sm:col-span-1 min-w-0">
                    <label className={fieldLabelClass}>
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      placeholder="Product name"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabelClass}>Short description</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    placeholder="Short summary used in lists and cards"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                    placeholder="Detailed description, usage notes, etc."
                    rows={2}
                    disabled={isSubmitting}
                  />
                </div>

                {supportsGroups && (
                  <div className="rounded-lg border border-dashed border-green-200 dark:border-green-800 bg-green-50/40 dark:bg-green-900/10 p-3 space-y-3">
                    <p className={`${sectionTitleClass} text-green-800 dark:text-green-200`}>
                      Product group (optional)
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label className={fieldLabelClass}>Group</label>
                        <select
                          value={selectedGroupId}
                          onChange={(e) => {
                            setSelectedGroupId(e.target.value);
                            setMatrixAttrSelection({});
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          disabled={isSubmitting}
                        >
                          <option value="">No group</option>
                          {productGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="New group name"
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          disabled={isSubmitting || creatingGroup}
                        />
                        <button
                          type="button"
                          disabled={isSubmitting || creatingGroup || !newGroupName.trim()}
                          onClick={async () => {
                            try {
                              setCreatingGroup(true);
                              const g = await createGroup({
                                name: newGroupName.trim(),
                                is_active: true,
                                is_deleted: false,
                              });
                              setProductGroups((prev) =>
                                [...prev, g].sort((a, b) => a.name.localeCompare(b.name))
                              );
                              setSelectedGroupId(g.id);
                              setNewGroupName('');
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setCreatingGroup(false);
                            }
                          }}
                          className={`shrink-0 ${premiumSecondaryButton('businessCore', 'sm', 'auto')}`}
                        >
                          {creatingGroup ? '…' : 'Create'}
                        </button>
                      </div>
                    </div>
                    {selectedGroupId && !isMatrix && (
                      <div>
                        <label className={fieldLabelClass}>Variant details (optional)</label>
                        <input
                          type="text"
                          value={groupedVariantDetails}
                          onChange={(e) => setGroupedVariantDetails(e.target.value)}
                          placeholder="e.g. Size Large, Colour Red"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          disabled={isSubmitting}
                        />
                      </div>
                    )}
                    {selectedGroupId &&
                      isMatrix &&
                      (() => {
                        const g = productGroups.find((x) => x.id === selectedGroupId);
                        const dimList = parseAttributeDimensions(g?.attribute_dimensions);
                        if (dimList.length === 0) {
                          return (
                            <p className={helperTextClass}>
                              Set attribute dimensions on the group (see Product groups) to pick
                              variant attributes here.
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {dimList.map((d) => (
                              <div key={d.key}>
                                <label className={fieldLabelClass}>{d.key}</label>
                                <select
                                  value={matrixAttrSelection[d.key] ?? ''}
                                  onChange={(e) =>
                                    setMatrixAttrSelection((prev) => ({
                                      ...prev,
                                      [d.key]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                  disabled={isSubmitting}
                                >
                                  <option value="">—</option>
                                  {d.values.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                    <ImageIcon
                      className="w-3.5 h-3.5 text-green-600 dark:text-green-400"
                      aria-hidden
                    />
                    Product image
                  </div>
                  <p className={helperTextClass}>
                    Upload a file (stored in your workspace) or paste an image URL. If you choose a
                    file, it is used instead of the URL.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setPendingImageFile(f);
                        if (f) setImageUrlInput('');
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => fileInputRef.current?.click()}
                      className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 ${buttonTextClass}`}
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden />
                      Choose file
                    </button>
                    {pendingImageFile && (
                      <>
                        <span className="max-w-[12rem] truncate text-xs text-gray-600 dark:text-gray-300">
                          {pendingImageFile.name}
                        </span>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setPendingImageFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs font-medium text-green-700 hover:underline dark:text-green-400"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Image URL (optional)</label>
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => {
                        setImageUrlInput(e.target.value);
                        if (e.target.value.trim()) setPendingImageFile(null);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      placeholder="https://…"
                      disabled={isSubmitting || !!pendingImageFile}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <label className={fieldLabelClass}>Industry type</label>
                    <select
                      value={industryType}
                      onChange={(e) => setIndustryType(e.target.value as IndustryType)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      disabled={isSubmitting}
                    >
                      {industryOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={fieldLabelClass}>Product type</label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value as ProductType)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      disabled={isSubmitting}
                    >
                      {productTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {formatProductTypeLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={fieldLabelClass}>Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as StatusType)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      disabled={isSubmitting}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-3 space-y-3">
                  <p className={sectionTitleClass}>Product usage</p>
                  <p className={helperTextClass}>
                    Controls where this SKU can be used in Trity workflows.
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {(
                      [
                        ['is-sellable', 'Sellable', isSellable, setIsSellable],
                        ['is-purchasable', 'Purchasable', isPurchasable, setIsPurchasable],
                        [
                          'is-manufacturable',
                          'Manufacturable',
                          isManufacturable,
                          setIsManufacturable,
                        ],
                        ['is-component', 'Component', isComponent, setIsComponent],
                      ] as const
                    ).map(([id, label, checked, setter]) => (
                      <label
                        key={id}
                        htmlFor={id}
                        className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <input
                          id={id}
                          type="checkbox"
                          className="rounded text-green-600 focus:ring-green-500"
                          checked={checked}
                          onChange={(e) => setter(e.target.checked)}
                          disabled={isSubmitting}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      id="tracks-inventory"
                      checked={tracksInventory}
                      onChange={(e) => setTracksInventory(e.target.checked)}
                      className="mt-0.5 rounded text-green-600 focus:ring-green-500"
                      disabled={isSubmitting}
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                        Track inventory
                      </span>
                      <span className={`mt-0.5 block ${helperTextClass}`}>
                        Turn off for services, fees, or SKUs not held in stock (no stock levels /
                        MRP).
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden min-w-0 min-h-[10rem] lg:min-h-0 lg:pl-3 lg:border-l border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto space-y-1.5 pr-1">
                {sectionBtn('pricing', 'Pricing & inventory', hasPricingDetails)}
                {openSection === 'pricing' && (
                  <div className="pt-1 pb-3 space-y-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={fieldLabelClass}>Sell Price</label>
                        <input
                          type="number"
                          value={sellPrice}
                          onChange={(e) => setSellPrice(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          placeholder="e.g., 9.99"
                          min="0"
                          step="0.01"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Min Stock Level</label>
                        <input
                          type="number"
                          value={minStock}
                          onChange={(e) => setMinStock(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          min="0"
                          disabled={isSubmitting || !tracksInventory}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Max Stock Level</label>
                        <input
                          type="number"
                          value={maxStock}
                          onChange={(e) => setMaxStock(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          min="0"
                          disabled={isSubmitting || !tracksInventory}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Reorder Point</label>
                        <input
                          type="number"
                          value={reorderPoint}
                          onChange={(e) => setReorderPoint(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          min="0"
                          disabled={isSubmitting || !tracksInventory}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {sectionBtn('lifecycle', 'Lifecycle, tracking & tags', hasLifecycleDetails)}
                {openSection === 'lifecycle' && (
                  <div className="pt-1 pb-3 space-y-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={fieldLabelClass}>Lead Time (days)</label>
                        <input
                          type="number"
                          value={leadTimeDays}
                          onChange={(e) => setLeadTimeDays(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          min="0"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Shelf Life (days)</label>
                        <input
                          type="number"
                          value={shelfLifeDays}
                          onChange={(e) => setShelfLifeDays(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          min="0"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Storage Conditions</label>
                        <input
                          type="text"
                          value={storageConditions}
                          onChange={(e) => setStorageConditions(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          placeholder="e.g., Frozen, Chilled, Ambient"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 sm:mt-3">
                        <input
                          id="lot-controlled"
                          type="checkbox"
                          checked={lotControlled}
                          onChange={(e) => setLotControlled(e.target.checked)}
                          className="rounded text-green-600 focus:ring-green-500"
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="lot-controlled"
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          Lot controlled
                        </label>
                      </div>
                      <div className="flex items-center gap-2 sm:mt-3">
                        <input
                          id="serial-tracked"
                          type="checkbox"
                          checked={serialTracked}
                          onChange={(e) => setSerialTracked(e.target.checked)}
                          className="rounded text-green-600 focus:ring-green-500"
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="serial-tracked"
                          className="text-sm text-gray-700 dark:text-gray-300"
                        >
                          Serial tracked
                        </label>
                      </div>
                      <div>
                        <label className={fieldLabelClass}>Tags</label>
                        <input
                          type="text"
                          value={tagsInput}
                          onChange={(e) => setTagsInput(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                          placeholder="Comma-separated tags"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {sectionBtn('categories', 'Categories', hasCategoryDetails)}
                {openSection === 'categories' && (
                  <div className="pt-1 pb-2">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={sectionTitleClass}>Categories</span>
                        <p className={`${helperTextClass} mt-0.5`}>
                          Choose which groups this product belongs to
                        </p>
                      </div>
                      {refreshCategories && (
                        <button
                          type="button"
                          onClick={() => setAddCategoryOpen(true)}
                          className={`shrink-0 ${premiumSecondaryButton('businessCore', 'sm', 'auto')}`}
                        >
                          <Tag className="h-3.5 w-3.5" aria-hidden />
                          New category
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableCategories.length === 0 && (
                        <p className={helperTextClass}>
                          No categories yet. Use <span className="font-medium">New category</span>{' '}
                          to create one, then select it below.
                        </p>
                      )}
                      {availableCategories.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.name);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleToggleCategory(cat.name)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors shadow-sm ${buttonTextClass} ${
                              isSelected
                                ? 'bg-green-600 text-white border-green-500'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            disabled={isSubmitting}
                          >
                            {isSelected && <span className="text-xs">●</span>}
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={handleClose}
              className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 ${buttonTextClass}`}
              disabled={isSubmitting}
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Cancel
            </button>
            <button
              type="submit"
              className={`inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 ${buttonTextClass}`}
              disabled={isSubmitting}
            >
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
      {refreshCategories ? (
        <AddCategoryModal
          open={addCategoryOpen}
          onClose={() => setAddCategoryOpen(false)}
          onCreated={async ({ name }) => {
            await refreshCategories();
            setSelectedCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
          }}
        />
      ) : null}
    </>
  );
}
