<template>
  <component :is="to ? RouterLink : 'button'" :to="to || undefined" :title="title || label"
    class="group flex items-center gap-2 px-3 py-2 text-text-secondary rounded-lg hover:bg-surface-hover hover:text-text-primary transition-colors whitespace-nowrap cursor-pointer"
    active-class="!bg-accent-subtle !text-accent-dark font-medium"
    @click="$emit('click', $event)">
    <slot />
    <span class="text-sm font-medium">{{ label }}</span>
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
