'use client';

import { useState } from 'react';
import PageContainer from '@/components/PageContainer';
import ProductList from '@/components/products/ProductList';
import ProductMasterCard from '@/components/products/ProductMasterCard';
import ProductDetailsTabs from '@/components/products/ProductDetailsTabs';
import { useProducts } from '@/hooks/useProducts';
import { Product, ProductFormData, ProductFilters } from '@/types/product';
import { BarChart3, Package2, Plus } from 'lucide-react';
import ProductCreateModal from '../../components/products/ProductCreateModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { logProductCreated } from '@/lib/auditLog';
import { useTenant } from '@/contexts/TenantContext';

export default function ProductsPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { tenant_id, user } = useTenant();

  const filters: ProductFilters | undefined = search
    ? { searchQuery: search }
    : undefined;

  const {
    products,
    isLoading,
    error,
    availableCategories,
    createProduct,
    refreshProducts,
  } = useProducts(filters, 'created_at', 'desc');

  const handleCreateProduct = async (data: ProductFormData) => {
    const result = await createProduct(data);
    if (result.success && result.data) {
      // Log product creation to audit trail
      if (tenant_id) {
        await logProductCreated(
          tenant_id,
          result.data.id,
          data.name,
          data.sku || 'N/A',
          user?.id || null
        );
      }
      await refreshProducts();
    }
    return result;
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        {/* Two-Tier Header */}
        <div className="mb-6 -mt-1">
          {/* Primary Row - Title with Icon + Action Buttons */}
          <div className="flex items-center justify-between gap-4 mb-2">
            {/* Left: Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="p-2">
                <Package2 className="w-5 h-5 text-green-700 dark:text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-green-700 dark:text-green-500">
                Products
              </h1>
            </div>
            {/* Right: Action Buttons */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Product
            </button>
          </div>
          {/* Secondary Row - Supporting Text */}
          <p className="text-sm text-green-700 dark:text-green-500 ml-11">
            Create and manage product catalog, specifications, and pricing
          </p>
        </div>

        {/* Subtle Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent mb-4" />

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start w-full overflow-hidden">
          <div className="lg:col-span-1 h-[calc(100vh-200px)] max-h-[600px]">
            <ProductList
              products={products}
              isLoading={isLoading}
              error={error}
              search={search}
              onSearchChange={setSearch}
              onSelect={setSelectedProduct}
            />
          </div>

          <div className="lg:col-span-2 space-y-4 min-w-0 overflow-hidden max-h-[calc(100vh-200px)]">
            <ProductMasterCard product={selectedProduct} />
            {selectedProduct && <ProductDetailsTabs product={selectedProduct} />}
          </div>
        </div>

        <ProductCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          availableCategories={availableCategories}
          onCreate={handleCreateProduct}
        />
      </PageContainer>
    </ProtectedRoute>
  );
}
