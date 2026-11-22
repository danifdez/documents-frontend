<template>
    <div
        class="timeline-view-node my-3 rounded-2xl border border-border bg-surface-elevated overflow-hidden select-none">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    stroke-width="1.75" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-semibold text-text-primary">{{ timelineName }}</span>
                <span v-if="filterLabel"
                    class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-700">
                    {{ filterLabel }}
                </span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                    Live
                </span>
            </div>
            <div class="flex items-center gap-1">
                <!-- Zoom controls -->
                <button @click="zoomIn"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Zoom in">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        stroke-width="2" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <span class="text-[10px] text-text-muted w-8 text-center tabular-nums">{{ zoomLabel }}</span>
                <button @click="zoomOut"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Zoom out">
                    <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
                    </svg>
                </button>
                <button @click="resetView"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Fit to view">
                    <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                </button>

                <div class="h-4 w-px bg-border mx-0.5"></div>

                <a :href="`#/timeline/${timelineId}`"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
                    title="Open timeline" @click.stop>
                    <svg aria-hidden="true" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
                <button @click="loadTimeline" :disabled="loading"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Refresh">
                    <svg aria-hidden="true" class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="px-4 py-6 text-sm text-red-500 text-center">{{ error }}</div>

        <!-- No events -->
        <div v-else-if="sortedEvents.length === 0" class="px-4 py-8 text-sm text-text-muted text-center">
            No events found
        </div>

        <!-- Timeline image with pan/zoom -->
        <div v-else ref="viewportRef" class="timeline-viewport overflow-hidden cursor-grab active:cursor-grabbing"
            style="height: 300px;" @wheel.prevent="onWheel" @mousedown.stop="startPan($event, handleDrag)"
            @dragstart.prevent.stop>
            <img :alt="`Timeline of ${timelineName || 'events'}`" v-if="timelineImage" :src="timelineImage" draggable="false"
                :style="imageTransformStyle"
                class="origin-center select-none pointer-events-none h-full" />
        </div>

        <!-- Footer -->
        <div
            class="px-4 py-1.5 border-t border-border bg-surface text-[10px] text-text-muted flex items-center justify-between">
            <span>{{ sortedEvents.length }} event{{ sortedEvents.length !== 1 ? 's' : '' }}</span>
            <a :href="`#/timeline/${timelineId}`" class="text-accent hover:text-accent-dark transition-colors"
                @click.stop>
                Open full timeline
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { renderTimelinePreview } from '../../services/timelines/renderTimelinePreview';
import type { TimelineEvent, TimelineEpoch } from '../../types/timeline';
import { getResponseError } from '../../utils/errorDetails';
import { ref, computed, onMounted } from 'vue';
import { useTimelines } from '../../services/timelines/useTimelines';
import { usePanZoom, type PanDrag } from '../../composables/usePanZoom';

const { loadTimeline: fetchTimeline } = useTimelines();

const props = defineProps<{
    timelineId: number;
    timelineName: string;
    filterMode?: string;
    epochId?: string;
    dateFrom?: string;
    dateTo?: string;
    editable?: boolean;
    initialZoom?: number;
    initialPanX?: number;
    initialPanY?: number;
    onViewChange?: (state: { zoom: number; panX: number; panY: number }) => void;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const events = ref<TimelineEvent[]>([]);
const epochs = ref<TimelineEpoch[]>([]);
const timelineImage = ref<string | null>(null);
const viewportRef = ref<HTMLElement | null>(null);

const { zoom, panX, panY, isPanning, zoomLabel, zoomIn, zoomOut, resetView, onWheel, startPan } =
    usePanZoom({
        initialZoom: props.initialZoom,
        initialPanX: props.initialPanX,
        initialPanY: props.initialPanY,
        minZoom: 0.25,
        onViewChange: (state) => props.onViewChange?.(state),
    });

const handleDrag = ({ dx, dy, startPanX, startPanY }: PanDrag) => {
    panX.value = startPanX + dx / zoom.value;
    panY.value = startPanY + dy / zoom.value;
};

const imageTransformStyle = computed(() => ({
    transform: `scale(${zoom.value}) translate(${panX.value}px, ${panY.value}px)`,
    transformOrigin: 'center center',
    transition: isPanning.value ? 'none' : 'transform 0.1s ease',
}));

const filterLabel = computed(() => {
    if (props.filterMode === 'epoch' && props.epochId) {
        const ep = epochs.value.find(e => e.id === props.epochId);
        return ep ? ep.name : 'Epoch';
    }
    if (props.filterMode === 'range' && (props.dateFrom || props.dateTo)) {
        return `${props.dateFrom || '...'} – ${props.dateTo || '...'}`;
    }
    return null;
});

const filteredEvents = computed(() => {
    let evts = [...events.value];
    const mode = props.filterMode;

    if (mode === 'epoch' && props.epochId) {
        const epoch = epochs.value.find(e => e.id === props.epochId);
        if (epoch) {
            const start = new Date(epoch.startDate).getTime();
            const end = new Date(epoch.endDate).getTime();
            evts = evts.filter(e => {
                const t = new Date(e.date).getTime();
                return t >= start && t <= end;
            });
        }
    } else if (mode === 'range') {
        if (props.dateFrom) {
            const from = new Date(props.dateFrom).getTime();
            evts = evts.filter(e => new Date(e.date).getTime() >= from);
        }
        if (props.dateTo) {
            const to = new Date(props.dateTo).getTime();
            evts = evts.filter(e => new Date(e.date).getTime() <= to);
        }
    }

    return evts;
});

const sortedEvents = computed(() =>
    [...filteredEvents.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
);

const loadTimeline = async () => {
    if (!props.timelineId) return;
    loading.value = true;
    error.value = null;

    try {
        const timeline = await fetchTimeline(props.timelineId);
        events.value = timeline.timelineData || [];
        epochs.value = timeline.epochs || [];
        renderImage();
    } catch (err: unknown) {
        error.value = getResponseError(err) || 'Failed to load timeline';
    } finally {
        loading.value = false;
    }
};

function renderImage() {
    timelineImage.value = renderTimelinePreview(sortedEvents.value, epochs.value, 400, event => event.title || '');
}

onMounted(() => {
    if (props.timelineId) loadTimeline();
});
</script>
