import { uploadPublicEntityLogo } from '@/lib/entityLogoStorage';

export const WAREHOUSE_LOGOS_BUCKET = 'warehouse-logos';

export async function uploadWarehouseLogo(tenantId: string, file: File): Promise<string> {
  return uploadPublicEntityLogo(WAREHOUSE_LOGOS_BUCKET, tenantId, file);
}
