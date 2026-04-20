import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBearerToken } from '@/lib/api/requireBearer';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(v: string) {
  return UUID_RE.test(v);
}

function makeClient(token: string) {
  const env = getSupabaseUrlAndAnonKey();
  if (!env) return null;
  // category_nodes / product_category_assignments are not in generated DB types yet — use untyped client
  return createClient(env.url, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

/**
 * DELETE /api/categories/{categoryNodeId}
 *   ?check=1  → check usage only, never deletes
 *   (no param) → check then delete if safe
 */
export async function DELETE(request: Request, { params }: { params: { categoryNodeId: string } }) {
  try {
    const auth = parseBearerToken(request);
    if (!auth.ok) return auth.response;

    const { categoryNodeId } = params;
    if (!categoryNodeId || !isUuid(categoryNodeId)) {
      return NextResponse.json({ error: 'Invalid category node ID' }, { status: 400 });
    }

    const db = makeClient(auth.token);
    if (!db) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase credentials' },
        { status: 503 }
      );
    }

    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify node exists
    const { data: node, error: nodeErr } = await db
      .from('category_nodes')
      .select('id, tenant_id, name')
      .eq('id', categoryNodeId)
      .maybeSingle();

    if (nodeErr) return NextResponse.json({ error: nodeErr.message }, { status: 500 });
    if (!node) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    // Count product assignments
    const { count: productCount, error: prodErr } = await db
      .from('product_category_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('category_node_id', categoryNodeId);

    if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });

    // Count child nodes (only if parent_node_id column exists — ignore column errors)
    let childCount = 0;
    const { count: cc, error: childErr } = await db
      .from('category_nodes')
      .select('*', { count: 'exact', head: true })
      .eq('parent_node_id', categoryNodeId)
      .eq('tenant_id', node.tenant_id);

    if (!childErr) {
      childCount = cc ?? 0;
    }

    const pCount = productCount ?? 0;
    const cCount = childCount;

    const url = new URL(request.url);
    const checkOnly = url.searchParams.get('check') === '1';

    if (pCount > 0 || cCount > 0) {
      return NextResponse.json(
        { canDelete: false, usage: { productCount: pCount, childCount: cCount } },
        { status: 409 }
      );
    }

    if (checkOnly) {
      return NextResponse.json({ canDelete: true });
    }

    const { error: deleteErr } = await db
      .from('category_nodes')
      .delete()
      .eq('id', categoryNodeId)
      .eq('tenant_id', node.tenant_id);

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/categories/{categoryNodeId} — rename a category node */
export async function PATCH(request: Request, { params }: { params: { categoryNodeId: string } }) {
  try {
    const auth = parseBearerToken(request);
    if (!auth.ok) return auth.response;

    const { categoryNodeId } = params;
    if (!categoryNodeId || !isUuid(categoryNodeId)) {
      return NextResponse.json({ error: 'Invalid category node ID' }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ error: 'Name must be 200 characters or fewer' }, { status: 400 });
    }

    const db = makeClient(auth.token);
    if (!db) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase credentials' },
        { status: 503 }
      );
    }

    const { data: authData, error: authError } = await db.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: node, error: nodeErr } = await db
      .from('category_nodes')
      .select('id, tenant_id')
      .eq('id', categoryNodeId)
      .maybeSingle();

    if (nodeErr) return NextResponse.json({ error: nodeErr.message }, { status: 500 });
    if (!node) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const { error: updateErr } = await db
      .from('category_nodes')
      .update({ name })
      .eq('id', categoryNodeId)
      .eq('tenant_id', node.tenant_id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
