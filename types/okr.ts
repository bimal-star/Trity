/**
 * OKR Type Definitions
 *
 * Defines interfaces and types for Objectives and Key Results
 */

export type OKRStatus = 'draft' | 'active' | 'achieved' | 'missed';
export type KeyResultStatus = 'not_started' | 'in_progress' | 'achieved' | 'at_risk';

export interface OKR {
  id: string;
  project_id: string | null; // NULL for standalone OKRs
  objective: string;
  quarter: string | null; // e.g., "2025-Q1"
  year: number | null;
  status: OKRStatus;
  target_date: string | null; // date
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  is_deleted: boolean;
  // Computed/joined fields
  key_results?: KeyResult[];
  progress_percentage?: number; // Calculated from key results
}

export interface KeyResult {
  id: string;
  okr_id: string;
  description: string;
  target_value: number | null;
  current_value: number;
  unit: string | null; // e.g., "percentage", "count", "dollars"
  status: KeyResultStatus;
  weight: number; // for weighted scoring
  created_at: string;
  updated_at: string;
  // Computed fields
  progress_percentage?: number; // Calculated from current/target
}

export interface OKRFormData {
  project_id?: string | null;
  objective: string;
  quarter?: string | null;
  year?: number | null;
  status?: OKRStatus;
  target_date?: string | null;
  key_results?: KeyResultFormData[];
}

export interface KeyResultFormData {
  id?: string; // For updates
  description: string;
  target_value?: number | null;
  current_value?: number;
  unit?: string | null;
  status?: KeyResultStatus;
  weight?: number;
}

export interface OKRFilters {
  project_id?: string | null;
  status?: OKRStatus | 'all';
  quarter?: string | null;
  year?: number | null;
  searchQuery?: string;
}
