export const MARK_TYPES = ['idea', 'important', 'review', 'highlight'] as const;

export type MarkType = (typeof MARK_TYPES)[number];

export interface MarkTypeConfig {
    icon: string;
    label: string;
    bg: string;
    border: string;
}

export const MARK_CONFIG: Record<MarkType, MarkTypeConfig> = {
    idea: {
        icon: '💡',
        label: 'Idea',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: '#3B82F6',
    },
    important: {
        icon: '⚠️',
        label: 'Important',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: '#EF4444',
    },
    review: {
        icon: '🔍',
        label: 'Review',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: '#F59E0B',
    },
    highlight: {
        icon: '🖍️',
        label: 'Highlight',
        bg: '#FFE082',
        border: '',
    },
};

export const MARK_TYPE_LIST: MarkType[] = [...MARK_TYPES];

export function isMarkType(value: unknown): value is MarkType {
    return typeof value === 'string' && (MARK_TYPES as readonly string[]).includes(value);
}

export function markTypeConfig(type: string | null | undefined): MarkTypeConfig {
    return (isMarkType(type) ? MARK_CONFIG[type] : undefined) || MARK_CONFIG.highlight;
}

export function markStyle(type: string | null | undefined): string {
    const config = markTypeConfig(type);
    const border = config.border ? `border-bottom:2px solid ${config.border};` : '';
    return `${border}background:${config.bg};padding:1px 2px;border-radius:2px;cursor:pointer;`;
}

export function generateMarkId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Alias retained for callers that still use the old marker naming.
export const MARKER_CONFIG = MARK_CONFIG;
export const generateMarkerId = generateMarkId;
export type MarkerType = MarkType;
