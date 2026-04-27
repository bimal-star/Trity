'use client';

import { AccessLevel } from '@/types/access';

interface AccessLevelSelectProps {
  value: AccessLevel;
  onChange: (value: AccessLevel) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: AccessLevel; label: string }> = [
  { value: 'allowed', label: 'Allowed' },
  { value: 'readonly', label: 'Read only' },
  { value: 'blocked', label: 'Blocked' },
];

export function AccessLevelSelect({ value, onChange, disabled }: AccessLevelSelectProps) {
  return (
    <select
      aria-label="Access level"
      value={value}
      onChange={(event) => onChange(event.target.value as AccessLevel)}
      disabled={disabled}
      className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
