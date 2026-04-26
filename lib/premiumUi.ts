/**
 * Shared premium UI tokens — benchmark: app/purchase-orders/new/page.tsx
 * Pillars align with PageContainer moduleThemes (businessCore / execution / analytics narrative order).
 * `platform` = admin / tenant management (amber), outside the three product pillars.
 */

export type PremiumModule = 'businessCore' | 'analytics' | 'execution' | 'platform';

export const premiumTypography = {
  pageTitle: 'text-2xl font-semibold',
  pageSubtitle: 'text-xs text-gray-500 dark:text-gray-400',
  sectionTitle:
    'text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400',
  label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  body: 'text-sm',
  tableCell: 'text-xs',
  tableHeader: 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
  tableHeaderDense:
    'text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
  helper: 'text-xs text-gray-500 dark:text-gray-400',
  button: 'text-sm font-medium',
  backLink: 'text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
} as const;

/** Compact control chrome (PO line-item inputs). */
export const premiumInputCompact =
  'w-full rounded-md border border-gray-200 px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-900';

/** Comfortable controls (cards, main forms) — append focus ring via premiumFocusRing(module). */
export const premiumInputComfortableBase =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all dark:border-gray-600 dark:bg-gray-900 text-gray-900 dark:text-white';

export const premiumSurfaces = {
  pageRoot: 'flex min-h-0 flex-1 flex-col bg-gray-50 px-4 pb-4 pt-4 dark:bg-gray-900 sm:px-5',
  pageInnerWide: 'mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col',
  pageRootDefault: 'flex min-h-0 flex-1 flex-col bg-gray-50 dark:bg-gray-900 pt-4 pb-2 px-6',
  pageInnerDefault: 'mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col',
  /** Super-admin tenant routes: subtle amber wash over default gray page root. No top padding — put it on `PremiumStickyHeader` via `platformStickyHeaderOffset` so sticky chrome does not jump when it pins. */
  platformPageRoot:
    'flex min-h-0 flex-1 flex-col bg-gradient-to-b from-amber-50/80 via-gray-50 to-gray-50 pb-2 px-6 dark:from-amber-950/25 dark:via-gray-900 dark:to-gray-900',
  platformPageInner: 'mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col',
  /** Use on `PremiumStickyHeader` `className` with `platformPageRoot` (replaces top half of `py-2` with former outer pt-4 + header top padding). */
  platformStickyHeaderOffset: '!pt-6',
  stickyHeaderShell:
    'sticky shrink-0 top-16 z-30 mb-3 border-b border-gray-200/70 bg-gray-50 py-2 dark:border-gray-700 dark:bg-gray-900 sm:top-[7rem]',
  /** Same separation as sticky header without fixed positioning (long admin forms). */
  staticHeaderShell:
    'relative z-auto mb-3 shrink-0 border-b border-gray-200/70 py-2 dark:border-gray-700',
  card: 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5',
  cardElevated:
    'rounded-2xl border border-gray-200 bg-white p-4 shadow-lg ring-1 ring-black/[0.03] dark:border-gray-700 dark:bg-gray-800 dark:ring-white/[0.04] sm:p-5',
  insetInfo:
    'rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-gray-50 p-3.5 dark:border-gray-600/80 dark:from-gray-900/40 dark:to-gray-900/60',
  /** Platform-themed panels and controls (use on super-admin tenant pages). */
  platformModulesPanel:
    'rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/45 dark:bg-amber-950/25 sm:p-5',
  platformSubscriptionCard:
    'rounded-xl border border-amber-200/70 bg-amber-50/50 p-5 dark:border-amber-900/50 dark:bg-amber-950/25',
  platformFormCheckbox:
    'h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-900',
  platformFormCheckboxTight:
    'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-900',
  platformChevronAccent: 'text-amber-600 dark:text-amber-400',
} as const;

export type PillarAccent = {
  iconTile: string;
  iconColor: string;
  titleText: string;
  subtitleTint: string;
  /** Native checkbox accent + focus ring (pillar-themed). */
  formCheckbox: string;
  /** Compact row checkbox (shrink-0, optional top nudge). */
  formCheckboxTight: string;
  /** Light gradient label wrap; use with `has-[:checked]:` for checked state. */
  formCheckboxGradientWrap: string;
  /** Checkbox inside gradient row (compact). */
  formCheckboxGradient: string;
  /** Gradient pad around pillar master checkbox only. */
  formCheckboxMasterWrap: string;
  primaryButton: string;
  primaryButtonHover: string;
  outlineAccent: string;
  outlineAccentHover: string;
  pillSelected: string;
  pillIdle: string;
  focusRing: string;
};

