<template>
  <!-- Project -->
  <svg v-if="type === 'project'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted" fill="none"
    viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round"
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
  <!-- Thread -->
  <svg v-else-if="type === 'thread'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted" fill="none"
    viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round"
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
  <!-- Document -->
  <svg v-else-if="type === 'document'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted" fill="none"
    viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
    <path stroke-linecap="round" stroke-linejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  type: string;
}>();
</script>
