// ── Defaults ──
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_FAMILY = 'sans-serif';
export const DEFAULT_PARAGRAPH_SPACING = 1.5;
export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_THEME = 'system';
export const DEFAULT_THEME_ID = 'default';
export const BUILT_IN_THEME_IDS = ['default'] as const;
export const DEFAULT_BROWSER_URL = 'https://github.com/electron/electron';

// ── Timing ──
export const DEFAULT_DEBOUNCE_MS = 800;
export const AUTO_SAVE_DELAY_MS = 800;
export const NETWORK_PING_INTERVAL_MS = 30000;

// ── Limits ──
export const MAX_FILE_NAME_LENGTH = 255;
export const GRID_COLS_RESPONSIVE = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

// ── Languages ──
export const LANGUAGES = [
    { label: 'English', code: 'en' },
    { label: 'Spanish', code: 'es' },
    { label: 'Italian', code: 'it' },
    { label: 'Portuguese', code: 'pt' },
    { label: 'German', code: 'de' },
    { label: 'French', code: 'fr' },
] as const;
