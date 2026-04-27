/**
 * Gantt Chart Utilities
 *
 * Functions for calculating Gantt chart positions, dates, and rendering
 */

export interface GanttItem {
  id: string;
  name: string;
  start_date: string | null; // date string
  end_date: string | null; // date string
  progress_percentage: number;
  children?: GanttItem[];
}

export interface GanttPosition {
  x: number;
  width: number;
  progressWidth: number;
}

export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

/**
 * Calculate pixels per day based on zoom level
 */
export function getPixelsPerDay(zoomLevel: ZoomLevel): number {
  switch (zoomLevel) {
    case 'day':
      return 20; // 20px per day
    case 'week':
      return 10; // 10px per day (70px per week)
    case 'month':
      return 3; // 3px per day (90px per month)
    case 'quarter':
      return 1; // 1px per day (90px per quarter)
    default:
      return 10;
  }
}

/**
 * Get date range from items
 */
export function getDateRange(items: GanttItem[]): { start: Date; end: Date } | null {
  const dates: Date[] = [];

  const extractDates = (item: GanttItem) => {
    if (item.start_date) dates.push(new Date(item.start_date));
    if (item.end_date) dates.push(new Date(item.end_date));
    if (item.children) {
      item.children.forEach(extractDates);
    }
  };

  items.forEach(extractDates);

  if (dates.length === 0) return null;

  const start = new Date(Math.min(...dates.map((d) => d.getTime())));
  const end = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Add padding (7 days before and after)
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

/**
 * Calculate position for a date range
 */
export function calculateItemPosition(
  item: GanttItem,
  timelineStart: Date,
  pixelsPerDay: number
): GanttPosition | null {
  if (!item.start_date || !item.end_date) return null;

  const startDate = new Date(item.start_date);
  const endDate = new Date(item.end_date);

  const daysFromStart = Math.floor(
    (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const x = daysFromStart * pixelsPerDay;
  const width = duration * pixelsPerDay;
  const progressWidth = width * (item.progress_percentage / 100);

  return { x, width, progressWidth };
}

/**
 * Format date for timeline header
 */
export function formatDateForTimeline(date: Date, zoomLevel: ZoomLevel): string {
  switch (zoomLevel) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week':
      return `Week ${getWeekNumber(date)}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'quarter':
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    default:
      return date.toLocaleDateString();
  }
}

/**
 * Get week number of year
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Generate timeline dates for header
 */
export function generateTimelineDates(start: Date, end: Date, zoomLevel: ZoomLevel): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  switch (zoomLevel) {
    case 'day':
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      break;
    case 'week':
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7);
      }
      break;
    case 'month':
      while (current <= end) {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
      break;
    case 'quarter':
      while (current <= end) {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + 3);
      }
      break;
  }

  return dates;
}

/**
 * Get today's position in timeline
 */
export function getTodayPosition(timelineStart: Date, pixelsPerDay: number): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < timelineStart) return null;

  const daysFromStart = Math.floor(
    (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysFromStart * pixelsPerDay;
}

/**
 * Get Monday (week-commencing) for a given date.
 * ISO week: Monday = 1.
 */
export function getWeekCommencing(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  const day = m.getDay();
  const diff = m.getDate() - day + (day === 0 ? -6 : 1);
  m.setDate(diff);
  return m;
}

/**
 * Generate week-commencing (Monday) dates between start and end.
 * Fallback when calendar schema is unavailable.
 */
export function getWeekCommencingDates(start: Date, end: Date): Date[] {
  const mondays: Date[] = [];
  const d = getWeekCommencing(start);
  const endTime = end.getTime();
  while (d.getTime() <= endTime) {
    mondays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
}

/**
 * Format week-commencing for display: "WC 27 Jan 2025"
 */
export function formatWeekCommencing(date: Date): string {
  return `WC ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Format week-commencing for timeline row: "dd-mm" (e.g. "03-11"). */
export function formatWeekCommencingDDMM(date: Date): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  return `${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`;
}

export interface WorkstreamTimelineDates {
  start_date: string | null;
  end_date: string | null;
  actual_end_date?: string | null;
}

/**
 * Date range for timeline using Planned Start, Planned End, and Actual End.
 * Use this for workstream Gantt/timeline range and week-commencing.
 */
export function getWorkstreamTimelineRange(
  items: WorkstreamTimelineDates[]
): { start: Date; end: Date } | null {
  const dates: Date[] = [];
  for (const it of items) {
    if (it.start_date) dates.push(new Date(it.start_date));
    if (it.end_date) dates.push(new Date(it.end_date));
    if (it.actual_end_date) dates.push(new Date(it.actual_end_date));
  }
  if (dates.length === 0) return null;
  const start = new Date(Math.min(...dates.map((d) => d.getTime())));
  const end = new Date(Math.max(...dates.map((d) => d.getTime())));
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

/** Effective end for bar: max(planned end, actual end). */
export function getEffectiveEnd(
  endDate: string | null,
  actualEndDate?: string | null
): string | null {
  if (!endDate && !actualEndDate) return null;
  if (!endDate) return actualEndDate ?? null;
  if (!actualEndDate) return endDate;
  return new Date(actualEndDate) > new Date(endDate) ? actualEndDate : endDate;
}

/** Parse "YYYY-MM-DD" as local midnight (avoids UTC parse shifting dates). */
function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** True if the week (Mon–Sun) containing wcDate contains d. */
export function weekContainsDate(wcDate: string, d: Date): boolean {
  const mon = parseLocalDate(wcDate);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  const t = d.getTime();
  return t >= mon.getTime() && t <= sun.getTime();
}

/**
 * Position of today in timeline as percent (0–100).
 * timelineStart: first week Monday 00:00, timelineEnd: last week Sunday 23:59.
 * Uses today at 00:00:00 for consistent date-only positioning.
 */
export function getTodayPositionInTimeline(
  timelineStart: Date,
  timelineEnd: Date
): { percent: number; visible: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(timelineStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(timelineEnd);
  end.setHours(23, 59, 59, 999);
  const t = today.getTime();
  const s = start.getTime();
  const e = end.getTime();
  if (t < s) return { percent: 0, visible: true };
  if (t > e) return { percent: 100, visible: true };
  const total = e - s;
  const fromStart = t - s;
  const percent = Math.max(0, Math.min(100, (fromStart / total) * 100));
  return { percent, visible: true };
}

/**
 * Day-of-week index (Mon=0 .. Sun=6) for a given date.
 */
function getDayOffsetInWeek(d: Date): number {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
}

/**
 * Today's position in timeline using discrete week columns.
 * Returns the week index and day-within-week (Mon=0..Sun=6) so the line can be
 * drawn only over the today-week column at the correct day offset.
 * weeks: array of { date: string } (week-commencing YYYY-MM-DD).
 */
export function getTodayPositionInTimelineFromWeeks(weeks: { date: string }[]): {
  weekIndex: number;
  dayOffset: number;
  visible: boolean;
} | null {
  if (!weeks.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstMon = parseLocalDate(weeks[0].date);
  firstMon.setHours(0, 0, 0, 0);
  const lastMon = parseLocalDate(weeks[weeks.length - 1].date);
  const lastSun = new Date(lastMon);
  lastSun.setDate(lastSun.getDate() + 6);
  lastSun.setHours(23, 59, 59, 999);
  const t = today.getTime();
  if (t < firstMon.getTime()) return { weekIndex: 0, dayOffset: 0, visible: true };
  if (t > lastSun.getTime()) return { weekIndex: weeks.length - 1, dayOffset: 6, visible: true };
  for (let i = 0; i < weeks.length; i++) {
    if (weekContainsDate(weeks[i].date, today)) {
      const dayOffset = getDayOffsetInWeek(today);
      return { weekIndex: i, dayOffset, visible: true };
    }
  }
  return { weekIndex: 0, dayOffset: 0, visible: true };
}

/**
 * Day index within week (Mon=0 .. Sun=6) for actual end date.
 * Used to position black "actual end" segment: Mon → start of block, Sun → end of block.
 */
export function getActualEndDayOffset(actualEndDate: string): number {
  const d = new Date(actualEndDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return (day + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
}
