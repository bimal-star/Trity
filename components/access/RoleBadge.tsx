'use client';

import { User, Shield, ShieldAlert } from 'lucide-react';
import { getRoleInfo } from '@/lib/permissions';
import { TenantRole } from '@/types/access';

interface RoleBadgeProps {
  role: TenantRole | string | null | undefined;
  size?: 'sm' | 'md';
}

const ROLE_STYLES: Record<string, string> = {
  member: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  admin: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  super_admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

const ROLE_ICONS: Record<string, typeof User> = {
  member: User,
  admin: Shield,
  super_admin: ShieldAlert,
};

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const roleInfo = getRoleInfo(role ?? 'member');
  const className = ROLE_STYLES[roleInfo.role] ?? ROLE_STYLES.member;
  const sizeClass = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[11px] px-2 py-0.5';
  const Icon = ROLE_ICONS[roleInfo.role] ?? User;

  return (
    <span
      title={roleInfo.description}
      className={`inline-flex items-center gap-1 rounded-full font-medium ${className} ${sizeClass}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {roleInfo.label}
    </span>
  );
}
