import { uploadPublicEntityLogo } from '@/lib/entityLogoStorage';

export const TENANT_LOGOS_BUCKET = 'tenant-logos';

/** Path: `{tenantId}/{uuid}.{ext}` in public bucket `tenant-logos`. */
export async function uploadTenantLogo(tenantId: string, file: File): Promise<string> {
  return uploadPublicEntityLogo(TENANT_LOGOS_BUCKET, tenantId, file);
}
