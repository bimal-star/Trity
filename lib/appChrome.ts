/**
 * Fixed app chrome heights — keep in sync with TopNav row1 + row2.
 * Row 2 is hidden below `sm`; mobile only uses row1 height.
 */
export const TOP_NAV_ROW1_REM = 4; // h-16
/** Second nav row (context bar); `sm` and up only in TopNav. */
export const TOP_NAV_ROW2_REM = 3; // h-12

/**
 * Non-scrolling spacer below fixed TopNav — same total height as row1 + row2 on `sm+`.
 * Use as the first flex child of `<main>` instead of `pt-*` on `<main>` so in-page
 * `position: sticky` headers compute correctly.
 */
export const mainTopNavSpacerClass = `h-16 shrink-0 sm:h-[7rem]`;

/** Sticky in-page headers sit below the fixed TopNav stack. */
export const stickyBelowTopNavClass = `top-16 sm:top-[7rem]`;

/** Pixel sum for skeleton calc when both rows visible (row1 + row2 at 16px/rem). */
export const topNavStackPxSm = Math.round((TOP_NAV_ROW1_REM + TOP_NAV_ROW2_REM) * 16);

/**
 * Fixed-height scroll band for /products list (below TopNav spacer + page title).
 * Matches /products/new form band — 168px ≈ nav stack + page chrome.
 */
export const productsListScrollBandHeightClass =
  'h-[calc(100dvh-168px)] max-h-[calc(100dvh-168px)] min-h-[min(480px,calc(100dvh-168px))]';