const businessCore: PillarAccent = {
  iconTile: 'rounded-lg bg-green-100 p-2 dark:bg-green-900/30',
  iconColor: 'text-green-700 dark:text-green-500',
  titleText: 'text-green-700 dark:text-green-500',
  subtitleTint: 'text-green-700/90 dark:text-green-500/90',
  formCheckbox:
    'h-4 w-4 rounded border-gray-300 text-green-600 accent-green-600 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-green-500',
  formCheckboxTight:
    'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 accent-green-600 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-green-500',
  formCheckboxGradientWrap:
    'flex cursor-pointer items-center gap-2 rounded-md border border-green-200/65 bg-gradient-to-br from-green-50/95 to-emerald-100/45 px-2 py-1.5 leading-tight transition-colors has-[:checked]:border-green-300/85 has-[:checked]:from-green-100 has-[:checked]:to-emerald-100/75 hover:opacity-[0.98] dark:border-green-800/45 dark:from-green-950/50 dark:to-emerald-950/35 dark:has-[:checked]:from-green-900/55 dark:has-[:checked]:to-emerald-950/45',
  formCheckboxGradient:
    'h-4 w-4 shrink-0 rounded border border-green-300/75 bg-white/90 text-green-600 accent-green-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-green-700 dark:bg-gray-900/90 dark:accent-green-500',
  formCheckboxMasterWrap:
    'rounded-md border border-green-200/60 bg-gradient-to-br from-green-50 to-emerald-100/40 p-1 dark:border-green-800/40 dark:from-green-950/45 dark:to-emerald-950/30',
  primaryButton: 'bg-green-600 text-white shadow-md dark:shadow-green-900/30',
  primaryButtonHover: 'hover:bg-green-700',
  outlineAccent:
    'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/40 dark:text-green-400 dark:hover:bg-green-900/20',
  outlineAccentHover: '',
  pillSelected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pillIdle:
    'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-green-500',
};

const analytics: PillarAccent = {
  iconTile: 'rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30',
  iconColor: 'text-blue-700 dark:text-blue-500',
  titleText: 'text-blue-700 dark:text-blue-500',
  subtitleTint: 'text-blue-700/90 dark:text-blue-500/90',
  formCheckbox:
    'h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-blue-500',
  formCheckboxTight:
    'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-blue-500',
  formCheckboxGradientWrap:
    'flex cursor-pointer items-center gap-2 rounded-md border border-blue-200/65 bg-gradient-to-br from-blue-50/95 to-sky-100/45 px-2 py-1.5 leading-tight transition-colors has-[:checked]:border-blue-300/85 has-[:checked]:from-blue-100 has-[:checked]:to-sky-100/75 hover:opacity-[0.98] dark:border-blue-800/45 dark:from-blue-950/50 dark:to-sky-950/35 dark:has-[:checked]:from-blue-900/55 dark:has-[:checked]:to-sky-950/45',
  formCheckboxGradient:
    'h-4 w-4 shrink-0 rounded border border-blue-300/75 bg-white/90 text-blue-600 accent-blue-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-700 dark:bg-gray-900/90 dark:accent-blue-500',
  formCheckboxMasterWrap:
    'rounded-md border border-blue-200/60 bg-gradient-to-br from-blue-50 to-sky-100/40 p-1 dark:border-blue-800/40 dark:from-blue-950/45 dark:to-sky-950/30',
  primaryButton: 'bg-blue-600 text-white shadow-md dark:shadow-blue-900/30',
  primaryButtonHover: 'hover:bg-blue-700',
  outlineAccent:
    'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/20',
  outlineAccentHover: '',
  pillSelected: 'bg-blue-200 text-blue-950 dark:bg-blue-900/40 dark:text-blue-100',
  pillIdle:
    'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500',
};

