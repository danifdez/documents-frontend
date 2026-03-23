<template>
  <div class="marker-sidebar bg-surface-elevated rounded-xl border border-border h-full flex flex-col">
    <div v-if="markers.length === 0" class="flex items-center justify-center py-10 px-4">
      <div class="text-center">
        <span class="text-2xl block mb-2">💡</span>
        <p class="text-sm text-text-muted">No markers yet</p>
        <p class="text-xs text-text-muted mt-1">Select text and click a marker button</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div v-for="marker in markers" :key="marker.id" :id="`marker-${marker.id}`"
        class="group border-b border-border-light last:border-b-0 px-4 py-3 transition-colors hover:bg-surface-hover cursor-pointer"
        :class="{ 'ring-2 ring-inset ring-accent/30': highlightedMarkerId === marker.id }"
        @click="handleMarkerClick(marker)">
        <div class="flex items-start gap-2">
          <span class="text-base flex-shrink-0 mt-0.5">{{ markerConfig[marker.type]?.icon || '💡' }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium mb-0.5" :style="{ color: markerConfig[marker.type]?.border }">
              {{ markerConfig[marker.type]?.label || 'Marker' }}
            </div>
            <div class="text-sm text-text-primary leading-relaxed line-clamp-2 break-words">
              {{ marker.text }}
            </div>
          </div>
          <button @click.stop="removeMarker(marker)"
            class="p-1 text-text-muted hover:text-red-500 rounded transition-colors cursor-pointer opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="Remove marker">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const MARKER_CONFIG = {
  idea: { icon: '💡', label: 'Idea', bg: 'rgba(59, 130, 246, 0.12)', border: '#3B82F6' },
  important: { icon: '⚠️', label: 'Important', bg: 'rgba(239, 68, 68, 0.12)', border: '#EF4444' },
  review: { icon: '🔍', label: 'Review', bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B' },
};

const markerConfig = MARKER_CONFIG;

const props = defineProps({
  editor: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['marker-clicked', 'marker-removed']);

const markers = ref([]);
const highlightedMarkerId = ref(null);

const extractMarkers = () => {
  if (!props.editor) {
    markers.value = [];
    return;
  }

  const doc = props.editor.state.doc;
  const found = [];
  const seen = new Set();

  doc.descendants((node, pos) => {
    if (node.isText) {
      const markerMark = node.marks.find((m) => m.type.name === 'marker');
      if (markerMark && markerMark.attrs.markerId && !seen.has(markerMark.attrs.markerId)) {
        seen.add(markerMark.attrs.markerId);
        found.push({
          id: markerMark.attrs.markerId,
          type: markerMark.attrs.markerType || 'idea',
          text: node.text || '',
          from: pos,
          to: pos + node.nodeSize,
        });
      }
    }
    return true;
  });

  markers.value = found;
};

const handleMarkerClick = (marker) => {
  highlightedMarkerId.value = marker.id;
  emit('marker-clicked', marker.id);

  setTimeout(() => {
    highlightedMarkerId.value = null;
  }, 2500);
};

const removeMarker = (marker) => {
  emit('marker-removed', marker.id);
};

const onEditorUpdate = () => {
  extractMarkers();
};

const refresh = () => {
  extractMarkers();
};

onMounted(() => {
  if (props.editor) {
    props.editor.on('update', onEditorUpdate);
    extractMarkers();
  }
});

onBeforeUnmount(() => {
  if (props.editor) {
    props.editor.off('update', onEditorUpdate);
  }
});

watch(() => props.editor, (newEditor, oldEditor) => {
  if (oldEditor) oldEditor.off('update', onEditorUpdate);
  if (newEditor) {
    newEditor.on('update', onEditorUpdate);
    extractMarkers();
  }
});

defineExpose({ refresh, extractMarkers });
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
