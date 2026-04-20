import { ref, watch, onUnmounted } from 'vue';
import type { ThemeAssetsType, ThemeManifestType } from '../types/electron';

export type ThemeMode = 'light' | 'dark' | 'system';

const themeMode = ref<ThemeMode>('system');
const activeThemeId = ref<string>('default');

const STYLE_VARS_ID = 'app-theme-vars';
const STYLE_FONTS_ID = 'app-theme-fonts';
const STYLE_CUSTOM_ID = 'app-theme-custom';

function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(mode: ThemeMode) {
  const effective = getEffectiveTheme(mode);
  document.documentElement.classList.toggle('dark', effective === 'dark');
}

function upsertStyle(id: string, css: string) {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function removeStyle(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function variantToBlock(selector: string, vars: Record<string, string>, fontFamily?: string): string {
  const entries = Object.entries(vars);
  if (entries.length === 0 && !fontFamily) return '';
  const lines = entries.map(([k, v]) => `  ${k}: ${v};`);
  if (fontFamily) lines.push(`  --font-sans: ${fontFamily};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

function applyThemeAssets(assets: ThemeAssetsType | null) {
  if (!assets) {
    removeStyle(STYLE_VARS_ID);
    removeStyle(STYLE_FONTS_ID);
    removeStyle(STYLE_CUSTOM_ID);
    return;
  }

  const manifest: ThemeManifestType = assets.manifest;
  const fontFamily = manifest.typography?.fontFamily;

  const lightBlock = variantToBlock(':root', manifest.variants.light || {}, fontFamily);
  const darkBlock = variantToBlock('html.dark', manifest.variants.dark || {});
  upsertStyle(STYLE_VARS_ID, [lightBlock, darkBlock].filter(Boolean).join('\n\n'));

  if (assets.fonts.length > 0) {
    const fontCss = assets.fonts
      .map((f) => {
        const weight = f.weight !== undefined ? `  font-weight: ${f.weight};` : '';
        const style = f.style ? `  font-style: ${f.style};` : '';
        return [
          `@font-face {`,
          `  font-family: '${f.family.replace(/'/g, "\\'")}';`,
          `  src: url('${f.dataUrl}');`,
          `  font-display: swap;`,
          weight,
          style,
          `}`,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');
    upsertStyle(STYLE_FONTS_ID, fontCss);
  } else {
    removeStyle(STYLE_FONTS_ID);
  }

  if (assets.customCss) {
    upsertStyle(STYLE_CUSTOM_ID, assets.customCss);
  } else {
    removeStyle(STYLE_CUSTOM_ID);
  }
}

async function loadAndApplyTheme(id: string) {
  if (!window.electronAPI?.readThemeAssets) return;
  try {
    const assets = await window.electronAPI.readThemeAssets(id);
    applyThemeAssets(assets);
  } catch (err) {
    console.error('[useTheme] failed to load theme', id, err);
  }
}

export function useTheme() {
  let mediaQuery: MediaQueryList | null = null;
  let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

  const initTheme = async () => {
    if (window.electronAPI?.getSettings) {
      const settings = await window.electronAPI.getSettings();
      themeMode.value = (settings?.theme as ThemeMode) || 'system';
      activeThemeId.value = settings?.themeId || 'default';
    }

    await loadAndApplyTheme(activeThemeId.value);
    applyTheme(themeMode.value);

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaHandler = () => {
      if (themeMode.value === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', mediaHandler);
  };

  const setTheme = (mode: ThemeMode) => {
    themeMode.value = mode;
    applyTheme(mode);
  };

  const setActiveTheme = async (id: string) => {
    activeThemeId.value = id;
    await loadAndApplyTheme(id);
    applyTheme(themeMode.value);
  };

  watch(themeMode, (newMode) => {
    applyTheme(newMode);
  });

  onUnmounted(() => {
    if (mediaQuery && mediaHandler) {
      mediaQuery.removeEventListener('change', mediaHandler);
    }
  });

  return {
    themeMode,
    activeThemeId,
    initTheme,
    setTheme,
    setActiveTheme,
  };
}
