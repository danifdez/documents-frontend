import { ref, computed } from 'vue';
import { DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY, DEFAULT_PARAGRAPH_SPACING } from '../config/constants';

export interface ContentSettings {
  fontSize: number;
  fontFamily: string;
  paragraphSpacing: number;
}

const defaultSettings: ContentSettings = {
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: DEFAULT_FONT_FAMILY,
  paragraphSpacing: DEFAULT_PARAGRAPH_SPACING,
};

/**
 * Composable for managing content display settings (font size, family, spacing).
 * Loads from electron-store if available.
 */
export function useContentSettings() {
  const settings = ref<ContentSettings>({ ...defaultSettings });

  const cssVars = computed(() => ({
    '--font-size-p': settings.value.fontSize + 'px',
    '--font-family': settings.value.fontFamily,
    '--paragraph-spacing': settings.value.paragraphSpacing.toString(),
  }));

  async function loadSettings() {
    if (window.electronAPI?.getSettings) {
      const stored = await window.electronAPI.getSettings();
      if (stored) {
        settings.value.fontSize = stored.fontSize || DEFAULT_FONT_SIZE;
        settings.value.fontFamily = stored.fontFamily || DEFAULT_FONT_FAMILY;
        settings.value.paragraphSpacing = stored.paragraphSpacing || DEFAULT_PARAGRAPH_SPACING;
      }
    }
  }

  return { settings, cssVars, loadSettings };
}
