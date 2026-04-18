import {
  normalizeSubscriptionTier,
  type SubscriptionTier,
} from '@/lib/featureFlags';
import {
  allIdsInSubtreeByLabel,
  PILLAR_ROOT_LABEL_ORDER,
  type NavPillarRow,
} from '@/lib/navigationPillars';

/**
 * Which product pillars are enabled for a subscription tier (tenant-level nav preset).
 * Uses **root labels** and full subtrees; rows outside Business Core / Execution / Analytics are unchanged.
 */
export function tierEnabledPillarLabels(tier: string | null | undefined): Set<string> {
  const t = normalizeSubscriptionTier(tier);
  const map: Record<SubscriptionTier, Set<string>> = {
    basic: new Set(['Business Core']),
    professional: new Set(['Business Core', 'Execution', 'Analytics']),
    enterprise: new Set(['Business Core', 'Execution', 'Analytics']),
  };
  return map[t];
}

/**
 * For each navigation row in a product-pillar subtree, set is_enabled from the tier map (by pillar label).
 */
export function navRowsAfterTierPreset(
  rows: NavPillarRow[],
  tier: string | null | undefined
): Array<{ id: string; is_enabled: boolean }> {
  const enabledLabels = tierEnabledPillarLabels(tier);
  const updates: Array<{ id: string; is_enabled: boolean }> = [];

  for (const label of PILLAR_ROOT_LABEL_ORDER) {
    const want = enabledLabels.has(label);
    for (const id of allIdsInSubtreeByLabel(rows, label)) {
      const row = rows.find((r) => r.id === id);
      if (!row || row.is_deleted) continue;
      updates.push({ id, is_enabled: want });
    }
  }

  return updates;
}
