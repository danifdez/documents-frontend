<template>
  <component :is="to ? RouterLink : 'button'" :to="to || undefined" :title="title || label"
    class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-2xl border border-border transition-all duration-200 hover:shadow-md cursor-pointer gap-2"
    @click="$emit('click', $event)">
    <slot />
    <span class="text-xs font-medium">{{ label }}</span>
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
