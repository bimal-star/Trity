'use client';

import WarehouseForm from '@/components/warehouses/WarehouseForm';
import type { WarehouseFormData } from '@/types/warehouse';

interface WarehouseCreateFormProps {
  onCreate: (data: WarehouseFormData) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function WarehouseCreateForm({ onCreate, onCancel, onSuccess }: WarehouseCreateFormProps) {
  return (
    <WarehouseForm
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
