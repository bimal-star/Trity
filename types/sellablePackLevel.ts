/** Row shape for `tenant_sellable_pack_levels` (tenant catalog). */
export interface SellablePackLevel {
  id: string;
  tenant_id: string;
  code: string;
  label: string;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SellablePackLevelOption = Pick<SellablePackLevel, 'code' | 'label' | 'sort_order'>;
