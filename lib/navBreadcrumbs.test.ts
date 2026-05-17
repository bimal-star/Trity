import { describe, expect, it } from 'vitest';
import {
  abbreviateNavBreadcrumbLabel,
  buildNavBreadcrumbs,
  compactNavBreadcrumbs,
  type NavBreadcrumbSegment,
} from './navBreadcrumbs';
import type { NavigationItem } from '@/types/navigation';

describe('abbreviateNavBreadcrumbLabel', () => {
  it('shortens known long nav labels', () => {
    expect(abbreviateNavBreadcrumbLabel('Business Core')).toBe('Core');
    expect(abbreviateNavBreadcrumbLabel('Purchase Management')).toBe('Purchase');
  });

  it('leaves unknown labels unchanged', () => {
    expect(abbreviateNavBreadcrumbLabel('Products')).toBe('Products');
  });
});

describe('compactNavBreadcrumbs', () => {
  it('abbreviates without collapsing a short trail', () => {
    const input: NavBreadcrumbSegment[] = [
      { href: '/', label: 'Home' },
      { href: '/x', label: 'Business Core' },
      { href: null, label: 'Purchase Management', current: true },
    ];
    expect(compactNavBreadcrumbs(input)).toEqual([
      { href: '/', label: 'Home' },
      { href: '/x', label: 'Core' },
      { href: null, label: 'Purchase', current: true },
    ]);
  });

  it('collapses middle segments when more than three items follow Home', () => {
    const input: NavBreadcrumbSegment[] = [
      { href: '/', label: 'Home' },
      { href: '/a', label: 'Business Core' },
      { href: '/b', label: 'Purchase Management' },
      { href: '/c', label: 'Purchase Orders' },
      { href: null, label: 'New purchase order', current: true },
    ];
    expect(compactNavBreadcrumbs(input)).toEqual([
      { href: '/', label: 'Home' },
      { href: '/a', label: 'Core' },
      { href: null, label: '…' },
      { href: null, label: 'New purchase order', current: true },
    ]);
  });
});

describe('buildNavBreadcrumbs', () => {
  it('abbreviates pillar and path tail when pathname is not in the nav tree', () => {
    const crumbs = buildNavBreadcrumbs(
      [{ id: 'p', label: 'Products', path: '/products', is_enabled: true }],
      '/purchase-orders/new',
      'Business Core',
      '/products'
    );
    expect(crumbs.map((c) => c.label)).toEqual(['Home', 'Core', 'new']);
  });
});