/** Execution pillar — orange (aligned with Sidebar and dashboard), not purple. */
const execution: PillarAccent = {
  iconTile: 'rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30',
  iconColor: 'text-orange-700 dark:text-orange-500',
  titleText: 'text-orange-700 dark:text-orange-500',
  subtitleTint: 'text-orange-700/90 dark:text-orange-500/90',
  formCheckbox:
    'h-4 w-4 rounded border-gray-300 text-orange-600 accent-orange-600 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-orange-500',
  formCheckboxTight:
    'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-orange-600 accent-orange-600 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-orange-500',
  formCheckboxGradientWrap:
    'flex cursor-pointer items-center gap-2 rounded-md border border-orange-200/65 bg-gradient-to-br from-orange-50/95 to-amber-100/45 px-2 py-1.5 leading-tight transition-colors has-[:checked]:border-orange-300/85 has-[:checked]:from-orange-100 has-[:checked]:to-amber-100/75 hover:opacity-[0.98] dark:border-orange-800/45 dark:from-orange-950/50 dark:to-amber-950/35 dark:has-[:checked]:from-orange-900/55 dark:has-[:checked]:to-amber-950/45',
  formCheckboxGradient:
    'h-4 w-4 shrink-0 rounded border border-orange-300/75 bg-white/90 text-orange-600 accent-orange-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-orange-700 dark:bg-gray-900/90 dark:accent-orange-500',
  formCheckboxMasterWrap:
    'rounded-md border border-orange-200/60 bg-gradient-to-br from-orange-50 to-amber-100/40 p-1 dark:border-orange-800/40 dark:from-orange-950/45 dark:to-amber-950/30',
  primaryButton: 'bg-orange-600 text-white shadow-md dark:shadow-orange-900/30',
  primaryButtonHover: 'hover:bg-orange-700',
  outlineAccent:
    'border-orange-200 text-orange-800 hover:bg-orange-50 dark:border-orange-800/50 dark:text-orange-400 dark:hover:bg-orange-950/30',
  outlineAccentHover: '',
  pillSelected: 'bg-orange-100 text-orange-900 dark:bg-orange-900/35 dark:text-orange-200',
  pillIdle:
    'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-orange-500',
};

/** Platform / super-admin surfaces (amber — distinct from green, blue, orange product pillars). */
const platform: PillarAccent = {
  iconTile: 'rounded-lg bg-amber-100 p-2 dark:bg-amber-900/35',
  iconColor: 'text-amber-800 dark:text-amber-400',
  titleText: 'text-amber-900 dark:text-amber-300',
  subtitleTint: 'text-amber-800/90 dark:text-amber-400/90',
  formCheckbox:
    'h-4 w-4 rounded border-gray-300 text-amber-600 accent-amber-600 focus:ring-2 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-amber-500',
  formCheckboxTight:
    'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-amber-600 accent-amber-600 focus:ring-2 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-amber-500',
  formCheckboxGradientWrap:
    'flex cursor-pointer items-center gap-2 rounded-md border border-amber-200/70 bg-gradient-to-br from-amber-50/95 to-yellow-100/40 px-2 py-1.5 leading-tight transition-colors has-[:checked]:border-amber-300/85 has-[:checked]:from-amber-100 has-[:checked]:to-yellow-100/65 hover:opacity-[0.98] dark:border-amber-800/50 dark:from-amber-950/50 dark:to-yellow-950/25 dark:has-[:checked]:from-amber-900/50 dark:has-[:checked]:to-yellow-950/35',
  formCheckboxGradient:
    'h-4 w-4 shrink-0 rounded border border-amber-300/75 bg-white/90 text-amber-600 accent-amber-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-700 dark:bg-gray-900/90 dark:accent-amber-500',
  formCheckboxMasterWrap:
    'rounded-md border border-amber-200/65 bg-gradient-to-br from-amber-50 to-yellow-100/35 p-1 dark:border-amber-800/45 dark:from-amber-950/45 dark:to-yellow-950/25',
  primaryButton: 'bg-amber-600 text-white shadow-md dark:shadow-amber-950/40',
  primaryButtonHover: 'hover:bg-amber-700',
  outlineAccent:
    'border-amber-200 text-amber-900 hover:bg-amber-50 dark:border-amber-800/60 dark:text-amber-300 dark:hover:bg-amber-950/40',
  outlineAccentHover: '',
  pillSelected: 'bg-amber-100 text-amber-950 dark:bg-amber-900/45 dark:text-amber-200',
  pillIdle:
    'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-amber-500',
};

