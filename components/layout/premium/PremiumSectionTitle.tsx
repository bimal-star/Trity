import { premiumTypography } from '@/lib/premiumUi';

export default function PremiumSectionTitle({
  children,
  className = '',
  as: Tag = 'h2',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return <Tag className={`${premiumTypography.sectionTitle} ${className}`.trim()}>{children}</Tag>;
}
