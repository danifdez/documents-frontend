// Lightweight URL→response cache backed by localStorage.
// Used as a write-through cache for GETs so the app keeps "half working"
// when the backend goes offline and the structured offline cache (entity
// patterns) doesn't cover the endpoint.
//
// Quota: localStorage is ~5–10 MB per origin. We track total size and
// evict the oldest entries when exceeded.

const KEY_PREFIX = 'urlcache:';
const META_KEY = 'urlcache:_meta';
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB ceiling, leaves headroom

interface Meta {
    // key → { ts, size }
    entries: Record<string, { ts: number; size: number }>;
    totalSize: number;
}

function loadMeta(): Meta {
    try {
        const raw = localStorage.getItem(META_KEY);
        if (!raw) return { entries: {}, totalSize: 0 };
        return JSON.parse(raw);
    } catch {
        return { entries: {}, totalSize: 0 };
    }
}

function saveMeta(meta: Meta): void {
    try {
        localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch {
        // Ignore — we'll be off by a bit on size accounting.
    }
}

function makeKey(wsId: string, method: string, url: string): string {
    return `${KEY_PREFIX}${wsId}:${method.toLowerCase()}:${url}`;
}

function evictUntilFits(meta: Meta, neededBytes: number): void {
    if (meta.totalSize + neededBytes <= MAX_BYTES) return;
    const sorted = Object.entries(meta.entries).sort((a, b) => a[1].ts - b[1].ts);
    for (const [key, info] of sorted) {
        if (meta.totalSize + neededBytes <= MAX_BYTES) break;
        try {
            localStorage.removeItem(key);
        } catch { /* ignore */ }
        meta.totalSize -= info.size;
        delete meta.entries[key];
    }
}

export function setUrlCache(wsId: string, method: string, url: string, data: any): void {
    try {
        const key = makeKey(wsId, method, url);
        const value = JSON.stringify({ data, ts: Date.now() });
        const size = value.length;

        const meta = loadMeta();
        const existing = meta.entries[key];
        if (existing) {
            meta.totalSize -= existing.size;
        }
        evictUntilFits(meta, size);

        localStorage.setItem(key, value);
        meta.entries[key] = { ts: Date.now(), size };
        meta.totalSize += size;
        saveMeta(meta);
    } catch {
        // Quota exceeded or serialization failed — silently skip caching.
    }
}

export function getUrlCache(wsId: string, method: string, url: string): any | undefined {
    try {
        const key = makeKey(wsId, method, url);
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        return parsed.data;
    } catch {
        return undefined;
    }
}

export function clearUrlCache(wsId?: string): void {
    try {
        const meta = loadMeta();
        const prefix = wsId ? `${KEY_PREFIX}${wsId}:` : KEY_PREFIX;
        for (const key of Object.keys(meta.entries)) {
            if (key.startsWith(prefix)) {
                try { localStorage.removeItem(key); } catch { /* ignore */ }
                meta.totalSize -= meta.entries[key].size;
                delete meta.entries[key];
            }
        }
        if (!wsId) {
            localStorage.removeItem(META_KEY);
        } else {
            saveMeta(meta);
        }
    } catch { /* ignore */ }
}
