<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-text-primary">Installed themes</h3>
        <p class="text-xs text-text-muted mt-0.5">Pick an active theme or install one from a .json / .zip file.</p>
      </div>
      <button
        type="button"
        class="btn-primary text-xs"
        :disabled="loading"
        @click="onInstall"
      >
        Install from file…
      </button>
    </div>

    <div v-if="themes.length === 0" class="text-sm text-text-muted py-8 text-center">
      No themes installed yet.
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <article
        v-for="entry in themes"
        :key="entry.manifest.id"
        class="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3"
        :class="{ 'ring-2 ring-accent/40': entry.manifest.id === activeThemeId }"
      >
        <header class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h4 class="text-sm font-semibold text-text-primary truncate">{{ entry.manifest.name }}</h4>
            <p class="text-xs text-text-muted truncate">
              <span v-if="entry.manifest.author">{{ entry.manifest.author }}</span>
              <span v-if="entry.manifest.author && entry.manifest.version"> · </span>
              <span v-if="entry.manifest.version">v{{ entry.manifest.version }}</span>
            </p>
          </div>
          <span
            v-if="entry.manifest.id === activeThemeId"
            class="text-[10px] font-semibold uppercase tracking-wider text-accent-dark bg-accent-subtle px-2 py-0.5 rounded-full whitespace-nowrap"
          >
            Active
          </span>
        </header>

        <p v-if="entry.manifest.description" class="text-xs text-text-secondary line-clamp-2">
          {{ entry.manifest.description }}
        </p>

        <div class="flex items-center gap-1.5">
          <span
            v-for="swatch in swatchesFor(entry)"
            :key="swatch.key"
            class="h-5 w-5 rounded-full border border-border-light"
            :style="{ backgroundColor: swatch.color }"
            :title="swatch.key"
          />
        </div>

        <div class="flex items-center gap-2 mt-auto pt-1">
          <button
            type="button"
            class="btn-primary text-xs flex-1"
            :disabled="entry.manifest.id === activeThemeId"
            @click="onActivate(entry.manifest.id)"
          >
            {{ entry.manifest.id === activeThemeId ? 'Active' : 'Activate' }}
          </button>
          <button
            type="button"
            class="btn-danger text-xs"
            :disabled="entry.builtIn"
            :title="entry.builtIn ? 'Built-in themes cannot be uninstalled' : 'Uninstall'"
            @click="onUninstall(entry)"
          >
            Uninstall
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useThemes, type InstalledThemeEntry } from '../../composables/useThemes';
import { useNotification } from '../../composables/useNotification';

const { themes, loading, activeThemeId, refresh, installTheme, uninstallTheme, activateTheme } = useThemes();
const { success, error } = useNotification();

const SWATCH_KEYS = ['--color-surface', '--color-accent', '--color-text-primary', '--color-border'] as const;

const isDark = computed(() => document.documentElement.classList.contains('dark'));

function swatchesFor(entry: InstalledThemeEntry) {
  const variant = isDark.value ? entry.manifest.variants.dark : entry.manifest.variants.light;
  return SWATCH_KEYS.map((key) => ({ key, color: variant?.[key] || 'transparent' }));
}

async function onInstall() {
  const result = await installTheme();
  if (result.success) {
    success(`Theme "${result.theme.manifest.name}" installed`);
  } else if (result.error && result.error !== 'cancelled') {
    error(`Install failed: ${result.error}`);
  }
}

async function onActivate(id: string) {
  await activateTheme(id);
  success('Theme activated');
}

async function onUninstall(entry: InstalledThemeEntry) {
  if (entry.builtIn) return;
  const confirmed = window.confirm(`Uninstall theme "${entry.manifest.name}"?`);
  if (!confirmed) return;
  const result = await uninstallTheme(entry.manifest.id);
  if (result.success) {
    success(`Theme "${entry.manifest.name}" uninstalled`);
  } else {
    error(`Uninstall failed: ${result.error || 'unknown error'}`);
  }
}

onMounted(() => {
  refresh();
});
</script>
