<template>
  <span class="icon-chip" :class="colorClass">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  color?: 'accent' | 'amber' | 'emerald' | 'rose' | 'sky' | 'violet';
}>(), {
  color: 'accent',
});

const colorClass = computed(() => `icon-chip--${props.color}`);
</script>
