/**
 * useProducts Hook
 * 
 * Custom React hook for managing products data from Supabase
 * Provides CRUD operations, filtering, sorting, and category management
 */

import { useState, useEffect } from 'react';
import { tenantedSupabase } from '@/lib/supabaseSchemaClient';
import { Product, ProductFormData, ProductFilters, ProductSortField, SortDirection } from '@/types/product';
import { useTenant } from '@/contexts/TenantContext';

interface Category {
  id: string;
  name: string;
  industry_type: string | null;
}

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  availableCategories: Category[];
  createProduct: (data: ProductFormData) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (id: string, data: Partial<ProductFormData>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
}

export function useProducts(
  filters?: ProductFilters,
  sortField: ProductSortField = 'created_at',
  sortDirection: SortDirection = 'desc'
): UseProductsReturn {
  const { tenant_id, user } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  // Fetch categories from database (filtered by tenant_id)
  const fetchCategories = async () => {
    if (!tenant_id) {
      setAvailableCategories([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, industry_type')
        .eq('tenant_id', tenant_id)
        .order('name');
      
      if (error) throw error;
      setAvailableCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  };

  // Fetch products from Supabase with filters and sorting (filtered by tenant_id)
  const fetchProducts = async () => {
    if (!tenant_id) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = tenantedSupabase
        .from('products')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' });

      // Apply filters
      if (filters) {
        // Industry type filter
        if (filters.industry_type) {
          query = query.eq('industry_type', filters.industry_type);
        }

        // Product type filter
        if (filters.product_type) {
          query = query.eq('product_type', filters.product_type);
        }

        // Status filter
        if (filters.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        // Price range filter (using sell_price)
        if (filters.minPrice !== undefined) {
          query = query.gte('sell_price', filters.minPrice);
        }
        if (filters.maxPrice !== undefined) {
          query = query.lte('sell_price', filters.maxPrice);
        }

        // Low stock filter
        if (filters.lowStock) {
          query = query.not('reorder_point', 'is', null);
        }

        // Search query filter (searches name, description, SKU)
        if (filters.searchQuery) {
          const search = filters.searchQuery.toLowerCase();
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Fetch categories for each product (filtered by tenant_id)
      if (data && data.length > 0) {
        const productsWithCategories = await Promise.all(
          data.map(async (product) => {
            const { data: productCats } = await supabase
              .from('product_categories')
              .select(`
                categories (
                  id,
                  name
                )
              `)
              .eq('product_id', product.id)
              .eq('tenant_id', tenant_id);

            const categories = productCats?.map((pc: any) => pc.categories.name) || [];
            return { ...product, categories };
          })
        );
        setProducts(productsWithCategories as Product[]);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenant_id) {
      fetchCategories();
      fetchProducts();
    } else {
      setProducts([]);
      setAvailableCategories([]);
      setIsLoading(false);
    }
  }, [filters, sortField, sortDirection, tenant_id]);

  // Create a new product
  const createProduct = async (data: ProductFormData): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check tenant_id is available
      if (!tenant_id) {
        return { 
          success: false, 
          error: 'Tenant ID not available. Please ensure you are logged in and your account is properly configured.' 
        };
      }

      // Get current user from cached context for audit fields
      const { user } = useTenant();
      
      if (!user) {
        return { 
          success: false, 
          error: 'User not authenticated. Please sign in and try again.' 
        };
      }

      // Remove categories field from product data
      const { categories, ...dataWithoutCategories } = data;
      
      // Insert product with tenant_id
      const { data: newProduct, error: insertError } = await tenantedSupabase
        .from('products')
        .insert([{
          ...dataWithoutCategories,
          tenant_id: tenant_id,
          status: data.status || 'active',
          is_active: true,
          created_by: user.id,
          updated_by: user.id,
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // If categories were selected, create relationships
      if (categories && categories.length > 0 && newProduct) {
        // Find category IDs by name
        const categoryIds = availableCategories
          .filter(cat => categories.includes(cat.name))
          .map(cat => cat.id);

        if (categoryIds.length > 0) {
          // Insert into junction table with tenant_id
          const productCategories = categoryIds.map(categoryId => ({
            product_id: newProduct.id,
            category_id: categoryId,
            tenant_id: tenant_id
          }));

          const { error: junctionError } = await supabase
            .from('product_categories')
            .insert(productCategories);

          if (junctionError) {
            console.error('Error linking categories:', junctionError);
            // Don't fail the whole operation, just log it
          }
        }
      }

      await fetchProducts();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating product:', err);
      return { success: false, error: err.message || 'Failed to create product' };
    }
  };

  // Update an existing product
  const updateProduct = async (id: string, data: Partial<ProductFormData>): Promise<{ success: boolean; error?: string }> => {
    try {
      // Handle categories separately
      const categoriesData = data.categories;
      
      // Whitelist of allowed fields that exist in products table
      const allowedFields = [
        'sku', 'name', 'description', 'short_description', 
        'product_type', 'industry_type', 'status',
        'cost_price', 'sell_price',
        'min_stock_level', 'max_stock_level', 
        'reorder_point', 'reorder_quantity',
        'shelf_life_days', 'storage_conditions', 'tags'
      ];
      
      // Build clean update object with only allowed fields
      const updateData: any = {};
      allowedFields.forEach(field => {
        if (field in data && data[field as keyof ProductFormData] !== undefined) {
          const value = data[field as keyof ProductFormData];
          // Convert empty strings to null for nullable text fields
          if (typeof value === 'string' && value === '' && 
              ['description', 'short_description', 'storage_conditions'].includes(field)) {
            updateData[field] = null;
          } else if (value !== null) {
            updateData[field] = value;
          }
        }
      });
      
      // Update product if we have data to update
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await tenantedSupabase
          .from('products')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          console.error('Product update error:', updateError);
          throw new Error(updateError.message);
        }
      }

      // Handle category relationships
      if (categoriesData !== undefined) {
        // Delete existing relationships
        await supabase
          .from('product_categories')
          .delete()
          .eq('product_id', id);

        // Insert new relationships with tenant_id
        if (categoriesData.length > 0) {
          const categoryIds = availableCategories
            .filter(cat => categoriesData.includes(cat.name))
            .map(cat => cat.id);

          if (categoryIds.length > 0 && tenant_id) {
            const { error: junctionError } = await supabase
              .from('product_categories')
              .insert(
                categoryIds.map(categoryId => ({
                  product_id: id,
                  category_id: categoryId,
                  tenant_id: tenant_id
                }))
              );

            if (junctionError) {
              console.error('Category linking error:', junctionError);
              throw new Error(junctionError.message);
            }
          }
        }
      }

      await fetchProducts();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating product:', err);
      return { success: false, error: err.message || 'Failed to update product' };
    }
  };

  // Delete a product
  const deleteProduct = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Delete product-category relationships first
      await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', id);

      // Then delete the product
      const { error: deleteError } = await tenantedSupabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchProducts();
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting product:', err);
      return { success: false, error: err.message || 'Failed to delete product' };
    }
  };

  return {
    products,
    isLoading,
    error,
    availableCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    refreshProducts: fetchProducts,
    refreshCategories: fetchCategories,
  };
}
