<template>
  <div class="flex justify-center items-center" :class="containerClass">
    <div class="animate-spin rounded-full border-2 border-accent border-t-transparent" :class="sizeClass"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}>(), {
  size: 'md',
  fullHeight: false,
});

const sizeClass = computed(() => ({
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}[props.size]));

const containerClass = computed(() => props.fullHeight ? 'flex-1' : '');
</script>
