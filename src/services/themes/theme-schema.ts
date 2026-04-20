export const SUPPORTED_CSS_VARS = [
  '--color-surface',
  '--color-surface-elevated',
  '--color-surface-hover',
  '--color-accent',
  '--color-accent-light',
  '--color-accent-dark',
  '--color-accent-subtle',
  '--color-border',
  '--color-border-light',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-muted',
  '--color-sidebar-from',
  '--color-sidebar-to',
] as const;

export type SupportedCssVar = typeof SUPPORTED_CSS_VARS[number];

export type ThemeVariant = Partial<Record<SupportedCssVar, string>>;

export interface ThemeFontFace {
  family: string;
  src: string;
  weight?: number | string;
  style?: string;
}

export interface ThemeTypography {
  fontFamily?: string;
  fontFaces?: ThemeFontFace[];
}

export interface ThemeManifest {
  id: string;
  name: string;
  author?: string;
  version?: string;
  description?: string;
  variants: {
    light: ThemeVariant;
    dark: ThemeVariant;
  };
  typography?: ThemeTypography;
  customCss?: string;
}

export const THEME_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{0,63}$/;
export const MAX_CUSTOM_CSS_BYTES = 64 * 1024;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: ThemeManifest;
}

export function validateManifest(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Manifest must be a JSON object'], warnings };
  }
  const m = raw as Record<string, unknown>;

  if (typeof m.id !== 'string' || !THEME_ID_PATTERN.test(m.id)) {
    errors.push('Field "id" must match /^[a-z0-9][a-z0-9-_]{0,63}$/');
  }
  if (typeof m.name !== 'string' || m.name.trim().length === 0) {
    errors.push('Field "name" is required and must be a non-empty string');
  }

  const variants = m.variants as { light?: unknown; dark?: unknown } | undefined;
  if (!variants || typeof variants !== 'object') {
    errors.push('Field "variants" is required and must contain "light" and "dark"');
  }

  const sanitizeVariant = (v: unknown, label: string): ThemeVariant => {
    if (!v || typeof v !== 'object') {
      errors.push(`variants.${label} must be an object of CSS variables`);
      return {};
    }
    const out: ThemeVariant = {};
    for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
      if (!SUPPORTED_CSS_VARS.includes(key as SupportedCssVar)) {
        warnings.push(`Unknown CSS variable "${key}" in variants.${label} (ignored)`);
        continue;
      }
      if (typeof value !== 'string' || value.length > 200) {
        warnings.push(`Invalid value for ${key} in variants.${label} (ignored)`);
        continue;
      }
      out[key as SupportedCssVar] = value;
    }
    return out;
  };

  const light = variants ? sanitizeVariant(variants.light, 'light') : {};
  const dark = variants ? sanitizeVariant(variants.dark, 'dark') : {};

  let typography: ThemeTypography | undefined;
  if (m.typography !== undefined) {
    if (typeof m.typography !== 'object' || m.typography === null) {
      errors.push('"typography" must be an object');
    } else {
      const t = m.typography as Record<string, unknown>;
      typography = {};
      if (t.fontFamily !== undefined) {
        if (typeof t.fontFamily === 'string' && t.fontFamily.length < 200) {
          typography.fontFamily = t.fontFamily;
        } else {
          warnings.push('typography.fontFamily invalid (ignored)');
        }
      }
      if (Array.isArray(t.fontFaces)) {
        const faces: ThemeFontFace[] = [];
        for (const f of t.fontFaces) {
          if (!f || typeof f !== 'object') continue;
          const ff = f as Record<string, unknown>;
          if (typeof ff.family !== 'string' || typeof ff.src !== 'string') continue;
          if (ff.src.includes('..') || /^(https?:|file:|data:)/i.test(ff.src)) {
            warnings.push(`fontFaces.src "${ff.src}" rejected (must be a relative path inside the theme)`);
            continue;
          }
          faces.push({
            family: ff.family,
            src: ff.src,
            weight: typeof ff.weight === 'number' || typeof ff.weight === 'string' ? ff.weight : undefined,
            style: typeof ff.style === 'string' ? ff.style : undefined,
          });
        }
        if (faces.length) typography.fontFaces = faces;
      }
    }
  }

  let customCss: string | undefined;
  if (m.customCss !== undefined) {
    if (typeof m.customCss !== 'string') {
      errors.push('"customCss" must be a string (relative path or inline CSS)');
    } else {
      customCss = m.customCss;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  return {
    valid: true,
    errors,
    warnings,
    sanitized: {
      id: m.id as string,
      name: m.name as string,
      author: typeof m.author === 'string' ? m.author : undefined,
      version: typeof m.version === 'string' ? m.version : undefined,
      description: typeof m.description === 'string' ? m.description : undefined,
      variants: { light, dark },
      typography,
      customCss,
    },
  };
}

export function validateCustomCss(css: string): { valid: boolean; error?: string } {
  if (Buffer.byteLength(css, 'utf8') > MAX_CUSTOM_CSS_BYTES) {
    return { valid: false, error: `customCss exceeds ${MAX_CUSTOM_CSS_BYTES} bytes` };
  }
  if (/@import\s+url\(\s*['"]?https?:/i.test(css)) {
    return { valid: false, error: 'Remote @import url(http…) not allowed in customCss' };
  }
  return { valid: true };
}
