<template>
  <div
    class="rounded border border-border bg-surface-elevated px-2 py-1.5 shadow-sm cursor-pointer hover:shadow-md hover:border-accent/40 transition-all duration-150"
    :style="{
      borderLeftColor: event.color,
      borderLeftWidth: '3px',
    }"
    :class="cardClass"
    @click="$emit('click', event)"
  >
    <p class="text-[11px] font-semibold text-text-primary truncate leading-tight">{{ event.title }}</p>
    <p class="text-[9px] text-text-muted mt-0.5 leading-tight">
      {{ formatDate(event.date) }}<span v-if="event.endDate"> – {{ formatDate(event.endDate) }}</span>
    </p>
    <p v-if="event.description" class="text-[9px] text-text-secondary mt-0.5 line-clamp-1 leading-tight">{{ event.description }}</p>
    <div v-if="event.docId || event.resourceId" class="flex items-center gap-1 mt-1">
      <svg v-if="event.docId" class="h-2.5 w-2.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <svg v-if="event.resourceId" class="h-2.5 w-2.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimelineEvent } from '../../types/timeline';

defineProps<{
  event: TimelineEvent;
  cardClass?: string;
}>();

defineEmits<{
  click: [event: TimelineEvent];
}>();

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
</script>
