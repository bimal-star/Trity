/**
 * Status display config (label + colours) for workstreams.
 * Use across Workstreams page and WorkstreamTableWithGantt.
 */

export const workstreamStatusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  not_started: { label: 'Not Started', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800' },
  in_progress: { label: 'In Progress', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  completed: { label: 'Completed', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  blocked: { label: 'Blocked', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
};

export function getWorkstreamStatus(s: string) {
  return workstreamStatusConfig[s] ?? { label: s, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-800' };
}
