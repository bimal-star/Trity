import { uploadPublicEntityLogo } from '@/lib/entityLogoStorage';

export const SUPPLIER_LOGOS_BUCKET = 'supplier-logos';

export async function uploadSupplierLogo(tenantId: string, file: File): Promise<string> {
  return uploadPublicEntityLogo(SUPPLIER_LOGOS_BUCKET, tenantId, file);
}
