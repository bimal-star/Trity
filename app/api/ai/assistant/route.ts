import { NextResponse } from 'next/server';
import OpenAI, { APIError } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { fetchTenantIdForAiUser, insertAiUsageLog } from '@/lib/aiRouteContext';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { createOpenAIClient } from '@/lib/openaiServer';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';
import { enforceAiRateLimit } from '@/lib/upstashRateLimit';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

function getTokenFromHeader(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const [type, token] = headerValue.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

function extractAssistantText(content: OpenAI.Beta.Threads.Messages.MessageContent[]): string {
  const chunks: string[] = [];
  for (const part of content) {
    if (part.type === 'text') {
      chunks.push(part.text.value);
    }
  }
  return chunks.join('\n').trim();
}

/** Helps debug wrong org/project: lists assistants this key can actually see. */
async function describeAssistantScope(client: OpenAI): Promise<string> {
  try {
    const page = await client.beta.assistants.list({ limit: 30 });
    if (page.data.length === 0) {
      return (
        ' No Assistants are visible to this API key with the current OpenAI-Organization + OpenAI-Project headers. ' +
        'In the OpenAI dashboard, select the same project as OPENAI_PROJECT_ID (top-left project switcher), open Assistants, and either create one there or copy the id from an assistant that appears. ' +
        'If you use multiple organizations, set OPENAI_ORG_ID from Organization settings → General.'
      );
    }
    const lines = page.data.map((a) => `  • ${a.id} — ${(a.name ?? '').trim() || '(unnamed)'}`);
    return (
      ` Assistants visible to this API key in the current org/project (showing ${page.data.length}):\n${lines.join('\n')}\n` +
      ' Put one of these ids in OPENAI_ASSISTANT_ID, or change OPENAI_PROJECT_ID / OPENAI_ORG_ID / API key so your assistant appears in this list.'
    );
  } catch (e) {
    return ` Could not list assistants: ${getErrorMessage(e, 'unknown error')}`;
  }
}

async function resolveOrCreateOpenAiThreadId(
  supabase: SupabaseClient<Database>,
  openai: OpenAI,
  userId: string,
  tenantId: string,
  resetThread: boolean
): Promise<{ threadId: string } | { error: string; status: number }> {
  if (resetThread) {
    const { error: delErr } = await supabase
      .from('ai_threads')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);
    if (delErr) {
      return { error: delErr.message, status: 500 };
    }
  }

  const { data: existing, error: selErr } = await supabase
    .from('ai_threads')
    .select('thread_id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (selErr) {
    return { error: selErr.message, status: 500 };
  }

  if (existing?.thread_id) {
    return { threadId: existing.thread_id };
  }

  const created = await openai.beta.threads.create({});
  const openAiThreadId = created.id;

  const { error: insErr } = await supabase.from('ai_threads').insert({
    user_id: userId,
    tenant_id: tenantId,
    thread_id: openAiThreadId,
  });

  if (!insErr) {
    return { threadId: openAiThreadId };
  }

  // Unique race: another request created the row first
  if (insErr.code === '23505') {
    const { data: again, error: againErr } = await supabase
      .from('ai_threads')
      .select('thread_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (againErr || !again?.thread_id) {
      return { error: againErr?.message ?? 'Could not resolve assistant thread.', status: 500 };
    }
    return { threadId: again.thread_id };
  }

  return { error: insErr.message, status: 500 };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is not configured for AI (missing OPENAI_API_KEY).' },
      { status: 503 }
    );
  }

  const assistantId = process.env.OPENAI_ASSISTANT_ID?.trim();
  if (!assistantId) {
    return NextResponse.json(
      {
        error:
          'Server is not configured for Assistants (missing OPENAI_ASSISTANT_ID). Create an Assistant in the OpenAI dashboard and add its id to .env.local.',
      },
      { status: 503 }
    );
  }

  const supabaseEnv = getSupabaseUrlAndAnonKey();
  if (!supabaseEnv) {
    return NextResponse.json(
      { error: 'Server is missing Supabase configuration.' },
      { status: 503 }
    );
  }

  const token = getTokenFromHeader(request.headers.get('authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authData.user.id;

  const rate = await enforceAiRateLimit(userId);
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  const tenantResult = await fetchTenantIdForAiUser(supabase, userId);
  if ('error' in tenantResult) {
    return NextResponse.json({ error: tenantResult.error }, { status: tenantResult.status });
  }
  const { tenantId } = tenantResult;

  let body: { message?: unknown; reset_thread?: unknown };
  try {
    body = (await request.json()) as { message?: unknown; reset_thread?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message =
    typeof body.message === 'string' && body.message.trim() ? body.message.trim() : null;
  if (!message) {
    return NextResponse.json({ error: 'Missing non-empty "message" string.' }, { status: 400 });
  }

  const resetThread = body.reset_thread === true;

  const openai = createOpenAIClient(apiKey);

  const resolved = await resolveOrCreateOpenAiThreadId(
    supabase,
    openai,
    userId,
    tenantId,
    resetThread
  );
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const threadId = resolved.threadId;

  const usageModel = `assistant:${assistantId}`;

  try {
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });

    const run = await openai.beta.threads.runs.createAndPoll(
      threadId,
      { assistant_id: assistantId },
      { pollIntervalMs: 500 }
    );

    if (run.status === 'requires_action') {
      await insertAiUsageLog(supabase, {
        userId,
        tenantId,
        route: 'assistant',
        model: usageModel,
        messageCount: 1,
      });
      return NextResponse.json(
        {
          error:
            'Assistant requested tools (requires_action). For this lab, create an Assistant with no tools, or extend the API to handle tool output.',
          run_status: run.status,
        },
        { status: 422 }
      );
    }

    if (run.status !== 'completed') {
      await insertAiUsageLog(supabase, {
        userId,
        tenantId,
        route: 'assistant',
        model: usageModel,
        messageCount: 1,
      });
      return NextResponse.json(
        {
          error: `Run ended with status: ${run.status}`,
          run_status: run.status,
        },
        { status: 502 }
      );
    }

    const list = await openai.beta.threads.messages.list(threadId, {
      order: 'desc',
      limit: 15,
    });

    let text = '';
    for (const msg of list.data) {
      if (msg.role === 'assistant') {
        text = extractAssistantText(msg.content);
        if (text) break;
      }
    }

    await supabase
      .from('ai_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    await insertAiUsageLog(supabase, {
      userId,
      tenantId,
      route: 'assistant',
      model: usageModel,
      messageCount: 1,
    });

    return NextResponse.json({
      text,
      run_status: run.status,
    });
  } catch (err) {
    const messageErr = getErrorMessage(err, 'OpenAI Assistants request failed');
    const isNotFound = err instanceof APIError && err.status === 404;
    const isScopeOrRole =
      err instanceof APIError &&
      (err.status === 401 || err.status === 403) &&
      /scope|permission|insufficient|threads\.write/i.test(messageErr);
    let detail = '';
    if (isNotFound) {
      detail = await describeAssistantScope(openai);
    } else if (isScopeOrRole) {
      detail =
        ' Fix: OpenAI → API keys → create a new key (or edit if available) and enable Assistants / Threads permissions — restricted keys must include **api.threads.write** (and related Assistants scopes). Or use a non-restricted key. Also confirm your user has at least **Member** on the project (or Owner).';
    }
    await insertAiUsageLog(supabase, {
      userId,
      tenantId,
      route: 'assistant',
      model: usageModel,
      messageCount: 1,
    });
    return NextResponse.json({ error: messageErr + detail }, { status: 502 });
  }
}
