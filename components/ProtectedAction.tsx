/**
 * ProtectedAction Component
 * 
 * Wraps buttons or actions with permission checks
 * Automatically disables or hides buttons based on user permissions
 */

'use client';

import { ReactNode } from 'react';
import { PermissionAction, TenantRole } from '@/types/access';
import { usePermissions } from '@/hooks/usePermissions';

interface ProtectedActionProps {
  permission: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  hideIfDenied?: boolean;
  requireRole?: TenantRole;
}

/**
 * Conditionally render content based on user permissions
 * 
 * @example
 * <ProtectedAction permission="manage_users">
 *   <button>Manage Users</button>
 * </ProtectedAction>
 * 
 * <ProtectedAction 
 *   permission="manage_features" 
 *   hideIfDenied
 * >
 *   <button>Feature Settings</button>
 * </ProtectedAction>
 */
export function ProtectedAction({
  permission,
  children,
  fallback,
  hideIfDenied = false,
  requireRole,
}: ProtectedActionProps) {
  const { can, role, isLoading } = usePermissions();

  if (isLoading) {
    return fallback || null;
  }

  const hasPermission = can(permission);
  const hasRole = !requireRole || role === requireRole;
  const isAllowed = hasPermission && hasRole;

  if (!isAllowed && hideIfDenied) {
    return fallback || null;
  }

  return <>{isAllowed ? children : fallback}</>;
}

/**
 * ProtectedButton Component
 * 
 * Button that's automatically disabled based on permissions
 */
interface ProtectedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: PermissionAction;
  children: ReactNode;
  tooltipIfDenied?: string;
  requireRole?: TenantRole;
}

export function ProtectedButton({
  permission,
  children,
  tooltipIfDenied,
  requireRole,
  disabled,
  title,
  ...props
}: ProtectedButtonProps) {
  const { can, role, isLoading } = usePermissions();

  const hasPermission = can(permission);
  const hasRole = !requireRole || role === requireRole;
  const isAllowed = hasPermission && hasRole;

  const buttonDisabled = disabled || isLoading || !isAllowed;
  const buttonTitle = !isAllowed && tooltipIfDenied ? tooltipIfDenied : title;

  return (
    <button
      disabled={buttonDisabled}
      title={buttonTitle}
      {...props}
    >
      {children}
    </button>
  );
}
