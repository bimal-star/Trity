import { describe, expect, it } from 'vitest';
import {
  getDirectChildren,
  getNextChildPosition,
  renumberNavigationPositions,
} from './navigation-hierarchy';

describe('getDirectChildren', () => {
  it('returns only one-level children of a parent', () => {
    const items = [
      { id: 'r', position: '1' },
      { id: 'a', position: '1.1' },
      { id: 'b', position: '1.2' },
      { id: 'c', position: '1.2.1' },
    ];
    const d = getDirectChildren('1', items);
    expect(d.map((x) => x.position)).toEqual(['1.1', '1.2']);
  });

  it('returns roots when parent is null', () => {
    const items = [
      { id: 'a', position: '1' },
      { id: 'b', position: '1.1' },
      { id: 'c', position: '2' },
    ];
    const roots = getDirectChildren(null, items);
    expect(roots.map((x) => x.position).sort()).toEqual(['1', '2']);
  });
});

describe('getNextChildPosition', () => {
  it('does not use deeper descendants to compute next index under parent', () => {
    const items = [
      { id: 'a', position: '2.2.2' },
      { id: 'b', position: '2.2.2.1' },
      { id: 'c', position: '2.1' },
    ];
    expect(getNextChildPosition('2', items)).toBe('2.2');
  });

  it('returns parent.1 when there are no direct children', () => {
    const items = [{ id: 'x', position: '1.2.3' }];
    expect(getNextChildPosition('1', items)).toBe('1.1');
  });

  it('returns max direct sibling index + 1', () => {
    const items = [
      { id: 'a', position: '1.1' },
      { id: 'b', position: '1.2' },
    ];
    expect(getNextChildPosition('1', items)).toBe('1.3');
  });
});

describe('renumberNavigationPositions', () => {
  it('places active rows first then soft-deleted under same parent (closes gaps)', () => {
    const items = [
      { id: 'p', position: '1', label: 'P' },
      { id: 'del', position: '1.1', is_deleted: true, label: 'Del' },
      { id: 'b', position: '1.2', label: 'B' },
      { id: 'c', position: '1.3', label: 'C' },
    ];
    const updates = renumberNavigationPositions(items);
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.position]));
    expect(byId.b).toBe('1.1');
    expect(byId.c).toBe('1.2');
    expect(byId.del).toBe('1.3');
    expect(byId.p).toBeUndefined();
  });

  it('returns empty when positions already match canonical order', () => {
    const items = [
      { id: 'p', position: '1' },
      { id: 'a', position: '1.1' },
      { id: 'b', position: '1.2' },
    ];
    expect(renumberNavigationPositions(items)).toEqual([]);
  });

  it('renumbers descendants when parent index shifts', () => {
    const items = [
      { id: 'p', position: '1' },
      { id: 'skip', position: '1.1', is_deleted: true },
      { id: 'a', position: '1.2' },
      { id: 'child', position: '1.2.1' },
    ];
    const updates = renumberNavigationPositions(items);
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.position]));
    expect(byId.a).toBe('1.1');
    expect(byId.child).toBe('1.1.1');
    expect(byId.skip).toBe('1.2');
  });
});
