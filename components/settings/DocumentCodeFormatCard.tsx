'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Save } from 'lucide-react';
import CollapsibleSection from '@/components/settings/CollapsibleSection';
import {
  DATE_PART_OPTIONS,
  DOCUMENT_CODE_FORMAT_TOKENS,
  DOCUMENT_CODE_TYPE_LABELS,
  describeDocumentCodePattern,
  parseDocumentCodePattern,
  previewDocumentCode,
  validateDocumentCodeFormat,
  type DocumentCodeDatePart,
  type DocumentCodeType,
  type TenantDocumentCodeFormat,
  type TenantDocumentCodeFormatUpdate,
} from '@/lib/documentCodeFormats';
import {
  pillarAccent,
  premiumInputCompact,
  premiumInputComfortableBase,
  premiumTypography,
} from '@/lib/premiumUi';

interface DocumentCodeFormatCardProps {
  format: TenantDocumentCodeFormat;
  disabled?: boolean;
  onSave: (
    documentType: DocumentCodeType,
    patch: TenantDocumentCodeFormatUpdate
  ) => Promise<{ success: boolean; error?: string }>;
}

const ex = pillarAccent('execution');

const cardTitleClass = 'text-base font-bold text-gray-900 dark:text-white';

type DraftParts = {
  prefix: string;
  date_part: DocumentCodeDatePart;
  sequence_pad: number;
  separator: string;
};

function partsFromFormat(f: TenantDocumentCodeFormat): DraftParts {
  return {
    prefix: f.prefix,
    date_part: f.date_part,
    sequence_pad: f.sequence_pad,
    separator: f.separator,
  };
}

