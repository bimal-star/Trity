/**
 * Audit logging utilities for tracking tenant and user changes
 * 
 * Logs all significant actions (user creation, role changes, tenant updates)
 * for compliance and security audit trails
 */

import { supabase } from '@/lib/supabaseClient';

export interface AuditLogEntry {
  id?: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string;
}

/**
 * Log an action for audit trail
 * @param entry - Audit log entry to save
 * @returns Promise with result or error
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<{ success: boolean; error?: string }> {
  try {
    // Capture additional metadata
    const metadata = {
      tenant_id: entry.tenant_id,
      user_id: entry.user_id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      changes: (entry.changes || null) as any, // Cast to Json
      ip_address: entry.ip_address || null,
      // Prefer caller-supplied user_agent (pass from request.headers on API routes); fall back to
      // navigator.userAgent only in browser contexts where no explicit value was provided.
      user_agent:
        entry.user_agent !== undefined
          ? (entry.user_agent ?? null)
          : typeof navigator !== 'undefined'
            ? navigator.userAgent
            : null,
    };

    // Try to insert into audit_logs table
    const { error, data } = await supabase
      .from('audit_logs')
      .insert([metadata])
      .select();

    if (error) {
      // Table might not exist yet or RLS policy issue - log to console
      console.warn('Audit log insert failed:', error.message);
      console.warn('Audit action details:', metadata);
      return { success: true }; // Don't fail the app because audit log failed
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to log audit action:', message);
    return { success: true }; // Don't fail the app
  }
}

/**
 * Log user role change
 */
export async function logUserRoleChange(
  tenantId: string,
  changedUserId: string,
  previousRole: string,
  newRole: string,
  changedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: changedByUserId,
    action: 'user_role_changed',
    resource_type: 'user',
    resource_id: changedUserId,
    changes: {
      previous_role: previousRole,
      new_role: newRole,
    },
  });
}

/**
 * Log user invitation
 */
export async function logUserInvited(
  tenantId: string,
  invitedEmail: string,
  role: string,
  invitedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: invitedByUserId,
    action: 'user_invited',
    resource_type: 'user',
    resource_id: invitedEmail,
    changes: {
      email: invitedEmail,
      role: role,
    },
  });
}

/**
 * Log user removal from tenant
 */
export async function logUserRemoved(
  tenantId: string,
  removedUserId: string,
  removedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: removedByUserId,
    action: 'user_removed',
    resource_type: 'user',
    resource_id: removedUserId,
  });
}

/**
 * Log tenant creation
 */
export async function logTenantCreated(
  tenantId: string,
  tenantName: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'tenant_created',
    resource_type: 'tenant',
    resource_id: tenantId,
    changes: {
      name: tenantName,
    },
  });
}

/**
 * Log tenant update
 */
export async function logTenantUpdated(
  tenantId: string,
  changes: Record<string, unknown>,
  updatedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'tenant_updated',
    resource_type: 'tenant',
    resource_id: tenantId,
    changes,
  });
}

/**
 * Log group creation
 */
export async function logGroupCreated(
  tenantId: string,
  groupId: string,
  groupName: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'group_created',
    resource_type: 'group',
    resource_id: groupId,
    changes: {
      name: groupName,
    },
  });
}

/**
 * Log group member added
 */
export async function logGroupMemberAdded(
  tenantId: string,
  groupId: string,
  userId: string,
  role: string,
  addedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: addedByUserId,
    action: 'group_member_added',
    resource_type: 'group',
    resource_id: groupId,
    changes: {
      member_user_id: userId,
      member_role: role,
    },
  });
}

// ============================================================================
// CALENDAR AUDIT LOGGING FUNCTIONS
// ============================================================================

/**
 * Log calendar event creation
 */
export async function logCalendarEventCreated(
  tenantId: string,
  eventId: string,
  eventName: string,
  eventDate: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'calendar_event_created',
    resource_type: 'calendar_event',
    resource_id: eventId,
    changes: {
      event_name: eventName,
      event_date: eventDate,
    },
  });
}

/**
 * Log calendar event update
 */
export async function logCalendarEventUpdated(
  tenantId: string,
  eventId: string,
  changes: Record<string, unknown>,
  updatedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'calendar_event_updated',
    resource_type: 'calendar_event',
    resource_id: eventId,
    changes,
  });
}

/**
 * Log calendar event deletion
 */
export async function logCalendarEventDeleted(
  tenantId: string,
  eventId: string,
  eventName: string,
  deletedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: deletedByUserId,
    action: 'calendar_event_deleted',
    resource_type: 'calendar_event',
    resource_id: eventId,
    changes: {
      event_name: eventName,
    },
  });
}

/**
 * Log calendar attendance change
 */
export async function logCalendarAttendanceChanged(
  tenantId: string,
  eventId: string,
  changes: Record<string, unknown>,
  changedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: changedByUserId,
    action: 'calendar_attendance_changed',
    resource_type: 'calendar_event',
    resource_id: eventId,
    changes,
  });
}

