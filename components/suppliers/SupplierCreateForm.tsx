'use client';

import SupplierForm from '@/components/suppliers/SupplierForm';
import type { SupplierFormData } from '@/types/supplier';

interface SupplierCreateFormProps {
  onCreate: (data: SupplierFormData) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function SupplierCreateForm({ onCreate, onCancel, onSuccess }: SupplierCreateFormProps) {
  return (
    <SupplierForm
      mode="create"
      onCancel={onCancel}
      showHeader
      onSubmit={async (data) => {
        const result = await onCreate(data);
        if (result.success) {
          onSuccess?.();
        }
        return result;
      }}
    />
  );
}
