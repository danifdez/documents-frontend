<template>
  <SectionPanel title="Favorites" color="amber"
    :loading="isLoading" :empty="favorites.length === 0"
    empty-icon="default" empty-text="No favorites yet">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.286 3.958c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.045 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.304-3.958z" />
      </svg>
    </template>

    <ListRow v-for="favorite in favorites" :key="favorite.id" button @click="$emit('open', favorite)">
      <div class="min-w-0 flex-1">
        <p class="text-sm text-text-primary truncate">{{ favorite.title || favorite.url }}</p>
        <p class="text-[11px] text-text-muted truncate">{{ hostOf(favorite.url) }}</p>
      </div>
      <button @click.stop="$emit('remove', favorite)"
        class="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-surface transition-colors shrink-0 cursor-pointer"
        title="Remove favorite">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </ListRow>
  </SectionPanel>
</template>

<script setup lang="ts">
import type { ProjectFavorite } from '../../services/favorites/useProjectFavorites';
import SectionPanel from '../ui/SectionPanel.vue';
import ListRow from '../ui/ListRow.vue';

defineProps<{
  favorites: ProjectFavorite[];
  isLoading: boolean;
}>();

defineEmits<{
  open: [favorite: ProjectFavorite];
  remove: [favorite: ProjectFavorite];
}>();

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
</script>
