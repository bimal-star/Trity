import { LayoutSkeleton } from '@/components/LayoutSkeleton';

/** Shown during slow route segment transitions (App Router). */
export default function Loading() {
  return <LayoutSkeleton />;
}
