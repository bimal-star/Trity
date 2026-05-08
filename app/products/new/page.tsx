'use client';

import { useRouter } from 'next/navigation';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import PageContainer from '@/components/PageContainer';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ProductCreateForm from '@/components/products/ProductCreateForm';
import { useProducts } from '@/hooks/useProducts';
import { ProductFormData } from '@/types/product';
import { logProductCreated } from '@/lib/auditLog';
import { useTenant } from '@/contexts/TenantContext';
import { pillarAccent, premiumTypography } from '@/lib/premiumUi';
import { Package2 } from 'lucide-react';

const bc = pillarAccent('businessCore');

export default function NewProductPage() {
  const router = useRouter();
  const { effectiveTenantId: tenant_id, user } = useTenant();
  const { availableCategories, createProduct, refreshCategories } = useProducts(
    undefined,
    'created_at',
    'desc',
    {
      loadProducts: false,
    }
  );

  const handleCreate = async (data: ProductFormData) => {
    const result = await createProduct(data);
    if (result.success && result.data && tenant_id) {
      await logProductCreated(
        tenant_id,
        result.data.id,
        data.name,
        data.sku || 'N/A',
        user?.id || null
      );
    }
    const productId =
      result.success && result.data && typeof result.data.id === 'string'
        ? result.data.id
        : undefined;
    return { success: result.success, error: result.error, productId };
  };

  return (
    <ProtectedRoute>
      <PageContainer module="businessCore">
        <PremiumStickyHeader
          module="businessCore"
          backHref="/products"
          backLabel="Back to products"
          icon={Package2}
          title="New product"
          subtitle="Add a catalog item with pricing, inventory policy, and categories"
          subtitleClassName={`${premiumTypography.pageSubtitle} ${bc.subtitleTint}`}
        />
        {/* Same viewport band as /products — form scrolls inside the card */}
        <div className="flex h-[calc(100vh-168px)] min-h-[min(560px,calc(100vh-168px))] w-full flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ProductCreateForm
              availableCategories={availableCategories}
              refreshCategories={refreshCategories}
              onCreate={handleCreate}
              onCancel={() => router.push('/products')}
              onSuccess={(productId) =>
                router.push(productId ? `/products/${productId}` : '/products')
              }
            />
          </div>
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
