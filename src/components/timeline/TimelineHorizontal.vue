<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Zoom controls -->
    <div class="flex items-center gap-2 mb-2 shrink-0">
      <Button size="small" variant="secondary" @click="zoomOut" :disabled="zoomLevel <= 0.25" title="Zoom out">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
        </svg>
      </Button>
      <span class="text-xs text-text-muted w-12 text-center">{{ Math.round(zoomLevel * 100) }}%</span>
      <Button size="small" variant="secondary" @click="zoomIn" :disabled="zoomLevel >= 4" title="Zoom in">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Button>
      <Button size="small" variant="secondary" @click="zoomLevel = 1" :disabled="zoomLevel === 1" title="Reset zoom">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </Button>

      <!-- Epoch filter chips -->
      <template v-if="epochs.length > 0">
        <span class="text-xs text-text-muted ml-2">|</span>
        <div
          v-for="epoch in epochs"
          :key="'filter-' + epoch.id"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all group"
          :class="focusedEpochId === epoch.id
            ? 'border-text-primary text-text-primary shadow-sm'
            : 'border-transparent text-text-secondary hover:border-border'"
          :style="{ backgroundColor: epoch.color }"
        >
          <span class="cursor-pointer" @click="toggleEpochFocus(epoch.id)">{{ epoch.name }}</span>
          <button class="hidden group-hover:block p-0 text-text-muted hover:text-accent transition-colors" title="Edit" @click.stop="emit('edit-epoch', epoch)">
            <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button class="hidden group-hover:block p-0 text-text-muted hover:text-red-400 transition-colors" title="Delete" @click.stop="emit('delete-epoch', epoch)">
            <svg class="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <button
          v-if="focusedEpochId"
          class="text-[10px] text-text-muted hover:text-text-primary transition-colors"
          @click="focusedEpochId = null"
        >Show all</button>
      </template>
    </div>

    <!-- Timeline visualization -->
    <div class="flex-1 min-h-0 overflow-auto" ref="scrollContainerRef" data-timeline-export
      <div class="flex justify-center" :style="{ minWidth: scaledTimelineWidth + 'px' }">
        <div class="relative" :style="{ width: scaledTimelineWidth + 'px', height: timelineHeight + 'px' }">

          <!-- Epoch bands — alternating above and below axis -->
          <template v-for="(epoch, eIdx) in epochs" :key="'epoch-' + epoch.id">
            <div
              class="absolute rounded cursor-pointer hover:opacity-90 transition-opacity"
              :style="{
                left: dateToPixel(epoch.startDate) + 'px',
                width: Math.max(8, dateToPixel(epoch.endDate) - dateToPixel(epoch.startDate)) + 'px',
                top: '0px',
                height: (timelineHeight - (showRuler ? 24 : 0)) + 'px',
                backgroundColor: epoch.color,
                display: focusedEpochId && focusedEpochId !== epoch.id ? 'none' : undefined,
              }"
              @click="$emit('edit-epoch', epoch)"
            >
              <span class="absolute left-1.5 top-1 text-[9px] font-semibold text-text-primary/70 whitespace-nowrap truncate"
                :style="{ maxWidth: Math.max(20, dateToPixel(epoch.endDate) - dateToPixel(epoch.startDate) - 8) + 'px' }">
                {{ epoch.name }}
              </span>
            </div>
          </template>

          <!-- Axis line -->
          <div class="absolute left-0 right-0 h-px bg-border" :style="{ top: axisY + 'px' }"></div>

          <!-- Inline time marks — on the axis -->
          <template v-if="showInlineMarks">
            <div
              v-for="tick in timeTicks"
              :key="'inline-' + tick.label"
              class="absolute z-10"
              :style="{ left: tick.px + 'px', top: (axisY - 8) + 'px' }"
            >
              <div class="w-px h-4 bg-text-muted/40 mx-auto"></div>
              <span class="absolute top-4 text-[7px] text-text-muted/70 whitespace-nowrap -translate-x-1/2 left-1/2">{{ tick.label }}</span>
            </div>
          </template>

          <!-- Axis breaks -->
          <template v-if="axisBreaks">
            <div
              v-for="(brk, i) in breakPositions"
              :key="'break-' + i"
              class="absolute z-30 flex items-center justify-center"
              :style="{ left: (brk.px - 10) + 'px', top: (axisY - 12) + 'px', width: '20px', height: '24px' }"
            >
              <svg width="20" height="24" viewBox="0 0 20 24">
                <path d="M4 0 L8 8 L2 16 L6 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" />
                <path d="M14 0 L18 8 L12 16 L16 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
          </template>

          <!-- Range bars -->
          <template v-for="event in visibleEvents" :key="'range-' + event.id">
            <div
              v-if="event.endDate"
              class="absolute rounded-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
              :style="{
                left: dateToPixel(event.date) + 'px',
                width: Math.max(4, dateToPixel(event.endDate) - dateToPixel(event.date)) + 'px',
                height: '6px',
                top: (axisY - 3) + 'px',
                backgroundColor: event.color,
              }"
              @click="$emit('edit-event', event)"
            ></div>
          </template>

          <!-- Marker dots -->
          <template v-for="event in visibleEvents" :key="'dot-' + event.id">
            <div
              :data-event-id="event.id"
              class="absolute w-2.5 h-2.5 rounded-full border-2 shadow-sm z-20 cursor-pointer ring-1 hover:ring-accent/60 transition-all"
              :class="highlightedEventId === event.id ? 'ring-accent ring-2 border-accent scale-150' : 'ring-border border-white'"
              :style="{
                left: (dateToPixel(event.date) - 5) + 'px',
                top: (axisY - 5) + 'px',
                backgroundColor: event.color,
              }"
              @click="$emit('edit-event', event)"
            ></div>
          </template>

          <!-- CARDS MODE (with lane assignment to avoid overlap) -->
          <template v-if="showCards">
            <template v-for="(el, index) in cardLayout" :key="'card-' + el.event.id">
              <!-- Connector line -->
              <div
                class="absolute w-px bg-border z-10"
                :style="el.above
                  ? { left: dateToPixel(el.event.date) + 'px', top: (axisY - 6 - el.connectorH) + 'px', height: el.connectorH + 'px' }
                  : { left: dateToPixel(el.event.date) + 'px', top: (axisY + 6) + 'px', height: el.connectorH + 'px' }"
              ></div>

              <!-- Card -->
              <TimelineEventCard
                :event="el.event"
                :card-class="'absolute w-32 -translate-x-1/2'"
                :style="el.above
                  ? { left: dateToPixel(el.event.date) + 'px', bottom: (timelineHeight - axisY + 6 + el.connectorH) + 'px' }
                  : { left: dateToPixel(el.event.date) + 'px', top: (axisY + 6 + el.connectorH) + 'px' }"
                @click="$emit('edit-event', el.event)"
              />
            </template>
          </template>

          <!-- COMPACT LABELS MODE (with lane assignment) -->
          <template v-else>
            <template v-for="(el, index) in labelLayout" :key="'label-' + el.event.id">
              <!-- Connector -->
              <div
                class="absolute z-10"
                :style="{
                  left: dateToPixel(el.event.date) + 'px',
                  top: el.above ? (axisY - 6 - el.connectorH) + 'px' : (axisY + 6) + 'px',
                  height: el.connectorH + 'px',
                  width: '1px',
                  backgroundColor: el.event.color,
                  opacity: 0.5,
                }"
              ></div>

              <!-- Label -->
              <div
                class="absolute z-10 cursor-pointer group -translate-x-1/2"
                :style="el.above
                  ? { left: dateToPixel(el.event.date) + 'px', bottom: (timelineHeight - axisY + 6 + el.connectorH) + 'px' }
                  : { left: dateToPixel(el.event.date) + 'px', top: (axisY + 6 + el.connectorH) + 'px' }"
                @click="$emit('edit-event', el.event)"
              >
                <span
                  class="text-[10px] font-medium text-text-primary leading-tight text-center max-w-[100px] truncate block group-hover:text-accent transition-colors px-1 py-0.5 rounded"
                  :style="{ borderLeft: '2px solid ' + el.event.color }"
                >{{ el.event.title }}</span>
              </div>
            </template>
          </template>

          <!-- Time marks — BELOW the axis as a ruler -->
          <template v-if="showRuler">
            <div class="absolute left-0 right-0" :style="{ top: (timelineHeight - 20) + 'px', height: '20px' }">
              <div class="absolute left-0 right-0 h-px bg-border/60 top-0"></div>
              <div
                v-for="tick in timeTicks"
                :key="'tick-' + tick.label"
                class="absolute top-0"
                :style="{ left: tick.px + 'px' }"
              >
                <div class="w-px h-2 bg-text-muted/50"></div>
                <span class="absolute top-2.5 text-[8px] text-text-muted whitespace-nowrap -translate-x-1/2">{{ tick.label }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue';
import type { TimelineEvent, TimelineEpoch } from '../../types/timeline';
import TimelineEventCard from './TimelineEventCard.vue';
import Button from '../ui/Button.vue';

const props = defineProps<{
  events: TimelineEvent[];
  epochs: TimelineEpoch[];
  axisBreaks: boolean;
  showCards: boolean;
  showRuler: boolean;
  showInlineMarks: boolean;
  highlightedEventId: string | null;
}>();

const emit = defineEmits<{
  'edit-event': [event: TimelineEvent];
  'edit-epoch': [epoch: TimelineEpoch];
  'delete-epoch': [epoch: TimelineEpoch];
}>();

const scrollContainerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(800);
const zoomLevel = ref(1);
const focusedEpochId = ref<string | null>(null);
let resizeObserver: ResizeObserver | null = null;

// Scroll to highlighted event
watch(() => props.highlightedEventId, (id) => {
  if (!id || !scrollContainerRef.value) return;
  const el = scrollContainerRef.value.querySelector(`[data-event-id="${id}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
});

watch(scrollContainerRef, (el) => {
  resizeObserver?.disconnect();
  if (el) {
    containerWidth.value = el.clientWidth || 800;
    resizeObserver = new ResizeObserver((entries) => {
      containerWidth.value = entries[0].contentRect.width || 800;
    });
    resizeObserver.observe(el);
  }
});

onBeforeUnmount(() => { resizeObserver?.disconnect(); });

const zoomIn = () => { zoomLevel.value = Math.min(4, +(zoomLevel.value + 0.25).toFixed(2)); };
const zoomOut = () => { zoomLevel.value = Math.max(0.25, +(zoomLevel.value - 0.25).toFixed(2)); };

const toggleEpochFocus = (id: string) => {
  focusedEpochId.value = focusedEpochId.value === id ? null : id;
};

const visibleEvents = computed(() => {
  if (!focusedEpochId.value) return props.events;
  const epoch = props.epochs.find(e => e.id === focusedEpochId.value);
  if (!epoch) return props.events;
  return props.events.filter(ev => ev.date >= epoch.startDate && ev.date <= epoch.endDate);
});

// Lane assignment algorithm — greedy, avoids overlap
const CARD_W = 128; // w-32
const CARD_H = 56;
const CARD_GAP = 6;
const LABEL_W = 100;
const LABEL_H = 20;
const LABEL_GAP = 4;

interface LayoutItem {
  event: TimelineEvent;
  above: boolean;
  lane: number;
  connectorH: number;
}

function assignLanes(events: TimelineEvent[], itemW: number, itemH: number, gap: number): LayoutItem[] {
  if (events.length === 0) return [];
  // Track rightmost edge per lane. Lanes alternate: 0=above-lane0, 1=below-lane0, 2=above-lane1, etc.
  const laneEdges: number[] = []; // rightmost x+w for each lane

  return events.map((event) => {
    const cx = dateToPixel(event.date);
    const left = cx - itemW / 2;
    const right = cx + itemW / 2;

    // Try lanes in order: above-0, below-0, above-1, below-1, ...
    let assignedLane = 0;
    for (let l = 0; l < 20; l++) {
      if (laneEdges[l] === undefined || left >= laneEdges[l] + gap) {
        assignedLane = l;
        break;
      }
      // If we checked all existing lanes without finding space, use next new lane
      if (l === laneEdges.length - 1 || l === 19) {
        assignedLane = laneEdges.length;
        break;
      }
    }

    laneEdges[assignedLane] = right;

    const above = assignedLane % 2 === 0;
    const tier = Math.floor(assignedLane / 2);
    const connectorH = 6 + tier * (itemH + gap);

    return { event, above, lane: assignedLane, connectorH };
  });
}

const cardLayout = computed(() => assignLanes(visibleEvents.value, CARD_W, CARD_H, CARD_GAP));
const labelLayout = computed(() => assignLanes(visibleEvents.value, LABEL_W, LABEL_H, LABEL_GAP));

// Height adapts to lanes used
const maxCardLanes = computed(() => {
  const above = cardLayout.value.filter(e => e.above).reduce((m, e) => Math.max(m, Math.floor(e.lane / 2)), 0);
  const below = cardLayout.value.filter(e => !e.above).reduce((m, e) => Math.max(m, Math.floor(e.lane / 2)), 0);
  return { above: above + 1, below: below + 1 };
});

const maxLabelLanes = computed(() => {
  const above = labelLayout.value.filter(e => e.above).reduce((m, e) => Math.max(m, Math.floor(e.lane / 2)), 0);
  const below = labelLayout.value.filter(e => !e.above).reduce((m, e) => Math.max(m, Math.floor(e.lane / 2)), 0);
  return { above: above + 1, below: below + 1 };
});

const timelineHeight = computed(() => {
  if (props.showCards) {
    const { above, below } = maxCardLanes.value;
    const aboveH = above * (CARD_H + CARD_GAP) + 10;
    const belowH = below * (CARD_H + CARD_GAP) + 10;
    return aboveH + belowH + 20 + (props.showRuler ? 24 : 0);
  }
  const { above, below } = maxLabelLanes.value;
  const aboveH = above * (LABEL_H + LABEL_GAP) + 10;
  const belowH = below * (LABEL_H + LABEL_GAP) + 10;
  return aboveH + belowH + 20 + (props.showRuler ? 24 : 0);
});

const axisY = computed(() => {
  if (props.showCards) {
    const { above } = maxCardLanes.value;
    return above * (CARD_H + CARD_GAP) + 10;
  }
  const { above } = maxLabelLanes.value;
  return above * (LABEL_H + LABEL_GAP) + 10;
});

const PADDING_PX = 50;
const MIN_GAP_PX = 60;
const MAX_BASE_WIDTH = 4000;
const BREAK_THRESHOLD = 0.4;
const MS_PER_DAY = 86400000;

const toMs = (d: string) => new Date(d + 'T00:00:00').getTime();

const timelineDateRange = computed(() => {
  // When focused on an epoch, use only that epoch's range
  if (focusedEpochId.value) {
    const epoch = props.epochs.find(e => e.id === focusedEpochId.value);
    if (epoch) {
      const minMs = toMs(epoch.startDate);
      const maxMs = toMs(epoch.endDate);
      return { minMs, maxMs, rangeMs: maxMs - minMs };
    }
  }
  if (props.events.length === 0) return { minMs: 0, maxMs: 0, rangeMs: 0 };
  const allMs = [
    ...props.events.flatMap((e) => [e.date, e.endDate].filter(Boolean)),
    ...props.epochs.flatMap((e) => [e.startDate, e.endDate]),
  ].map((d) => toMs(d!));
  const minMs = Math.min(...allMs);
  const maxMs = Math.max(...allMs);
  return { minMs, maxMs, rangeMs: maxMs - minMs };
});

const minAdjacentGapMs = computed(() => {
  if (props.events.length < 2) return 0;
  let min = Infinity;
  for (let i = 1; i < props.events.length; i++) {
    const gap = toMs(props.events[i].date) - toMs(props.events[i - 1].date);
    if (gap > 0 && gap < min) min = gap;
  }
  return min === Infinity ? 0 : min;
});

const gaps = computed(() => {
  if (!props.axisBreaks || props.events.length < 2) return [];
  const { rangeMs } = timelineDateRange.value;
  if (rangeMs === 0) return [];
  const result: { startMs: number; endMs: number; gapMs: number }[] = [];
  for (let i = 1; i < props.events.length; i++) {
    const startMs = toMs(props.events[i - 1].date);
    const endMs = toMs(props.events[i].date);
    const gapMs = endMs - startMs;
    if (gapMs / rangeMs > BREAK_THRESHOLD) result.push({ startMs, endMs, gapMs });
  }
  return result;
});

const compressedRangeMs = computed(() => {
  const { rangeMs } = timelineDateRange.value;
  if (!props.axisBreaks || gaps.value.length === 0) return rangeMs;
  let removed = 0;
  for (const g of gaps.value) removed += g.gapMs * 0.9;
  return rangeMs - removed;
});

const baseTimelineWidth = computed(() => {
  const range = props.axisBreaks ? compressedRangeMs.value : timelineDateRange.value.rangeMs;
  const gap = minAdjacentGapMs.value;
  if (range === 0 || gap === 0) return containerWidth.value;
  const needed = (range / gap) * MIN_GAP_PX + PADDING_PX * 2;
  return Math.min(MAX_BASE_WIDTH, Math.max(containerWidth.value, Math.ceil(needed)));
});

const scaledTimelineWidth = computed(() =>
  Math.max(500, Math.ceil(baseTimelineWidth.value * zoomLevel.value))
);

const dateToPixel = (dateStr: string): number => {
  const { minMs, rangeMs } = timelineDateRange.value;
  const w = scaledTimelineWidth.value;
  const pad = PADDING_PX * zoomLevel.value;
  if (!dateStr) return pad;
  const dateMs = toMs(dateStr);
  if (rangeMs === 0) return w / 2;

  if (props.axisBreaks && gaps.value.length > 0) {
    let adjustedMs = dateMs - minMs;
    for (const g of gaps.value) {
      if (dateMs > g.endMs) adjustedMs -= g.gapMs * 0.9;
      else if (dateMs > g.startMs && dateMs <= g.endMs) adjustedMs -= (dateMs - g.startMs) * 0.9;
    }
    const usable = w - pad * 2;
    return pad + (adjustedMs / compressedRangeMs.value) * usable;
  }

  const usable = w - pad * 2;
  return pad + ((dateMs - minMs) / rangeMs) * usable;
};

const breakPositions = computed(() => {
  return gaps.value.map((g) => {
    const midMs = g.startMs + g.gapMs * 0.05;
    return { px: dateToPixel(new Date(midMs).toISOString().slice(0, 10)) };
  });
});

const timeTicks = computed(() => {
  const { minMs, rangeMs } = timelineDateRange.value;
  if (rangeMs === 0 || props.events.length === 0) return [];

  const totalDays = rangeMs / MS_PER_DAY;
  let stepDays: number;
  if (totalDays > 3650) stepDays = 365;
  else if (totalDays > 730) stepDays = 180;
  else if (totalDays > 365) stepDays = 90;
  else if (totalDays > 90) stepDays = 30;
  else if (totalDays > 30) stepDays = 7;
  else stepDays = 1;

  const ticks: { px: number; label: string }[] = [];
  for (let ms = minMs; ms <= minMs + rangeMs; ms += stepDays * MS_PER_DAY) {
    const d = new Date(ms);
    const dateStr = d.toISOString().slice(0, 10);
    const px = dateToPixel(dateStr);
    const label = stepDays >= 365
      ? d.getUTCFullYear().toString()
      : stepDays >= 28
        ? d.toLocaleDateString(undefined, { year: '2-digit', month: 'short' })
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    ticks.push({ px, label });
  }
  return ticks;
});
</script>
