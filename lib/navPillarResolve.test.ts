import { describe, expect, it } from 'vitest';
import { enabledSectionChildren, pillarSectionRowItems } from './navPillarResolve';
import type { NavigationItem } from '@/types/navigation';

describe('pillarSectionRowItems', () => {
  it('lists direct children by position when root.children is empty but positions nest under root', () => {
    const executionRoot: NavigationItem = {
      id: 'exec-root',
      label: 'Execution',
      position: '3',
      is_enabled: true,
      path: null,
      children: [],
    };
    const placeholder: NavigationItem = {
      id: 'ph',
      label: 'Future module',
      position: '3.1',
      is_enabled: true,
      path: null,
    };
    const navigationItems: NavigationItem[] = [executionRoot, placeholder];

    const row = pillarSectionRowItems(navigationItems, 'Execution');
    expect(row.map((r) => r.id)).toEqual(['ph']);
  });
});

describe('enabledSectionChildren', () => {
  it('resolves flyout items by position when section row has no nested children', () => {
    const productSection: NavigationItem = {
      id: 'product',
      label: 'Product',
      position: '1.2',
      is_enabled: true,
      path: '/products',
      children: [],
    };
    const priceList: NavigationItem = {
      id: 'pl',
      label: 'Price List',
      position: '1.2.1',
      is_enabled: true,
      path: '/price-lists',
    };
    const bom: NavigationItem = {
      id: 'bom',
      label: 'Bills of Materials',
      position: '1.2.2',
      is_enabled: true,
      path: '/boms',
    };
    const navigationItems: NavigationItem[] = [productSection, priceList, bom];

    const children = enabledSectionChildren(productSection, navigationItems);
    expect(children.map((c) => c.id)).toEqual(['pl', 'bom']);
  });
});
