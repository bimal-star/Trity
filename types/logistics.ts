export type LogisticsDirection = 'inbound' | 'outbound' | 'both';

export type LogisticsRateCardStatus = 'active' | 'archived';

export type LogisticsChargeType = 'per_unit' | 'per_kg' | 'per_pallet' | 'per_delivery';

export interface LogisticsRateCard {
  id: string;
  tenant_id: string;
  label: string;
  provider: string | null;
  direction: LogisticsDirection | string;
  effective_date_from: string;
  effective_date_to: string | null;
  status: LogisticsRateCardStatus | string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogisticsRateLine {
  id: string;
  rate_card_id: string;
  lane: string | null;
  charge_type: LogisticsChargeType | string;
  rate: number;
  currency: string;
  min_charge: number | null;
  fuel_surcharge_pct: number | null;
  notes: string | null;
  created_at: string;
}

export interface LogisticsRateCardWithLines extends LogisticsRateCard {
  logistics_rate_lines: LogisticsRateLine[];
}

export interface LogisticsRateCardListRow extends LogisticsRateCard {
  logistics_rate_lines: { count: number }[];
}

export interface LogisticsRateCardFormData {
  label: string;
  provider: string;
  direction: LogisticsDirection;
  effective_date_from: string;
  effective_date_to: string;
  status: LogisticsRateCardStatus;
  notes: string;
}

export interface LogisticsRateLineFormData {
  lane: string;
  charge_type: LogisticsChargeType;
  rate: string;
  currency: string;
  min_charge: string;
  fuel_surcharge_pct: string;
  notes: string;
}

export const LOGISTICS_DIRECTION_MAP: Record<string, string> = {
  inbound: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  outbound: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  both: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export const LOGISTICS_RATE_CARD_STATUS_MAP: Record<string, string> = {
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export const LOGISTICS_CHARGE_TYPE_LABELS: Record<LogisticsChargeType, string> = {
  per_unit: 'Per unit',
  per_kg: 'Per kg',
  per_pallet: 'Per pallet',
  per_delivery: 'Per delivery',
};
