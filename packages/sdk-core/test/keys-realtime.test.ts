import { describe, expect, it, vi } from 'vitest';
import { catalogKeys, createMemoryRealtimeSource, normalizeListQuery, viewerKeys, type ApiScope } from '../src/index';

const local: ApiScope = { environment: 'local', identity: 'anonymous' };

describe('query keys', () => {
  it('start with environment and identity', () => {
    expect(catalogKeys.itemDetail(local, 'item-1')).toEqual([
      'api',
      'local',
      'anonymous',
      'catalog',
      'items',
      'detail',
      'item-1',
    ]);
    expect(viewerKeys.current({ environment: 'staging', identity: 'user-1' })).toEqual([
      'api',
      'staging',
      'user-1',
      'viewer',
    ]);
  });

  it('never collide across environments or identities', () => {
    const keys = [
      catalogKeys.itemList(local, { q: 'a' }),
      catalogKeys.itemList({ ...local, environment: 'staging' }, { q: 'a' }),
      catalogKeys.itemList({ ...local, identity: 'user-1' }, { q: 'a' }),
    ].map((key) => JSON.stringify(key));
    expect(new Set(keys).size).toBe(3);
  });

  it('nest so one prefix invalidates a whole family', () => {
    const lists = catalogKeys.itemLists(local);
    const list = catalogKeys.itemList(local, { category: 'home' });
    expect(list.slice(0, lists.length)).toEqual(lists);
    expect(list.slice(0, catalogKeys.items(local).length)).toEqual(catalogKeys.items(local));
  });

  it('treat empty filters as absent', () => {
    expect(normalizeListQuery({ q: '  ', category: '', limit: 10, cursor: undefined })).toEqual({ limit: 10 });
    expect(normalizeListQuery({ q: ' lamp ' })).toEqual({ q: 'lamp' });
    expect(catalogKeys.itemList(local, { q: '' })).toEqual(catalogKeys.itemList(local));
  });
});

describe('memory realtime source (cleanup contract)', () => {
  it('delivers values until unsubscribed, then never again', () => {
    const source = createMemoryRealtimeSource();
    const next = vi.fn();
    const unsubscribe = source.subscribe('presence/1', { next });

    source.emit('presence/1', 1);
    unsubscribe();
    source.emit('presence/1', 2);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(1);
    expect(source.listenerCount()).toBe(0);
  });

  it('has idempotent, independent unsubscribes', () => {
    const source = createMemoryRealtimeSource();
    const a = vi.fn();
    const b = vi.fn();
    const stopA = source.subscribe('c', { next: a });
    source.subscribe('c', { next: b });

    stopA();
    stopA();
    source.emit('c', 'x');

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith('x');
    expect(source.listenerCount('c')).toBe(1);
  });

  it('skips a listener removed by another listener during the same emit', () => {
    const source = createMemoryRealtimeSource();
    const second = vi.fn();
    let stopSecond = () => {};
    source.subscribe('c', { next: () => stopSecond() });
    stopSecond = source.subscribe('c', { next: second });

    source.emit('c', 1);
    expect(second).not.toHaveBeenCalled();
  });

  it('closes subscriptions on error', () => {
    const source = createMemoryRealtimeSource();
    const error = vi.fn();
    source.subscribe('c', { next: () => {}, error });
    source.fail('c', new Error('lost'));
    expect(error).toHaveBeenCalledOnce();
    expect(source.listenerCount('c')).toBe(0);
  });
});
