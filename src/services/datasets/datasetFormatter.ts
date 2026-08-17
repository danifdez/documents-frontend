// ── Cell / metric values ─────────────────────────────────────────────

export function formatDatasetValue(val: unknown, maximumFractionDigits = 3): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return val.toLocaleString();
        return val.toLocaleString(undefined, { maximumFractionDigits });
    }
    return String(val);
}

// ── Field keys as human-readable labels ──────────────────────────────

export function formatDatasetLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}
