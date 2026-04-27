import { premiumSurfaces } from '@/lib/premiumUi';

export default function PremiumCard({
  elevated = false,
  className = '',
  children,
}: {
  elevated?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const base = elevated ? premiumSurfaces.cardElevated : premiumSurfaces.card;
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
}
