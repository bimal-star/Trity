export type CostCardCostSetType =
  | 'live'
  | 'annual_budget'
  | 'half_year'
  | 'quarterly'
  | 'monthly'
  | 'custom';

export type CostCardCostSetStatus = 'active' | 'archived';

export type CostCardVersionStatus = 'draft' | 'active' | 'archived';

export type CostLineBlockType =
  | 'materials'
  | 'packaging'
  | 'labour'
  | 'overhead'
  | 'inbound_freight'
  | 'outbound_distribution'
  | 'duties_tariffs'
  | 'regulatory'
  | 'royalties'
  | 'contingency';

export type MarginStatus = 'green' | 'amber' | 'red' | 'none';

export interface CostCardCostSet {
  id: string;

  tenant_id: string;

  cost_set_type: CostCardCostSetType | string;

  label: string;

  effective_date_from: string;

  effective_date_to: string | null;

  status: CostCardCostSetStatus | string;

  created_by: string | null;

  created_at: string;

  updated_at: string;
}

export interface CostCardVersion {
  id: string;

  cost_set_id: string;

  tenant_id: string;

  version_number: number;

  label: string | null;

  status: CostCardVersionStatus | string;

  effective_date: string;

  locked: boolean;

  cloned_from_version_id: string | null;

  notes: string | null;

  created_by: string | null;

  created_at: string;

  updated_at: string;
}

export interface CostCardProductEntry {
  id: string;

  version_id: string;

  tenant_id: string;

  product_id: string;

  customer_id: string | null;

  base_currency: string;

  selling_price_resolved: number | null;

  target_margin_pct: number | null;

  notes: string | null;

  created_at: string;

  updated_at: string;
}

export interface CostLine {
  id: string;

  entry_id: string;

  tenant_id: string;

  block_type: CostLineBlockType | string;

  component_product_id: string | null;

  supplier_id: string | null;

  logistics_rate_card_id: string | null;

  logistics_rate_line_id: string | null;

  description: string | null;

  quantity: number | null;

  uom: string | null;

  resolved_unit_cost: number | null;

  source_currency: string;

  exchange_rate: number;

  exchange_rate_date: string | null;

  converted_cost: number | null;

  is_manual_override: boolean;

  is_locked: boolean;

  sort_order: number;

  notes: string | null;

  created_at: string;

  updated_at: string;
}

export interface CostCardProductSummary {
  id: string;

  sku: string | null;

  name: string | null;
}

export interface CostCardCustomerSummary {
  id: string;

  legal_name: string | null;

  trading_name: string | null;
}

export interface CostCardProductEntryWithRelations extends CostCardProductEntry {
  product: CostCardProductSummary | null;

  customer: CostCardCustomerSummary | null;

  cost_lines: CostLine[];
}

export interface CostCardCostSetFormData {
  label: string;

  cost_set_type: CostCardCostSetType;

  effective_date_from: string;

  effective_date_to: string;

  status: CostCardCostSetStatus;
}

export interface CostCardVersionFormData {
  label: string;

  effective_date: string;

  notes: string;
}

/** RPC `clone_cost_card_cost_set` response shape */

export interface CloneCostCardCostSetResult {
  cost_set_id: string;

  versions: Array<{
    source_version_id: string;

    new_version_id: string;

    version_number: number;

    label: string | null;
  }>;
}

export interface CostCardProductEntryFormData {
  product_id: string;

  customer_id: string;

  base_currency: string;

  target_margin_pct: string;

  selling_price_resolved: string;
}

export interface CostCardEntryMetrics {
  totalCogs: number;

  grossMarginAmount: number | null;

  grossMarginPct: number | null;

  marginStatus: MarginStatus;

  hasFxExposure: boolean;
}

export const COST_LINE_BLOCK_ORDER: CostLineBlockType[] = [
  'materials',

  'packaging',

  'labour',

  'overhead',

  'inbound_freight',

  'outbound_distribution',

  'duties_tariffs',

  'regulatory',

  'royalties',

  'contingency',
];

export const COST_CARD_COST_SET_TYPE_LABELS: Record<CostCardCostSetType, string> = {
  live: 'Live',

  annual_budget: 'Annual Budget',

  half_year: 'Half Year',

  quarterly: 'Quarterly',

  monthly: 'Monthly',

  custom: 'Custom',
};

export const COST_CARD_COST_SET_STATUS_MAP: Record<string, string> = {
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export const COST_CARD_VERSION_STATUS_MAP: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',

  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};
