'use client';

import { useCallback, useState } from 'react';
import { Bot, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import PageContainer from '@/components/PageContainer';
import PremiumStickyHeader from '@/components/layout/premium/PremiumStickyHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabaseClient';
import {
  premiumInputComfortableBase,
  premiumPrimaryButton,
  premiumSecondaryButton,
  premiumSurfaces,
  premiumTypography,
} from '@/lib/premiumUi';

const DEFAULT_SYSTEM = `You are a concise helper explaining Trity and general ERP ideas.
When project documentation is included in your context, use it for facts about this codebase and name the file when you rely on it.
Keep answers short unless the user asks for detail.`;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

async function fetchWithSupabaseAuth(url: string, init: RequestInit): Promise<Response> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error('Session expired. Please sign in again.');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${sessionData.session.access_token}`);
  return fetch(url, { ...init, headers });
}

export default function AiLabPage() {
  return (
    <ProtectedRoute>
      <PageContainer module={null}>
        <PremiumStickyHeader
          icon={Sparkles}
          title="AI lab"
          subtitle="Path A: chat + system prompt · Path B: OpenAI Assistant + thread"
        />
        <div className={`mb-6 ${premiumSurfaces.divider}`} />
        <div className="mx-auto flex max-w-3xl flex-col gap-10 pb-8">
          <PathAChatSection />
          <PathBAssistantSection />
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}

function PathAChatSection() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [includeProjectDocs, setIncludeProjectDocs] = useState(true);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput('');
    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: text }];
    setTurns(nextTurns);
    setLoading(true);
    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt.trim() || DEFAULT_SYSTEM },
        ...nextTurns.map((t) => ({ role: t.role, content: t.content })),
      ];
      const res = await fetchWithSupabaseAuth('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, include_project_docs: includeProjectDocs }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || `Request failed (${res.status})`);
      }
      const reply = typeof payload.text === 'string' ? payload.text : '';
      setTurns((prev) => [...prev, { role: 'assistant', content: reply || '(empty reply)' }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setTurns((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }, [includeProjectDocs, input, loading, systemPrompt, turns]);

  return (
    <section className={premiumSurfaces.card}>
      <div className="mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden />
        <h2 className={premiumTypography.pageTitle}>Path A — Chat Completions + system prompt</h2>
      </div>
      <p className={`mb-4 ${premiumTypography.body} text-gray-600 dark:text-gray-400`}>
        The <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">system</code> message is
        sent on every request together with your conversation. No OpenAI Assistant is involved.
      </p>
      <label className={`mb-3 flex cursor-pointer items-start gap-2 ${premiumTypography.body}`}>
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900"
          checked={includeProjectDocs}
          onChange={(e) => setIncludeProjectDocs(e.target.checked)}
        />
        <span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            Include key project docs in context
          </span>
          <span className={`mt-0.5 block ${premiumTypography.helper}`}>
            Server appends excerpts from{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">README.md</code>,{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">TRITY_CONTEXT.md</code>,{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">
              SUPABASE_INTEGRATION_STATUS.md
            </code>
            , <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">QUICK_REFERENCE.md</code>{' '}
            to your system message (allowlisted paths, size-capped). Restart dev after changing
            those files.
          </span>
        </span>
      </label>
      <label className={`mb-1 block ${premiumTypography.label}`}>System instructions</label>
      <textarea
        className={`${premiumInputComfortableBase} mb-4 min-h-[100px] font-mono text-xs`}
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        spellCheck={false}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={premiumSecondaryButton(null, 'sm', 'auto')}
          onClick={() => {
            setTurns([]);
            setError(null);
          }}
        >
          <RotateCcw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Clear chat
        </button>
      </div>
      <div
        className={`mb-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40`}
      >
        {turns.length === 0 ? (
          <p className={`${premiumTypography.helper}`}>No messages yet. Say something below.</p>
        ) : (
          turns.map((t, i) => (
            <div
              key={`${i}-${t.role}`}
              className={`rounded-lg px-3 py-2 text-sm ${
                t.role === 'user'
                  ? 'ml-4 bg-green-100 text-gray-900 dark:bg-green-900/30 dark:text-gray-100'
                  : 'mr-4 bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t.role}
              </span>
              <p className="mt-1 whitespace-pre-wrap">{t.content}</p>
            </div>
          ))
        )}
      </div>
      {error ? (
        <p
          className="mb-2 whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <input
          className={premiumInputComfortableBase}
          placeholder="Your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          disabled={loading || !input.trim()}
          className={premiumPrimaryButton('businessCore', 'md', 'standard')}
          onClick={() => void send()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Send'}
        </button>
      </div>
    </section>
  );
}

function PathBAssistantSection() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (resetThread: boolean) => {
      const text = input.trim();
      if (!text || loading) return;
      setError(null);
      setInput('');
      setTurns((prev) => [...prev, { role: 'user', content: text }]);
      setLoading(true);
      try {
        const res = await fetchWithSupabaseAuth('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            ...(resetThread ? { reset_thread: true } : {}),
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || `Request failed (${res.status})`);
        }
        const reply = typeof payload.text === 'string' ? payload.text : '';
        setTurns((prev) => [...prev, { role: 'assistant', content: reply || '(empty reply)' }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Request failed');
        setTurns((prev) =>
          prev.length && prev[prev.length - 1]?.role === 'user' ? prev.slice(0, -1) : prev
        );
        setInput(text);
      } finally {
        setLoading(false);
      }
    },
    [input, loading]
  );

  return (
    <section className={premiumSurfaces.card}>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
        <h2 className={premiumTypography.pageTitle}>Path B — OpenAI Assistant + thread</h2>
      </div>
      <p className={`mb-2 ${premiumTypography.body} text-gray-600 dark:text-gray-400`}>
        Create an Assistant in the{' '}
        <a
          href="https://platform.openai.com/assistants"
          className="text-green-700 underline dark:text-green-400"
          target="_blank"
          rel="noreferrer"
        >
          OpenAI dashboard
        </a>{' '}
        (instructions only; no tools for the simplest path). Add{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">
          OPENAI_ASSISTANT_ID=asst_…
        </code>{' '}
        to <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">.env.local</code> and restart{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">npm run dev</code>. Use the long{' '}
        <strong>Assistant ID</strong> shown under the assistant in the list (e.g.{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">asst_q7tE…</code>), not the
        display name you typed. If your API key starts with{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">sk-proj-</code>, also set{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">OPENAI_PROJECT_ID=proj_…</code>{' '}
        from OpenAI → your project → Settings → General (same project as the key and assistant). If
        you still get 404, add{' '}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">OPENAI_ORG_ID</code> from
        Organization → Settings → General, or create a **new** API key while that project is
        selected in the dashboard.
      </p>
      <p className={`mb-4 ${premiumTypography.helper}`}>
        The server keeps your OpenAI thread id in Supabase (per user and tenant). It is not exposed
        to the browser.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={premiumSecondaryButton(null, 'sm', 'auto')}
          onClick={() => {
            setTurns([]);
            setError(null);
          }}
        >
          <RotateCcw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Clear chat
        </button>
      </div>
      <div
        className={`mb-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-950/20`}
      >
        {turns.length === 0 ? (
          <p className={`${premiumTypography.helper}`}>
            After configuring{' '}
            <code className="rounded bg-white/80 px-1 dark:bg-gray-800">OPENAI_ASSISTANT_ID</code>,
            send a message. The same thread is reused until you use the Start new thread button
            (with your message typed in).
          </p>
        ) : (
          turns.map((t, i) => (
            <div
              key={`b-${i}-${t.role}`}
              className={`rounded-lg px-3 py-2 text-sm ${
                t.role === 'user'
                  ? 'ml-4 bg-amber-100 text-gray-900 dark:bg-amber-900/35 dark:text-gray-100'
                  : 'mr-4 bg-white text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t.role}
              </span>
              <p className="mt-1 whitespace-pre-wrap">{t.content}</p>
            </div>
          ))
        )}
      </div>
      {error ? (
        <p
          className="mb-2 whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <input
          className={premiumInputComfortableBase}
          placeholder="Message to the Assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(false);
            }
          }}
        />
        <button
          type="button"
          disabled={loading || !input.trim()}
          className={premiumPrimaryButton('platform', 'md', 'standard')}
          onClick={() => void send(false)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Send'}
        </button>
        <button
          type="button"
          disabled={loading || !input.trim()}
          className={premiumSecondaryButton(null, 'md', 'auto')}
          title="Creates a new OpenAI thread on the server for your next message"
          onClick={() => void send(true)}
        >
          Start new thread
        </button>
      </div>
    </section>
  );
}