/** Neutral chrome (admin, auth) — no pillar color on title. */
export const neutralAccent: PillarAccent = {
  iconTile: 'rounded-lg bg-gray-100 p-2 dark:bg-gray-800',
  iconColor: 'text-gray-700 dark:text-gray-300',
  titleText: 'text-gray-900 dark:text-white',
  subtitleTint: 'text-gray-600 dark:text-gray-400',
  formCheckbox:
    'h-4 w-4 rounded border-gray-300 text-gray-600 accent-gray-600 focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-gray-500',
  formCheckboxTight:
    'mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-gray-600 accent-gray-600 focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:accent-gray-500',
  formCheckboxGradientWrap:
    'flex cursor-pointer items-center gap-2 rounded-md border border-gray-200/80 bg-gradient-to-br from-gray-50/95 to-slate-100/50 px-2 py-1.5 leading-tight transition-colors has-[:checked]:border-gray-300 has-[:checked]:from-gray-100 has-[:checked]:to-slate-100/80 dark:border-gray-600/70 dark:from-gray-800/80 dark:to-slate-900/50 dark:has-[:checked]:from-gray-700/90 dark:has-[:checked]:to-slate-900/60',
  formCheckboxGradient:
    'h-4 w-4 shrink-0 rounded border border-gray-300/80 bg-white/90 text-gray-600 accent-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-900/90 dark:accent-gray-500',
  formCheckboxMasterWrap:
    'rounded-md border border-gray-200/70 bg-gradient-to-br from-gray-50 to-slate-100/45 p-1 dark:border-gray-600/60 dark:from-gray-800/70 dark:to-slate-900/40',
  primaryButton: 'bg-gray-900 text-white shadow-md dark:bg-gray-100 dark:text-gray-900',
  primaryButtonHover: 'hover:bg-gray-800 dark:hover:bg-gray-200',
  outlineAccent:
    'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
  outlineAccentHover: '',
  pillSelected: 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
  pillIdle:
    'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-gray-500',
};

export function pillarAccent(module: PremiumModule | null | undefined): PillarAccent {
  if (module === 'analytics') return analytics;
  if (module === 'execution') return execution;
  if (module === 'businessCore') return businessCore;
  if (module === 'platform') return platform;
  return neutralAccent;
}

export function premiumFocusRing(module: PremiumModule | null | undefined): string {
  return pillarAccent(module).focusRing;
}

export type PremiumButtonSize = 'sm' | 'md' | 'lg';
export type PremiumButtonWidth = 'auto' | 'standard' | 'wide';

const premiumButtonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const premiumButtonSizeMap: Record<PremiumButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-sm',
};

const premiumButtonWidthMap: Record<PremiumButtonWidth, string> = {
  auto: '',
  standard: 'min-w-[8rem]',
  wide: 'min-w-[10rem]',
};

export function premiumPrimaryButton(
  module: PremiumModule | null | undefined,
  size: PremiumButtonSize = 'md',
  width: PremiumButtonWidth = 'standard'
): string {
  const accent = pillarAccent(module);
  return `${premiumButtonBase} ${premiumButtonSizeMap[size]} ${premiumButtonWidthMap[width]} ${accent.primaryButton} ${accent.primaryButtonHover}`;
}

export function premiumSecondaryButton(
  module: PremiumModule | null | undefined,
  size: PremiumButtonSize = 'md',
  width: PremiumButtonWidth = 'standard'
): string {
  const accent = pillarAccent(module);
  return `${premiumButtonBase} ${premiumButtonSizeMap[size]} ${premiumButtonWidthMap[width]} border ${accent.outlineAccent} bg-white dark:bg-gray-800`;
}

export function premiumTertiaryButton(
  size: PremiumButtonSize = 'md',
  width: PremiumButtonWidth = 'standard'
): string {
  return `${premiumButtonBase} ${premiumButtonSizeMap[size]} ${premiumButtonWidthMap[width]} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`;
}

export function premiumDangerButton(
  size: PremiumButtonSize = 'md',
  width: PremiumButtonWidth = 'standard'
): string {
  return `${premiumButtonBase} ${premiumButtonSizeMap[size]} ${premiumButtonWidthMap[width]} bg-red-600 text-white hover:bg-red-700`;
}
