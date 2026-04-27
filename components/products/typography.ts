/**
 * @deprecated Prefer importing from `@/lib/premiumUi` — kept for localized imports.
 */
import { premiumTypography } from '@/lib/premiumUi';

export const productTypography = {
  pageTitle: premiumTypography.pageTitle,
  pageSubtitle: premiumTypography.pageSubtitle,
  sectionTitle: premiumTypography.sectionTitle,
  fieldLabel: 'text-sm font-medium',
  bodyText: premiumTypography.body,
  helperText: premiumTypography.helper,
  tableHeader: premiumTypography.tableHeader,
  buttonText: premiumTypography.button,
} as const;

export { premiumTypography } from '@/lib/premiumUi';
