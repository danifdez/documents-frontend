import { ref, watch, onMounted, onUnmounted } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

const themeMode = ref<ThemeMode>('system');

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

export function useTheme() {
  let mediaQuery: MediaQueryList | null = null;
  let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

  const initTheme = async () => {
    if (window.electronAPI?.getSettings) {
      const settings = await window.electronAPI.getSettings();
      themeMode.value = (settings?.theme as ThemeMode) || 'system';
    }
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
    initTheme,
    setTheme,
  };
}
