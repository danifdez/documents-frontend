<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="240" :min-height="140" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="timeline" :data="node.data"
      @update="onToolbarUpdate" />

    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 bg-surface border-b border-border shrink-0">
      <div class="flex items-center gap-1.5 min-w-0">
        <svg aria-hidden="true" class="h-3.5 w-3.5 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-xs font-semibold text-text-primary truncate">{{ node.data.timelineName || 'Timeline' }}</span>
      </div>
      <button @click="loadTimeline" :disabled="loading"
        class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer nodrag shrink-0"
        title="Refresh">
        <svg aria-hidden="true" class="h-3 w-3" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div ref="contentEl" class="flex-1 min-h-0 overflow-auto nowheel">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
      </div>
      <div v-else-if="error" class="flex items-center justify-center h-full text-xs text-red-500 px-2 text-center">
        {{ error }}
      </div>
      <div v-else-if="!node.data.timelineId" class="flex items-center justify-center h-full text-xs text-text-muted">
        No timeline linked
      </div>
      <div v-else-if="!sortedEvents.length" class="flex items-center justify-center h-full text-xs text-text-muted">
        No events
      </div>
      <img v-else-if="timelineImage" :src="timelineImage" :alt="node.data.timelineName ? 'Timeline: ' + node.data.timelineName : 'Timeline events'" class="h-full max-w-none" style="object-fit: contain; min-width: 100%;" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CanvasNodeData } from '../../../types/canvas';
import { renderTimelinePreview } from '../../../services/timelines/renderTimelinePreview';
import type { TimelineEvent, TimelineEpoch } from '../../../types/timeline';
import { getErrorMessage } from '../../../utils/errorDetails';
import { ref, computed, onMounted } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';
import { useTimelines } from '../../../services/timelines/useTimelines';

defineProps<{ id: string; data: CanvasNodeData; selected: boolean }>();
const { node } = useNode<CanvasNodeData>();
const { loadTimeline: fetchTimeline } = useTimelines();

const loading = ref(false);
const error = ref<string | null>(null);
const events = ref<(TimelineEvent & { label?: string })[]>([]);
const epochs = ref<TimelineEpoch[]>([]);
const timelineImage = ref<string | null>(null);
const contentEl = ref<HTMLElement | null>(null);

const filteredEvents = computed(() => {
  let evts = [...events.value];
  const mode = node.data.filterMode;

  if (mode === 'epoch' && node.data.epochId) {
    const epoch = epochs.value.find(e => e.id === node.data.epochId);
    if (epoch) {
      const start = new Date(epoch.startDate).getTime();
      const end = new Date(epoch.endDate).getTime();
      evts = evts.filter(e => {
        const t = new Date(e.date).getTime();
        return t >= start && t <= end;
      });
    }
  } else if (mode === 'range') {
    if (node.data.dateFrom) {
      const from = new Date(node.data.dateFrom).getTime();
      evts = evts.filter(e => new Date(e.date).getTime() >= from);
    }
    if (node.data.dateTo) {
      const to = new Date(node.data.dateTo).getTime();
      evts = evts.filter(e => new Date(e.date).getTime() <= to);
    }
  }

  return evts;
});

const sortedEvents = computed(() =>
  [...filteredEvents.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
);

const loadTimeline = async () => {
  if (!node.data.timelineId) return;

  loading.value = true;
  error.value = null;

  try {
    const timeline = await fetchTimeline(node.data.timelineId);
    events.value = timeline.timelineData || [];
    epochs.value = timeline.epochs || [];
    node.data.timelineName = timeline.name;
    renderImage();
  } catch (err: unknown) {
    error.value = getErrorMessage(err) || 'Failed to load timeline';
  } finally {
    loading.value = false;
  }
};

function renderImage() {
  timelineImage.value = renderTimelinePreview(sortedEvents.value, epochs.value, 520,
    event => event.title || event.label || '');
}

onMounted(() => {
  if (node.data.timelineId) loadTimeline();
});

const onToolbarUpdate = (updates: CanvasNodeData) => {
  node.data = { ...node.data, ...updates };
};
</script>
