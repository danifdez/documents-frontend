<template>
  <component :is="to ? RouterLink : 'button'" :to="to || undefined" :title="title || label"
    class="group inline-flex h-12 min-w-36 items-center gap-2.5 rounded-xl border border-border bg-surface-elevated px-3 text-text-secondary transition-all duration-150 hover:border-text-muted/60 hover:text-text-primary hover:shadow-sm cursor-pointer"
    @click="$emit('click', $event)">
    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-accent [&>svg]:h-4 [&>svg]:w-4">
      <slot />
    </span>
    <span class="text-xs font-medium">{{ label }}</span>
    <svg class="ml-auto h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M7.3 14.7a1 1 0 010-1.4l3.3-3.3-3.3-3.3a1 1 0 011.4-1.4l4 4a1 1 0 010 1.4l-4 4a1 1 0 01-1.4 0z" clip-rule="evenodd" />
    </svg>
  </component>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{
  label: string;
  to?: string;
  title?: string;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>
