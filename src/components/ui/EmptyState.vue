<template>
  <div class="text-center py-12 rounded-xl border border-dashed border-border">
    <svg v-if="icon === 'document'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <svg v-else-if="icon === 'folder'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
    <svg v-else-if="icon === 'search'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <svg v-else-if="icon === 'database'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
    <svg v-else-if="icon === 'tag'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
    </svg>
    <svg v-else-if="icon === 'note'" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
    <p v-if="title" class="text-sm font-medium text-text-primary mb-1">{{ title }}</p>
    <p v-if="description" class="text-sm text-text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: 'document' | 'folder' | 'search' | 'database' | 'tag' | 'note' | 'default';
  title?: string;
  description?: string;
}>();
</script>
