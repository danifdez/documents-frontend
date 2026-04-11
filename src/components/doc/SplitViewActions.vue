<template>
  <div class="flex items-center gap-1 shrink-0 ml-2">
    <!-- Swap button (only for documents) -->
    <button v-if="$attrs.onSwap" @click="$emit('swap')"
      class="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
      title="Swap with main document">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    </button>
    <!-- Open in new page -->
    <router-link :to="linkTo"
      class="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
      :title="linkTitle">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </router-link>
    <!-- Close -->
    <button @click="$emit('close')"
      class="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer"
      title="Close split view (Esc)">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  linkTo: string;
  linkTitle?: string;
}>();

defineEmits<{
  close: [];
  swap: [];
}>();
</script>
