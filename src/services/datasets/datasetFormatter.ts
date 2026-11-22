// ── Cell / metric values ─────────────────────────────────────────────

export function formatDatasetValue(val: unknown, maximumFractionDigits = 3): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return val.toLocaleString();
        return val.toLocaleString(undefined, { maximumFractionDigits });
    }
    return formatDatasetText(val);
}

export function formatDatasetText(value: unknown): string {
    if (Array.isArray(value)) return value.map(item => item == null ? '' : formatDatasetText(item)).join(',');
    if (value instanceof Date) return value.toString();
    if (value !== null && typeof value === 'object') {
        try {
            return JSON.stringify(value) ?? '';
        } catch {
            // Unserializable structured values do not have a readable label.
            return '';
        }
    }
    return String(value);
}

// ── Field keys as human-readable labels ──────────────────────────────

export function formatDatasetLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').trim();
}
