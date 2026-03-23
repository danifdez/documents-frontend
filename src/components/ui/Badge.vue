<template>
  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" :class="variantClass" :style="customStyle">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'accent' | 'success' | 'danger' | 'warning' | 'muted';
  color?: string;
}>(), {
  variant: 'accent',
});

const variantClasses: Record<string, string> = {
  accent: 'bg-accent/10 text-accent',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  muted: 'bg-surface text-text-secondary',
};

const variantClass = computed(() => props.color ? '' : variantClasses[props.variant] || variantClasses.accent);
const customStyle = computed(() => props.color ? { backgroundColor: `${props.color}20`, color: props.color } : {});
</script>
