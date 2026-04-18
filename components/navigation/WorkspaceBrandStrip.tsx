'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';

const NAME_FONT_CANDIDATES_WITH_EXIT = [18, 16, 14, 12] as const;
const NAME_FONT_CANDIDATES_NO_EXIT = [20, 18, 16, 14, 12] as const;

function workspaceInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() ?? '?';
}

const exitIconButtonClass =
  'shrink-0 rounded-lg p-1.5 text-amber-300/90 hover:bg-amber-950/40 hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50';

export interface WorkspaceBrandStripProps {
  collapsed: boolean;
  /** True when `effectiveTenantId` is set (workspace context exists). */
  hasWorkspace: boolean;
  displayName: string | null;
  logoUrl: string | null;
  /** Super-admin impersonation: compact exit control (icon only). */
  onExitWorkspace?: () => void;
  className?: string;
}

/**
 * Workspace indicator: tenant name (up to two lines, logo height) beside the logo; optional exit to the left when impersonating.
 */
export function WorkspaceBrandStrip({
  collapsed,
  hasWorkspace,
  displayName,
  logoUrl,
  onExitWorkspace,
  className = '',
}: WorkspaceBrandStripProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [nameFontPx, setNameFontPx] = useState(18);
  const nameBoxRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLParagraphElement>(null);
  const hasExitWorkspace = onExitWorkspace != null;

  useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  const label = hasWorkspace ? displayName?.trim() || 'Workspace' : 'Platform';

  useLayoutEffect(() => {
    if (collapsed) return;

    const box = nameBoxRef.current;
    const el = nameTextRef.current;
    if (!box || !el) return;

    const candidates = hasExitWorkspace
      ? NAME_FONT_CANDIDATES_WITH_EXIT
      : NAME_FONT_CANDIDATES_NO_EXIT;

    const run = () => {
      let picked = candidates[candidates.length - 1];
      for (const px of candidates) {
        el.style.fontSize = `${px}px`;
        const pad = 1;
        const hOk = el.scrollHeight <= box.clientHeight + pad;
        const wOk = el.scrollWidth <= box.clientWidth + pad;
        if (hOk && wOk) {
          picked = px;
          break;
        }
      }
      el.style.removeProperty('font-size');
      setNameFontPx(picked);
    };

    run();
    const ro = new ResizeObserver(() => run());
    ro.observe(box);
    return () => ro.disconnect();
  }, [label, collapsed, hasExitWorkspace]);
  const showImg = Boolean(logoUrl && !imgFailed);
  const initials = workspaceInitials(hasWorkspace ? displayName?.trim() || 'W' : 'P');

  const boxCollapsed = 'h-9 w-9';
  const boxExpanded = 'h-11 w-11';

  const avatar = (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-600/80 bg-gray-800/90 p-0.5 shadow-inner ring-1 ring-black/20 ${
        collapsed ? boxCollapsed : boxExpanded
      }`}
      aria-hidden={showImg}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase URLs; avoid next/image domain config
        <img
          src={logoUrl!}
          alt=""
          className="h-full w-full max-h-full max-w-full object-contain"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="text-[11px] font-semibold tracking-tight text-gray-200">{initials}</span>
      )}
    </div>
  );

  const exitButton =
    onExitWorkspace != null ? (
      <button
        type="button"
        onClick={onExitWorkspace}
        className={exitIconButtonClass}
        title="Exit workspace"
        aria-label="Exit workspace"
      >
        <Undo2 size={16} strokeWidth={2} aria-hidden />
      </button>
    ) : null;

  return (
    <div
      className={`border-t border-gray-800 px-3 py-2 ${className}`.trim()}
      title={label}
      role="status"
      aria-label={hasWorkspace ? `Workspace: ${label}` : 'Platform admin — no tenant workspace'}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-1">
          {exitButton}
          {avatar}
        </div>
      ) : (
        <div className="flex w-full min-w-0 items-center gap-2">
          {exitButton ? (
            <div className="flex h-11 shrink-0 items-center">{exitButton}</div>
          ) : null}
          <div className="flex min-h-11 min-w-0 flex-1 items-center justify-end gap-2">
            <div
              ref={nameBoxRef}
              className="flex h-11 min-w-0 flex-1 flex-col justify-center overflow-hidden text-right"
            >
              <p
                ref={nameTextRef}
                style={{ fontSize: `${nameFontPx}px` }}
                className="line-clamp-2 min-w-0 break-words font-semibold leading-[1.1] tracking-[0.035em] text-gray-100"
              >
                {label}
              </p>
            </div>
            {avatar}
          </div>
        </div>
      )}
    </div>
  );
}
