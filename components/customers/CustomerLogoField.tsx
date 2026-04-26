'use client';

import LogoUrlField from '@/components/common/LogoUrlField';
import { uploadCustomerLogo } from '@/lib/customerLogoStorage';

export interface CustomerLogoFieldProps {
  logoUrl: string | null | undefined;
  onLogoUrlChange: (url: string | null) => void;
  disabled?: boolean;
}

export default function CustomerLogoField(props: CustomerLogoFieldProps) {
  return (
    <LogoUrlField {...props} uploadFile={(tenantId, file) => uploadCustomerLogo(tenantId, file)} />
  );
}
