import { uploadPublicEntityLogo } from '@/lib/entityLogoStorage';

export const CUSTOMER_LOGOS_BUCKET = 'customer-logos';

export async function uploadCustomerLogo(tenantId: string, file: File): Promise<string> {
  return uploadPublicEntityLogo(CUSTOMER_LOGOS_BUCKET, tenantId, file);
}