// ============================================================================
// PRODUCTS AUDIT LOGGING FUNCTIONS
// ============================================================================

/**
 * Log product creation
 */
export async function logProductCreated(
  tenantId: string,
  productId: string,
  productName: string,
  sku: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'product_created',
    resource_type: 'product',
    resource_id: productId,
    changes: {
      product_name: productName,
      sku: sku,
    },
  });
}

/**
 * Log product update
 */
export async function logProductUpdated(
  tenantId: string,
  productId: string,
  changes: Record<string, unknown>,
  updatedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'product_updated',
    resource_type: 'product',
    resource_id: productId,
    changes,
  });
}

/**
 * Log product deletion
 */
export async function logProductDeleted(
  tenantId: string,
  productId: string,
  productName: string,
  deletedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: deletedByUserId,
    action: 'product_deleted',
    resource_type: 'product',
    resource_id: productId,
    changes: {
      product_name: productName,
    },
  });
}

/**
 * Log bulk product import
 */
export async function logProductsImported(
  tenantId: string,
  importId: string,
  count: number,
  source: string,
  importedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: importedByUserId,
    action: 'products_imported',
    resource_type: 'product_import',
    resource_id: importId,
    changes: {
      count: count,
      source: source,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log inventory change (quantity update)
 */
export async function logInventoryChanged(
  tenantId: string,
  productId: string,
  previousQuantity: number,
  newQuantity: number,
  reason: string,
  changedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: changedByUserId,
    action: 'inventory_changed',
    resource_type: 'product',
    resource_id: productId,
    changes: {
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      quantity_delta: newQuantity - previousQuantity,
      reason: reason,
    },
  });
}

// ============================================================================
// WORKSTREAMS AUDIT LOGGING FUNCTIONS
// ============================================================================

/**
 * Log workstream creation
 */
export async function logWorkstreamCreated(
  tenantId: string,
  workstreamId: string,
  workstreamName: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'workstream_created',
    resource_type: 'workstream',
    resource_id: workstreamId,
    changes: {
      workstream_name: workstreamName,
    },
  });
}

/**
 * Log workstream update
 */
export async function logWorkstreamUpdated(
  tenantId: string,
  workstreamId: string,
  changes: Record<string, unknown>,
  updatedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'workstream_updated',
    resource_type: 'workstream',
    resource_id: workstreamId,
    changes,
  });
}

/**
 * Log workstream deletion
 */
export async function logWorkstreamDeleted(
  tenantId: string,
  workstreamId: string,
  workstreamName: string,
  deletedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: deletedByUserId,
    action: 'workstream_deleted',
    resource_type: 'workstream',
    resource_id: workstreamId,
    changes: {
      workstream_name: workstreamName,
    },
  });
}

/**
 * Log workstream status change
 */
export async function logWorkstreamStatusChanged(
  tenantId: string,
  workstreamId: string,
  previousStatus: string,
  newStatus: string,
  changedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: changedByUserId,
    action: 'workstream_status_changed',
    resource_type: 'workstream',
    resource_id: workstreamId,
    changes: {
      previous_status: previousStatus,
      new_status: newStatus,
    },
  });
}

/**
 * Log milestone update
 */
export async function logMilestoneUpdated(
  tenantId: string,
  workstreamId: string,
  milestoneName: string,
  completionDate: string,
  updatedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'milestone_updated',
    resource_type: 'milestone',
    resource_id: `${workstreamId}-milestone`,
    changes: {
      milestone_name: milestoneName,
      completion_date: completionDate,
    },
  });
}

/**
 * Log task creation
 */
export async function logTaskCreated(
  tenantId: string,
  taskId: string,
  workstreamId: string,
  taskName: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'task_created',
    resource_type: 'task',
    resource_id: taskId,
    changes: {
      task_name: taskName,
      workstream_id: workstreamId,
    },
  });
}

/**
 * Log task status change
 */
export async function logTaskStatusChanged(
  tenantId: string,
  taskId: string,
  previousStatus: string,
  newStatus: string,
  changedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: changedByUserId,
    action: 'task_status_changed',
    resource_type: 'task',
    resource_id: taskId,
    changes: {
      previous_status: previousStatus,
      new_status: newStatus,
    },
  });
}

/**
 * Customer Audit Logging (multi-tenant customer management)
 */

/**
 * Log customer creation
 */
export async function logCustomerCreated(
  tenantId: string,
  customerId: string,
  email: string,
  legalName: string | null,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'customer_created',
    resource_type: 'customer',
    resource_id: customerId,
    changes: {
      email,
      legal_name: legalName,
      status: 'active',
    },
  });
}

/**
 * Log customer update with before/after delta
 */
export async function logCustomerUpdated(
  tenantId: string,
  customerId: string,
  previousData: Record<string, any>,
  newData: Record<string, any>,
  updatedByUserId: string | null
): Promise<void> {
  const delta: Record<string, any> = {};
  
  Object.keys(newData).forEach((key) => {
    if (previousData[key] !== newData[key]) {
      delta[key] = {
        before: previousData[key],
        after: newData[key],
      };
    }
  });

  if (Object.keys(delta).length === 0) return; // No changes

  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'customer_updated',
    resource_type: 'customer',
    resource_id: customerId,
    changes: delta,
  });
}

