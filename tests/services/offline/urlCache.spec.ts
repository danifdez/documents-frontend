import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUrlCache, setUrlCache } from '@/services/offline/urlCache';

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('offline URL cache', () => {
  it('scopes entries to the workspace and normalizes the HTTP method', () => {
    setUrlCache('archive', 'GET', '/resources/7', { title: 'Ledger', values: [1, 2] });
    setUrlCache('research', 'get', '/resources/7', { title: 'Index' });
    setUrlCache('archive', 'get', '/resources/7', { title: 'Updated ledger' });

    expect(getUrlCache('archive', 'get', '/resources/7')).toEqual({ title: 'Updated ledger' });
    expect(getUrlCache('research', 'GET', '/resources/7')).toEqual({ title: 'Index' });
    expect(getUrlCache('archive', 'post', '/resources/7')).toBeUndefined();
  });

  it('evicts the oldest entry once a new response exceeds the cache budget', () => {
    const now = vi.spyOn(Date, 'now');
    const response = 'x'.repeat(1_500_000);
    now.mockReturnValue(100);
    setUrlCache('archive', 'get', '/old', response);
    now.mockReturnValue(200);
    setUrlCache('archive', 'get', '/recent', response);
    now.mockReturnValue(300);
    setUrlCache('archive', 'get', '/new', response);

    expect(getUrlCache('archive', 'get', '/old')).toBeUndefined();
    expect(getUrlCache('archive', 'get', '/recent')).toBe(response);
    expect(getUrlCache('archive', 'get', '/new')).toBe(response);
  });

  it('recovers from malformed storage and ignores a response that cannot be serialized', () => {
    localStorage.setItem('urlcache:_meta', 'invalid');
    localStorage.setItem('urlcache:archive:get:/corrupted', 'invalid');
    expect(getUrlCache('archive', 'get', '/corrupted')).toBeUndefined();

    const cyclic = { parent: {} };
    cyclic.parent = cyclic;
    expect(() => setUrlCache('archive', 'get', '/cyclic', cyclic)).not.toThrow();
    expect(getUrlCache('archive', 'get', '/cyclic')).toBeUndefined();

    setUrlCache('archive', 'get', '/valid', [1]);
    expect(getUrlCache('archive', 'get', '/valid')).toEqual([1]);
  });
});