export default function DocumentCodeFormatCard({
  format,
  disabled = false,
  onSave,
}: DocumentCodeFormatCardProps) {
  const patternRef = useRef<HTMLInputElement>(null);
  const [parts, setParts] = useState<DraftParts>(() => partsFromFormat(format));
  const [patternText, setPatternText] = useState(() =>
    describeDocumentCodePattern(partsFromFormat(format))
  );
  const [parseHint, setParseHint] = useState<string | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(format.auto_generate);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);

  const formatFieldsDisabled = autoGenerate || disabled || saving;

  const label = format.label ?? DOCUMENT_CODE_TYPE_LABELS[format.document_type as DocumentCodeType];

  const applyParts = useCallback((next: DraftParts) => {
    setParts(next);
    setPatternText(describeDocumentCodePattern(next));
    setParseHint(null);
  }, []);

  useEffect(() => {
    const next = partsFromFormat(format);
    setParts(next);
    setPatternText(describeDocumentCodePattern(next));
    setAutoGenerate(format.auto_generate);
    setParseHint(null);
    setLocalError(null);
  }, [format]);

  const preview = useMemo(() => previewDocumentCode(parts, 1), [parts]);

  const digitOptions = useMemo(() => {
    const base = [4, 5, 6, 7, 8];
    if (!base.includes(parts.sequence_pad)) base.push(parts.sequence_pad);
    return base.sort((a, b) => a - b);
  }, [parts.sequence_pad]);

  const isDirty =
    parts.prefix !== format.prefix ||
    parts.date_part !== format.date_part ||
    parts.sequence_pad !== format.sequence_pad ||
    parts.separator !== format.separator ||
    autoGenerate !== format.auto_generate;

  const handlePatternChange = (value: string) => {
    if (formatFieldsDisabled) return;
    setPatternText(value);
    const parsed = parseDocumentCodePattern(value);
    if (parsed.ok) {
      setParts(parsed.value);
      setParseHint(null);
    } else {
      setParseHint(parsed.error);
    }
  };

  const insertToken = (token: string) => {
    if (formatFieldsDisabled) return;
    const el = patternRef.current;
    if (!el) {
      handlePatternChange(patternText + token);
      return;
    }
    const start = el.selectionStart ?? patternText.length;
    const end = el.selectionEnd ?? patternText.length;
    const next = patternText.slice(0, start) + token + patternText.slice(end);
    handlePatternChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSave = async () => {
    let patchParts = parts;
    if (!autoGenerate) {
      const parsed = parseDocumentCodePattern(patternText);
      if (!parsed.ok) {
        setLocalError(parsed.error);
        return;
      }
      patchParts = parsed.value;
    }
    const patch = {
      ...patchParts,
      prefix: patchParts.prefix.trim().toUpperCase(),
      auto_generate: autoGenerate,
    };
    const err = validateDocumentCodeFormat(patch);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    setSaving(true);
    const result = await onSave(format.document_type as DocumentCodeType, patch);
    setSaving(false);
    if (!result.success) setLocalError(result.error ?? 'Save failed');
  };

  const patternInputClass = `${premiumInputComfortableBase} bg-white font-mono text-sm ${ex.focusRing} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800/80`;

  const saveDisabled = disabled || saving || !isDirty || (!autoGenerate && Boolean(parseHint));

  const headerSummary = `${preview}${autoGenerate ? ' · Auto Create' : ''}`;

  return (
    <article className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700 sm:px-4">
        <button
          type="button"
          onClick={() => setCardOpen((v) => !v)}
          aria-expanded={cardOpen}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
        >
          <ChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-purple-700 transition-transform dark:text-purple-300 ${
              cardOpen ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h3 className={cardTitleClass}>{label}</h3>
            {!cardOpen ? (
              <p className="mt-0.5 truncate font-mono text-xs font-medium text-purple-800 dark:text-purple-200">
                {headerSummary}
              </p>
            ) : format.description ? (
              <p className={`mt-0.5 ${premiumTypography.helper}`}>{format.description}</p>
            ) : null}
          </div>
        </button>
        <label
          className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            autoGenerate
              ? 'border-purple-400 bg-purple-100 text-purple-950 dark:border-purple-600 dark:bg-purple-900/50 dark:text-purple-50'
              : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-300'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={autoGenerate}
            onChange={(e) => {
              setAutoGenerate(e.target.checked);
              if (!e.target.checked) setParseHint(null);
            }}
            disabled={disabled || saving}
            className="h-3.5 w-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          Auto Create
        </label>
      </div>

      {cardOpen ? (
        <div className="px-3 pb-3 pt-1 sm:px-4">
          <CollapsibleSection
            title="Custom format"
            defaultOpen={!autoGenerate}
            summary={patternText}
            contentClassName={formatFieldsDisabled ? 'pointer-events-none opacity-50' : ''}
          >
            {autoGenerate ? (
              <p className={`mb-2 ${premiumTypography.helper}`}>
                Uncheck <strong>Auto Create</strong> to edit the code format.
              </p>
            ) : null}
            <input
              ref={patternRef}
              id={`${format.document_type}-pattern`}
              type="text"
              value={patternText}
              onChange={(e) => handlePatternChange(e.target.value)}
              disabled={formatFieldsDisabled}
              spellCheck={false}
              aria-label="Custom format pattern"
              className={patternInputClass}
              placeholder="CUS-{YYYY}-{SEQ:6}"
            />
            <p className={`mt-1.5 ${premiumTypography.helper}`}>
              Prefix (CUS, PO), then tokens. <code className="text-[10px]">{'{SEQ:n}'}</code> is
              required.
            </p>
            {parseHint && !autoGenerate ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{parseHint}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="w-full text-xs font-semibold text-gray-600 dark:text-gray-400">
                Insert token
              </span>
              {DOCUMENT_CODE_FORMAT_TOKENS.map((t) => (
                <button
                  key={t.token}
                  type="button"
                  disabled={formatFieldsDisabled}
                  onClick={() => insertToken(t.token)}
                  className="rounded-md border border-purple-200/80 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-200"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Quick adjust"
            defaultOpen={false}
            summary={patternText}
            contentClassName={formatFieldsDisabled ? 'pointer-events-none opacity-50' : ''}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Prefix
                </label>
                <input
                  type="text"
                  value={parts.prefix}
                  onChange={(e) =>
                    applyParts({
                      ...parts,
                      prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    })
                  }
                  disabled={formatFieldsDisabled}
                  maxLength={12}
                  className={premiumInputCompact}
                />
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Date
                </label>
                <select
                  value={parts.date_part}
                  onChange={(e) =>
                    applyParts({ ...parts, date_part: e.target.value as DocumentCodeDatePart })
                  }
                  disabled={formatFieldsDisabled}
                  className={premiumInputCompact}
                >
                  {DATE_PART_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Digits
                </label>
                <select
                  value={parts.sequence_pad}
                  onChange={(e) =>
                    applyParts({ ...parts, sequence_pad: parseInt(e.target.value, 10) })
                  }
                  disabled={formatFieldsDisabled}
                  className={premiumInputCompact}
                >
                  {digitOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Between
                </label>
                <select
                  value={parts.separator === '' ? '__none__' : parts.separator}
                  onChange={(e) =>
                    applyParts({
                      ...parts,
                      separator: e.target.value === '__none__' ? '' : e.target.value,
                    })
                  }
                  disabled={formatFieldsDisabled}
                  className={premiumInputCompact}
                >
                  <option value="-">Dash (-)</option>
                  <option value="_">Underscore (_)</option>
                  <option value=".">Dot (.)</option>
                  <option value="__none__">None</option>
                </select>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Preview & save" defaultOpen summary={preview}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 rounded-md border border-purple-200/60 bg-purple-50/60 px-3 py-2 dark:border-purple-800/50 dark:bg-purple-950/40">
                <p className="text-[10px] font-bold uppercase tracking-wide text-purple-800/90 dark:text-purple-300/90">
                  Example next code
                </p>
                <p className="truncate font-mono text-base font-bold text-purple-950 dark:text-purple-50">
                  {preview}
                </p>
              </div>
              <button
                type="button"
                disabled={saveDisabled}
                onClick={() => void handleSave()}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                Save
              </button>
            </div>
          </CollapsibleSection>

          {localError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{localError}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
