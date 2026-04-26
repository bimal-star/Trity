import { supabase } from '@/lib/supabaseClient';

export interface CategoryTier {
  id: string;
  tenant_id: string;
  tier_number: number;
  name: string;
  is_multi_select: boolean;
  /** Present when the column exists in the tenant schema; omitted in current generated types. */
  is_required?: boolean | null;
  sort_order: number;
}

export interface CategoryNode {
  id: string;
  tenant_id: string;
  tier_number: number;
  parent_id: string | null;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductCategoryAssignment {
  id: string;
  product_id: string;
  tenant_id: string;
  category_node_id: string;
  tier_number: number;
  is_primary: boolean;
}

export interface AssignmentInput {
  tier_number: number;
  category_node_id: string;
  is_primary?: boolean;
}

export interface CategoryValidationError {
  tier_number?: number;
  message: string;
}

export interface SaveProductCategoriesResult {
  ok: boolean;
  errors?: CategoryValidationError[];
}

export interface CategoryStructure {
  tiers: CategoryTier[];
  nodesByTier: Record<number, CategoryNode[]>;
}

export async function loadCategoryStructure(tenantId: string): Promise<CategoryStructure> {
  const [tiersResult, nodesResult] = await Promise.all([
    supabase
      .from('category_tiers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('category_nodes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (tiersResult.error) throw new Error(tiersResult.error.message);
  if (nodesResult.error) throw new Error(nodesResult.error.message);

  const tiers = (tiersResult.data ?? []) as unknown as CategoryTier[];
  const nodes = (nodesResult.data ?? []) as unknown as CategoryNode[];

  const nodesByTier: Record<number, CategoryNode[]> = {};
  for (const tier of tiers) {
    nodesByTier[tier.tier_number] = [];
  }
  for (const node of nodes) {
    if (!nodesByTier[node.tier_number]) nodesByTier[node.tier_number] = [];
    nodesByTier[node.tier_number].push(node);
  }

  return { tiers, nodesByTier };
}

export async function getProductCategoryAssignments(
  productId: string
): Promise<ProductCategoryAssignment[]> {
  const { data, error } = await supabase
    .from('product_category_assignments')
    .select('*')
    .eq('product_id', productId);

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductCategoryAssignment[];
}

export async function deleteProductCategoryAssignments(
  productId: string,
  tierNumber: number
): Promise<void> {
  const { error } = await supabase
    .from('product_category_assignments')
    .delete()
    .eq('product_id', productId)
    .eq('tier_number', tierNumber);
  if (error) throw new Error(error.message);
}

export async function upsertProductCategoryAssignments(
  productId: string,
  tenantId: string,
  assignments: AssignmentInput[]
): Promise<void> {
  if (assignments.length === 0) return;

  const rows = assignments.map((a) => ({
    product_id: productId,
    tenant_id: tenantId,
    category_node_id: a.category_node_id,
    tier_number: a.tier_number,
    is_primary: a.is_primary ?? false,
  }));

  const { error } = await supabase
    .from('product_category_assignments')
    .upsert(rows, { onConflict: 'product_id,category_node_id' });

  if (error) throw new Error(error.message);
}

export async function saveProductCategories(
  productId: string,
  tenantId: string,
  assignments: AssignmentInput[]
): Promise<SaveProductCategoriesResult> {
  const { tiers, nodesByTier } = await loadCategoryStructure(tenantId);

  const tierMap = new Map(tiers.map((t) => [t.tier_number, t]));
  const allNodes = Object.values(nodesByTier).flat();
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  const byTier = new Map<number, AssignmentInput[]>();
  for (const a of assignments) {
    if (!byTier.has(a.tier_number)) byTier.set(a.tier_number, []);
    byTier.get(a.tier_number)!.push(a);
  }

  const errors: CategoryValidationError[] = [];

  for (const [tierNum, tierAssignments] of byTier) {
    const tier = tierMap.get(tierNum);
    if (!tier) {
      errors.push({ tier_number: tierNum, message: `Tier ${tierNum} does not exist.` });
      continue;
    }

    if (!tier.is_multi_select && tierAssignments.length > 1) {
      errors.push({
        tier_number: tierNum,
        message: `Tier "${tier.name}" only allows a single selection.`,
      });
    }

    for (const a of tierAssignments) {
      const node = nodeMap.get(a.category_node_id);
      if (!node) {
        errors.push({
          tier_number: tierNum,
          message: `Category node ${a.category_node_id} not found.`,
        });
        continue;
      }
      if (node.tier_number !== tierNum) {
        errors.push({
          tier_number: tierNum,
          message: `Node "${node.name}" does not belong to tier ${tierNum}.`,
        });
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const existing = await getProductCategoryAssignments(productId);
  const touchedTiers = new Set([...existing.map((e) => e.tier_number), ...byTier.keys()]);

  for (const tierNum of touchedTiers) {
    const newForTier = byTier.get(tierNum) ?? [];
    await deleteProductCategoryAssignments(productId, tierNum);
    if (newForTier.length > 0) {
      await upsertProductCategoryAssignments(productId, tenantId, newForTier);
    }
  }

  // Sync products.category_id for backward compat (Tier 1 → legacy categories table)
  const tier1Assignments = byTier.get(1) ?? [];
  const tier1Node = tier1Assignments[0]
    ? (nodeMap.get(tier1Assignments[0].category_node_id) ?? null)
    : null;

  let legacyCategoryId: string | null = null;
  if (tier1Node) {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', tier1Node.name)
      .eq('is_deleted', false)
      .maybeSingle();
    legacyCategoryId = data?.id ?? null;
  }

  await supabase.from('products').update({ category_id: legacyCategoryId }).eq('id', productId);

  return { ok: true };
}
