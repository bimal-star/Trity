import type { SubscriptionTier } from '@/lib/featureFlags';

export interface SubscriptionPackageRow {
  id: string;
  name: string;
  description: string | null;
  mapped_tier: SubscriptionTier;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SubscriptionPackageInsert = {
  name: string;
  description?: string | null;
  mapped_tier: SubscriptionTier;
  is_active?: boolean;
  sort_order?: number;
};

export type SubscriptionPackageUpdate = Partial<
  Omit<SubscriptionPackageRow, 'id' | 'created_at' | 'updated_at'>
>;
