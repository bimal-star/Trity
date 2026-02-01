"use client";

import { useState } from "react";
import { X, Plus, Package2 } from "lucide-react";
import { IndustryType, ProductFormData, ProductType, StatusType } from "@/types/product";

interface CategoryOption {
  id: string;
  name: string;
  industry_type: string | null;
}

interface ProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCategories: CategoryOption[];
  onCreate: (
    data: ProductFormData
  ) => Promise<{ success: boolean; error?: string | undefined }>;
}

const industryOptions: IndustryType[] = [
  "bakery",
  "ready_meals",
  "pizza",
  "construction",
  "manufacturing",
  "retail",
  "other",
];

const productTypeOptions: ProductType[] = [
  "raw_material",
  "semi_finished",
  "finished_good",
  "service",
  "assembly",
];

const statusOptions: StatusType[] = [
  "active",
  "inactive",
  "discontinued",
  "planned",
  "development",
];

export default function ProductCreateModal({
  isOpen,
  onClose,
  availableCategories,
  onCreate,
}: ProductCreateModalProps) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [industryType, setIndustryType] = useState<IndustryType>("manufacturing");
  const [productType, setProductType] = useState<ProductType>("finished_good");
  const [status, setStatus] = useState<StatusType>("active");
  const [sellPrice, setSellPrice] = useState<string>("");
  const [minStock, setMinStock] = useState<string>("");
  const [maxStock, setMaxStock] = useState<string>("");
  const [reorderPoint, setReorderPoint] = useState<string>("");
  const [leadTimeDays, setLeadTimeDays] = useState<string>("");
  const [shelfLifeDays, setShelfLifeDays] = useState<string>("");
  const [storageConditions, setStorageConditions] = useState("");
  const [lotControlled, setLotControlled] = useState(false);
  const [serialTracked, setSerialTracked] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setSku("");
    setName("");
    setShortDescription("");
    setDescription("");
    setIndustryType("manufacturing");
    setProductType("finished_good");
    setStatus("active");
    setSellPrice("");
    setMinStock("");
    setMaxStock("");
    setReorderPoint("");
    setLeadTimeDays("");
    setShelfLifeDays("");
    setStorageConditions("");
    setLotControlled(false);
    setSerialTracked(false);
    setTagsInput("");
    setSelectedCategories([]);
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
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
      setError("SKU and Name are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      is_active: true,
    };

    try {
      const result = await onCreate(payload);
      if (!result.success) {
        setError(result.error || "Failed to create product");
        return;
      }
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error creating product:", err);
      setError(err.message || "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 border-b border-purple-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Create New Product</h2>
                <p className="text-xs text-purple-100 mt-0.5">
                  Master data, pricing, inventory thresholds and categories
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(95vh-160px)]">
          <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SKU <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g., PROD-001"
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="Product name"
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="Short summary used in lists and cards"
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                  placeholder="Detailed description, usage notes, etc."
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Classification & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry Type
                </label>
                <select
                  value={industryType}
                  onChange={(e) => setIndustryType(e.target.value as IndustryType)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  disabled={isSubmitting}
                >
                  {industryOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product Type
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as ProductType)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  disabled={isSubmitting}
                >
                  {productTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusType)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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

            {/* Pricing & Inventory */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sell Price
                </label>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g., 9.99"
                  min="0"
                  step="0.01"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Stock Level
                </label>
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Stock Level
                </label>
                <input
                  type="number"
                  value={maxStock}
                  onChange={(e) => setMaxStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reorder Point
                </label>
                <input
                  type="number"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Lifecycle & Compliance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lead Time (days)
                </label>
                <input
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shelf Life (days)
                </label>
                <input
                  type="number"
                  value={shelfLifeDays}
                  onChange={(e) => setShelfLifeDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Storage Conditions
                </label>
                <input
                  type="text"
                  value={storageConditions}
                  onChange={(e) => setStorageConditions(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="e.g., Frozen, Chilled, Ambient"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Tracking & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 mt-5">
                <input
                  id="lot-controlled"
                  type="checkbox"
                  checked={lotControlled}
                  onChange={(e) => setLotControlled(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="lot-controlled"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Lot controlled
                </label>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input
                  id="serial-tracked"
                  type="checkbox"
                  checked={serialTracked}
                  onChange={(e) => setSerialTracked(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="Comma-separated tags"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Categories
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Applies many-to-many links via product_categories
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableCategories.length === 0 && (
                  <p className="text-xs text-gray-500">
                    No categories defined yet. You can add them from the
                    category maintenance screens.
                  </p>
                )}
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggleCategory(cat.name)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-sm flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-500"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                      disabled={isSubmitting}
                    >
                      {isSelected && <span className="text-[10px]">●</span>}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-sm font-semibold bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-650 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 text-sm font-semibold bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
