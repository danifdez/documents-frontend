<template>
  <div class="mb-6">
    <Breadcrumb v-if="breadcrumbs && breadcrumbs.length" :items="breadcrumbs" />
    <div class="flex items-start justify-between gap-6" :class="{ 'mt-2': breadcrumbs?.length }">
      <div class="min-w-0 flex-1">
        <h1 v-if="title" class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
        <slot name="title" />
      </div>
      <div v-if="$slots.actions" class="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="divider" class="mt-4 h-px bg-border"></div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from './Breadcrumb.vue';

withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ name: string; path?: string }>;
  divider?: boolean;
}>(), {
  divider: false,
});
</script>
