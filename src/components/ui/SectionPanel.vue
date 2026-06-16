<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h2 class="card-title text-sm">
        <IconChip :color="color">
          <slot name="icon" />
        </IconChip>
        {{ title }}
        <span v-if="count" class="card-title-count">{{ count }}</span>
      </h2>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <LoadingSpinner v-if="loading" size="lg" fullHeight />

    <div v-else-if="!empty" class="card-flush py-1.5">
      <slot />
    </div>

    <slot v-else name="empty">
      <EmptyState :icon="emptyIcon" :description="emptyText" />
    </slot>
  </section>
</template>

<script setup lang="ts">
import IconChip from './IconChip.vue';
import EmptyState from './EmptyState.vue';
import LoadingSpinner from './LoadingSpinner.vue';

withDefaults(defineProps<{
  title: string;
  color?: 'accent' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet';
  count?: string;
  loading?: boolean;
  empty?: boolean;
  emptyIcon?: 'document' | 'folder' | 'search' | 'database' | 'tag' | 'note' | 'default';
  emptyText?: string;
}>(), {
  color: 'accent',
  loading: false,
  empty: false,
  emptyIcon: 'default',
  emptyText: 'Nothing here yet',
});
</script>
