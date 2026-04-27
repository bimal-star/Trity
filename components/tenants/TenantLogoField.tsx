'use client';

import LogoUrlField from '@/components/common/LogoUrlField';
import { uploadTenantLogo } from '@/lib/tenantLogoStorage';

export interface TenantLogoFieldProps {
  logoUrl: string | null | undefined;
  onLogoUrlChange: (url: string | null) => void;
  disabled?: boolean;
  /** Omit: use current workspace tenant. `null`: uploads disabled (e.g. create-tenant form). */
  storageTenantId?: string | null;
  label?: string;
  labelClassName?: string;
  uploadDisabledHint?: string;
}

const TENANT_LOGO_READY_HINT =
  'JPEG, PNG, WebP, or GIF. Stored in Supabase Storage (tenant-logos bucket).';

export default function TenantLogoField({
  logoUrl,
  onLogoUrlChange,
  disabled,
  storageTenantId,
  label = 'Logo',
  labelClassName,
  uploadDisabledHint,
}: TenantLogoFieldProps) {
  return (
    <LogoUrlField
      logoUrl={logoUrl}
      onLogoUrlChange={onLogoUrlChange}
      uploadFile={(_tid, file) => uploadTenantLogo(_tid, file)}
      label={label}
      disabled={disabled}
      storageTenantId={storageTenantId}
      labelClassName={labelClassName}
      uploadDisabledHint={uploadDisabledHint}
      uploadReadyHint={TENANT_LOGO_READY_HINT}
    />
  );
}