/**
 * Log customer status change (active/inactive/archived)
 */
export async function logCustomerStatusChanged(
  tenantId: string,
  customerId: string,
  previousStatus: string,
  newStatus: string,
  changedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: changedByUserId,
    action: 'customer_status_changed',
    resource_type: 'customer',
    resource_id: customerId,
    changes: {
      previous_status: previousStatus,
      new_status: newStatus,
    },
  });
}

/**
 * Log customer archive (soft delete)
 */
export async function logCustomerArchived(
  tenantId: string,
  customerId: string,
  archivedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: archivedByUserId,
    action: 'customer_archived',
    resource_type: 'customer',
    resource_id: customerId,
    changes: {
      deleted_at: new Date().toISOString(),
      status: 'archived',
    },
  });
}

export async function logCustomerRestored(
  tenantId: string,
  customerId: string,
  restoredByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: restoredByUserId,
    action: 'customer_restored',
    resource_type: 'customer',
    resource_id: customerId,
    changes: { deleted_at: null },
  });
}

export async function logCustomersImported(
  tenantId: string,
  count: number,
  importedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: importedByUserId,
    action: 'customers_imported',
    resource_type: 'customer_import',
    resource_id: `batch-${Date.now()}`,
    changes: { count, timestamp: new Date().toISOString() },
  });
}

export async function logProductArchived(
  tenantId: string,
  productId: string,
  productName: string,
  archivedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: archivedByUserId,
    action: 'product_archived',
    resource_type: 'product',
    resource_id: productId,
    changes: { product_name: productName, is_deleted: true },
  });
}

export async function logProductRestored(
  tenantId: string,
  productId: string,
  productName: string,
  restoredByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: restoredByUserId,
    action: 'product_restored',
    resource_type: 'product',
    resource_id: productId,
    changes: { product_name: productName, is_deleted: false },
  });
}

export async function logSupplierCreated(
  tenantId: string,
  supplierId: string,
  legalName: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'supplier_created',
    resource_type: 'supplier',
    resource_id: supplierId,
    changes: { legal_name: legalName },
  });
}

export async function logSupplierUpdated(
  tenantId: string,
  supplierId: string,
  changes: Record<string, unknown>,
  updatedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'supplier_updated',
    resource_type: 'supplier',
    resource_id: supplierId,
    changes,
  });
}

export async function logSupplierArchived(
  tenantId: string,
  supplierId: string,
  legalName: string,
  archivedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: archivedByUserId,
    action: 'supplier_archived',
    resource_type: 'supplier',
    resource_id: supplierId,
    changes: { legal_name: legalName },
  });
}

export async function logSupplierRestored(
  tenantId: string,
  supplierId: string,
  legalName: string,
  restoredByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: restoredByUserId,
    action: 'supplier_restored',
    resource_type: 'supplier',
    resource_id: supplierId,
    changes: { legal_name: legalName },
  });
}

export async function logSuppliersImported(
  tenantId: string,
  count: number,
  importedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: importedByUserId,
    action: 'suppliers_imported',
    resource_type: 'supplier_import',
    resource_id: `batch-${Date.now()}`,
    changes: { count, timestamp: new Date().toISOString() },
  });
}

export async function logWarehouseCreated(
  tenantId: string,
  warehouseId: string,
  name: string,
  createdByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: createdByUserId,
    action: 'warehouse_created',
    resource_type: 'warehouse',
    resource_id: warehouseId,
    changes: { name },
  });
}

export async function logWarehouseUpdated(
  tenantId: string,
  warehouseId: string,
  changes: Record<string, unknown>,
  updatedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: updatedByUserId,
    action: 'warehouse_updated',
    resource_type: 'warehouse',
    resource_id: warehouseId,
    changes,
  });
}

export async function logWarehouseArchived(
  tenantId: string,
  warehouseId: string,
  name: string,
  archivedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: archivedByUserId,
    action: 'warehouse_archived',
    resource_type: 'warehouse',
    resource_id: warehouseId,
    changes: { name },
  });
}

export async function logWarehouseRestored(
  tenantId: string,
  warehouseId: string,
  name: string,
  restoredByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: restoredByUserId,
    action: 'warehouse_restored',
    resource_type: 'warehouse',
    resource_id: warehouseId,
    changes: { name },
  });
}

export async function logWarehousesImported(
  tenantId: string,
  count: number,
  importedByUserId: string | null
): Promise<void> {
  await logAuditAction({
    tenant_id: tenantId,
    user_id: importedByUserId,
    action: 'warehouses_imported',
    resource_type: 'warehouse_import',
    resource_id: `batch-${Date.now()}`,
    changes: { count, timestamp: new Date().toISOString() },
  });
}
