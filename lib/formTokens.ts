/**
 * Shared form input/label tokens — prevents duplication across form components.
 * Source of truth for the standard "comfortable" form control style used in
 * entity create/edit forms (customers, suppliers, warehouses, etc.).
 */

import { premiumInputComfortableBase, premiumFocusRing } from '@/lib/premiumUi';

/** Standard form text input: comfortable padding, green focus ring, light/dark bg. */
export const formInputClass = `${premiumInputComfortableBase} bg-white ${premiumFocusRing('businessCore')}`;

/** Standard form field label: uppercase tracking, muted color, bottom margin. */
export const formLabelClass =
  'block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5';

/**
 * Outer shell for full-height entity create/edit forms.
 * Provides the card border, white/dark bg, and flex column layout used in
 * CustomerCreateForm, SupplierForm, WarehouseForm.
 */
export const formCardShell =
  'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800';
