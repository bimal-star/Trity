import { describe, expect, it, vi } from 'vitest';
import { createToastStore } from '@/lib/toastStore';

describe('toast store', () => {
  it('enqueues toasts with monotonic ids and notifies subscribers', () => {
    const store = createToastStore();
    const seen: number[] = [];
    const unsubscribe = store.subscribe((toasts) => seen.push(toasts.length));

    const id1 = store.add({ variant: 'success', message: 'A' });
    const id2 = store.add({ variant: 'error', message: 'B' });

    expect(id1).toBe(1);
    expect(id2).toBe(2);
    expect(store.getToasts()).toHaveLength(2);
    expect(seen).toEqual([1, 2]);

    unsubscribe();
  });

  it('applies per-variant default durations and allows overrides', () => {
    const store = createToastStore({
      defaults: { success: 1000, error: 5000, info: 2000, warning: 3000 },
      now: () => 0,
    });

    const okId = store.add({ variant: 'success', message: 'ok' });
    const errId = store.add({ variant: 'error', message: 'fail' });
    const warnId = store.add({ variant: 'warning', message: 'warn' });
    const stickyId = store.add({
      variant: 'info',
      message: 'sticky',
      duration: null,
    });
    const customId = store.add({
      variant: 'info',
      message: 'custom',
      duration: 250,
    });

    const toasts = store.getToasts();
    expect(toasts.find((t) => t.id === okId)?.duration).toBe(1000);
    expect(toasts.find((t) => t.id === errId)?.duration).toBe(5000);
    expect(toasts.find((t) => t.id === warnId)?.duration).toBe(3000);
    expect(toasts.find((t) => t.id === stickyId)?.duration).toBeNull();
    expect(toasts.find((t) => t.id === customId)?.duration).toBe(250);
  });

  it('defaults error and warning to manual dismiss', () => {
    const store = createToastStore({ now: () => 0 });
    const errId = store.add({ variant: 'error', message: 'fail' });
    const warnId = store.add({ variant: 'warning', message: 'warn' });
    const successId = store.add({ variant: 'success', message: 'ok' });
    const infoId = store.add({ variant: 'info', message: 'note' });
    const toasts = store.getToasts();
    expect(toasts.find((t) => t.id === errId)?.duration).toBeNull();
    expect(toasts.find((t) => t.id === warnId)?.duration).toBeNull();
    expect(toasts.find((t) => t.id === successId)?.duration).toBe(4000);
    expect(toasts.find((t) => t.id === infoId)?.duration).toBe(4000);
  });

  it('prunes expired toasts and leaves sticky ones in place', () => {
    let t = 0;
    const store = createToastStore({
      defaults: { success: 100, error: 100, info: 100 },
      now: () => t,
    });

    const expiring = store.add({ variant: 'success', message: 'gone soon' });
    const sticky = store.add({
      variant: 'info',
      message: 'stay',
      duration: null,
    });

    t = 150;
    const pruned = store.pruneExpired(t);
    expect(pruned.map((p) => p.id)).toEqual([expiring]);
    expect(store.getToasts().map((x) => x.id)).toEqual([sticky]);
  });

  it('dismisses a single toast by id and clears all when no id given', () => {
    const store = createToastStore();
    const a = store.add({ variant: 'success', message: 'A' });
    const b = store.add({ variant: 'success', message: 'B' });
    const c = store.add({ variant: 'success', message: 'C' });

    store.dismiss(b);
    expect(store.getToasts().map((t) => t.id)).toEqual([a, c]);

    store.dismiss();
    expect(store.getToasts()).toHaveLength(0);
  });

  it('is a no-op when dismissing an unknown id', () => {
    const store = createToastStore();
    const listener = vi.fn();
    const id = store.add({ variant: 'success', message: 'A' });
    store.subscribe(listener);

    store.dismiss(9999);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getToasts().map((t) => t.id)).toEqual([id]);
  });

  it('trims oldest toasts when the max stack is exceeded', () => {
    const store = createToastStore({ maxStack: 3 });
    for (let i = 0; i < 5; i++) {
      store.add({ variant: 'info', message: `m${i}` });
    }
    const messages = store.getToasts().map((t) => t.message);
    expect(messages).toEqual(['m2', 'm3', 'm4']);
  });

  it('peekNextExpiry returns the earliest scheduled dismiss time', () => {
    let t = 0;
    const store = createToastStore({ now: () => t });

    expect(store.peekNextExpiry()).toBeNull();

    store.add({ variant: 'success', message: 'first', duration: 500 });
    t = 10;
    store.add({ variant: 'info', message: 'second', duration: 200 });

    expect(store.peekNextExpiry()).toBe(210);
  });
});
