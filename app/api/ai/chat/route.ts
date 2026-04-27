import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBearerToken } from '@/lib/api/requireBearer';
import { fetchTenantIdForAiUser, insertAiUsageLog } from '@/lib/aiRouteContext';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { createOpenAIClient } from '@/lib/openaiServer';
import { loadProjectDocsContext } from '@/lib/projectDocsContext';
import { getSupabaseUrlAndAnonKey } from '@/lib/supabasePublicEnv';
import { enforceAiRateLimit } from '@/lib/upstashRateLimit';
import type { Database } from '@/types/database';

const DEFAULT_MODEL = 'gpt-4o-mini';
const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o'] as const;
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 12000;

type ChatRole = 'user' | 'assistant' | 'system';

interface IncomingMessage {
  role?: string;
  content?: unknown;
}

function normalizeMessages(raw: unknown): { role: ChatRole; content: string }[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: { role: ChatRole; content: string }[] = [];
  for (const item of raw as IncomingMessage[]) {
    const role = item?.role;
    const content = item?.content;
    if (role !== 'user' && role !== 'assistant' && role !== 'system') return null;
    if (typeof content !== 'string' || !content.trim()) return null;
    const trimmed = content.trim();
    if (trimmed.length > MAX_MESSAGE_CHARS) return null;
    out.push({ role, content: trimmed });
  }
  if (out.length > MAX_MESSAGES) return null;
  return out;
}

function mergeProjectDocsIntoMessages(
  messages: { role: ChatRole; content: string }[],
  docs: string
): { role: ChatRole; content: string }[] {
  if (!docs.trim()) return messages;
  const block =
    '\n\n## Project documentation (excerpts from this repo)\n' +
    'Ground factual claims about Trity, the stack, and Supabase on this text. Cite the file name when helpful. If the answer is not in the excerpts, say so.\n' +
    docs;
  if (messages[0]?.role === 'system') {
    return messages.map((m, i) => (i === 0 ? { ...m, content: m.content + block } : m));
  }
  return [
    {
      role: 'system',
      content:
        '## Project documentation (excerpts from this repo)\n' +
        'Ground factual claims about Trity on this text. Cite the file name when helpful.\n' +
        docs,
    },
    ...messages,
  ];
}

function resolveModel(requested: unknown): string {
  if (typeof requested !== 'string' || !requested.trim()) {
    return DEFAULT_MODEL;
  }
  const t = requested.trim();
  return (ALLOWED_MODELS as readonly string[]).includes(t) ? t : DEFAULT_MODEL;
}

function encodeSse(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  const payload = JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${payload}\n\n`);
}

type ParsedBody = {
  messages?: unknown;
  model?: unknown;
  include_project_docs?: unknown;
} | null;

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  const auth = parseBearerToken(request);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is not configured for AI (missing OPENAI_API_KEY).' },
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

  const { token } = auth;
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

  const bodyPromise: Promise<ParsedBody> = request
    .json()
    .then((b) => b as ParsedBody)
    .catch(() => null);

  const [tenantResult, body] = await Promise.all([
    fetchTenantIdForAiUser(supabase, userId),
    bodyPromise,
  ]);

  if ('error' in tenantResult) {
    return NextResponse.json({ error: tenantResult.error }, { status: tenantResult.status });
  }
  const { tenantId } = tenantResult;

  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messages = normalizeMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      {
        error:
          'Invalid messages: send a non-empty array of { role: "user"|"assistant"|"system", content: string } (max 30 messages, 12000 chars each).',
      },
      { status: 400 }
    );
  }

  const includeProjectDocs = body.include_project_docs === true;
  let messagesForModel = messages;
  if (includeProjectDocs) {
    const docs = await loadProjectDocsContext();
    messagesForModel = mergeProjectDocsIntoMessages(messages, docs);
  }

  const model = resolveModel(body.model);
  const openai = await createOpenAIClient(apiKey);

  const stream = new ReadableStream({
    async start(controller) {
      const push = (event: string, data: unknown) => controller.enqueue(encodeSse(event, data));
      try {
        const streamResp = await openai.chat.completions.create({
          model,
          messages: messagesForModel,
          max_tokens: 1024,
          stream: true,
          stream_options: { include_usage: true },
        });

        let finalModel = model;
        let usage: unknown = null;

        for await (const chunk of streamResp) {
          if (chunk.model) finalModel = chunk.model;
          const delta = chunk.choices[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            push('delta', { text: delta });
          }
          if (chunk.usage) {
            usage = chunk.usage;
          }
        }

        push('done', { model: finalModel, usage });
        await insertAiUsageLog(supabase, {
          userId,
          tenantId,
          route: 'chat',
          model: finalModel,
          messageCount: messages.length,
        });
      } catch (err) {
        const message = getErrorMessage(err, 'OpenAI request failed');
        push('error', { message });
        await insertAiUsageLog(supabase, {
          userId,
          tenantId,
          route: 'chat',
          model,
          messageCount: messages.length,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
