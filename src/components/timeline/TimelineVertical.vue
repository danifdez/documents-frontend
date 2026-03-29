<template>
  <div class="flex-1 min-h-0 overflow-auto px-2 py-4" ref="scrollContainerRef" data-timeline-export
    <!-- Epoch filter chips -->
    <div v-if="epochs.length > 0" class="flex items-center gap-1.5 mb-3 max-w-3xl mx-auto">
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
    </div>

    <div class="relative max-w-3xl mx-auto flex">
      <!-- Time marks — LEFT lateral ruler -->
      <div v-if="showRuler" class="w-14 shrink-0 relative" :style="{ height: totalHeight + 'px' }">
        <div class="absolute right-0 top-0 w-px bg-border/60" :style="{ height: totalHeight + 'px' }"></div>
        <div
          v-for="tick in timeTicks"
          :key="'tick-' + tick.label"
          class="absolute right-0"
          :style="{ top: tick.py + 'px' }"
        >
          <div class="h-px w-2 bg-text-muted/50 float-right"></div>
          <span class="absolute right-3 text-[8px] text-text-muted whitespace-nowrap -translate-y-1/2">{{ tick.label }}</span>
        </div>
      </div>

      <!-- Timeline content -->
      <div class="flex-1 relative" :style="{ height: totalHeight + 'px' }">
        <!-- Vertical line -->
        <div class="absolute left-1/2 top-0 w-px bg-border -translate-x-1/2" :style="{ height: totalHeight + 'px' }"></div>

        <!-- Inline time marks — on the axis -->
        <template v-if="showInlineMarks">
          <div
            v-for="tick in timeTicks"
            :key="'inline-' + tick.label"
            class="absolute z-10"
            :style="{ top: tick.py + 'px', left: 'calc(50% - 10px)', width: '20px' }"
          >
            <div class="h-px w-full bg-text-muted/50"></div>
            <span class="absolute left-full ml-1.5 top-0 text-[8px] text-text-muted whitespace-nowrap -translate-y-1/2">{{ tick.label }}</span>
          </div>
        </template>

        <!-- Epoch bands -->
        <template v-for="(epoch, eIdx) in epochs" :key="'epoch-' + epoch.id">
          <div
            class="absolute cursor-pointer hover:opacity-90 transition-opacity left-0 right-0 rounded"
            :style="{
              top: dateToY(epoch.startDate) + 'px',
              height: Math.max(8, dateToY(epoch.endDate) - dateToY(epoch.startDate)) + 'px',
              backgroundColor: epoch.color,
              display: focusedEpochId && focusedEpochId !== epoch.id ? 'none' : undefined,
            }"
            @click="$emit('edit-epoch', epoch)"
          >
            <span class="absolute top-0.5 left-1.5 text-[9px] font-semibold text-text-primary/70 whitespace-nowrap">
              {{ epoch.name }}
            </span>
          </div>
        </template>

        <!-- Axis break indicators -->
        <template v-if="axisBreaks">
          <div
            v-for="(brk, i) in breakPositions"
            :key="'break-' + i"
            class="absolute left-1/2 -translate-x-1/2 z-30 flex items-center justify-center"
            :style="{ top: (brk.py - 10) + 'px', width: '24px', height: '20px' }"
          >
            <svg width="24" height="20" viewBox="0 0 24 20">
              <path d="M0 3 L8 7 L0 11 L8 15" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" />
              <path d="M16 3 L24 7 L16 11 L24 15" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </div>
        </template>

        <!-- Marker dots (always visible on the axis) -->
        <template v-for="event in visibleEvents" :key="'dot-' + event.id">
          <div
            :data-event-id="event.id"
            class="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 shadow-sm z-20 cursor-pointer ring-1 hover:ring-accent/60 transition-all"
            :class="highlightedEventId === event.id ? 'ring-accent ring-2 border-accent scale-150' : 'ring-border border-white'"
            :style="{
              top: (dateToY(event.date) - 5) + 'px',
              backgroundColor: event.color,
            }"
            @click="$emit('edit-event', event)"
          ></div>
        </template>

        <!-- CARDS MODE with lane assignment -->
        <template v-if="showCards">
          <template v-for="el in cardLayout" :key="'card-' + el.event.id">
            <!-- Horizontal connector from dot to card -->
            <div
              class="absolute bg-border z-10"
              :style="{
                top: (dateToY(el.event.date) - 0.5) + 'px',
                height: '1px',
                ...(el.left
                  ? { right: 'calc(50% + 5px)', width: el.connectorW + 'px' }
                  : { left: 'calc(50% + 5px)', width: el.connectorW + 'px' }),
              }"
            ></div>

            <!-- Card -->
            <div
              class="absolute z-10"
              :style="{
                top: (dateToY(el.event.date) - 20) + 'px',
                width: CARD_W + 'px',
                ...(el.left
                  ? { right: 'calc(50% + ' + (5 + el.connectorW) + 'px)' }
                  : { left: 'calc(50% + ' + (5 + el.connectorW) + 'px)' }),
              }"
            >
              <TimelineEventCard :event="el.event" @click="$emit('edit-event', el.event)" />
            </div>
          </template>
        </template>

        <!-- COMPACT MODE with lane assignment -->
        <template v-else>
          <template v-for="el in labelLayout" :key="'label-' + el.event.id">
            <!-- Horizontal connector -->
            <div
              class="absolute z-10"
              :style="{
                top: (dateToY(el.event.date) - 0.5) + 'px',
                height: '1px',
                backgroundColor: el.event.color,
                opacity: 0.4,
                ...(el.left
                  ? { right: 'calc(50% + 5px)', width: el.connectorW + 'px' }
                  : { left: 'calc(50% + 5px)', width: el.connectorW + 'px' }),
              }"
            ></div>

            <!-- Label -->
            <div
              class="absolute z-10 flex items-center gap-1.5"
              :style="{
                top: (dateToY(el.event.date) - 10) + 'px',
                ...(el.left
                  ? { right: 'calc(50% + ' + (5 + el.connectorW) + 'px)', flexDirection: 'row-reverse' }
                  : { left: 'calc(50% + ' + (5 + el.connectorW) + 'px)' }),
              }"
            >
              <span
                class="text-[10px] font-medium text-text-primary cursor-pointer hover:text-accent transition-colors truncate max-w-[140px] px-1.5 py-0.5 rounded-sm hover:bg-surface-hover"
                :style="el.left
                  ? { borderRight: '2px solid ' + el.event.color }
                  : { borderLeft: '2px solid ' + el.event.color }"
                @click="$emit('edit-event', el.event)"
              >{{ el.event.title }}</span>
              <span class="text-[8px] text-text-muted font-mono shrink-0">{{ formatDateShort(el.event.date) }}</span>
            </div>
          </template>
        </template>

        <!-- End cap -->
        <div v-if="visibleEvents.length > 0" class="absolute left-1/2 -translate-x-1/2"
          :style="{ top: totalHeight + 'px' }">
          <div class="w-1.5 h-1.5 rounded-full bg-border"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import type { TimelineEvent, TimelineEpoch } from '../../types/timeline';
import TimelineEventCard from './TimelineEventCard.vue';

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
const containerHeight = ref(600);
const focusedEpochId = ref<string | null>(null);
let resizeObserver: ResizeObserver | null = null;

// Scroll to highlighted event
watch(() => props.highlightedEventId, (id) => {
  if (!id || !scrollContainerRef.value) return;
  const el = scrollContainerRef.value.querySelector(`[data-event-id="${id}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
});

watch(scrollContainerRef, (el) => {
  resizeObserver?.disconnect();
  if (el) {
    containerHeight.value = el.clientHeight || 600;
    resizeObserver = new ResizeObserver((entries) => {
      containerHeight.value = entries[0].contentRect.height || 600;
    });
    resizeObserver.observe(el);
  }
});

onBeforeUnmount(() => { resizeObserver?.disconnect(); });

const toggleEpochFocus = (id: string) => {
  focusedEpochId.value = focusedEpochId.value === id ? null : id;
};

const visibleEvents = computed(() => {
  if (!focusedEpochId.value) return props.events;
  const epoch = props.epochs.find(e => e.id === focusedEpochId.value);
  if (!epoch) return props.events;
  return props.events.filter(ev => ev.date >= epoch.startDate && ev.date <= epoch.endDate);
});

// Sizing constants
const CARD_W = 160;
const CARD_H = 48;
const CARD_GAP = 4;
const LABEL_W = 160;
const LABEL_H = 22;
const LABEL_GAP = 2;
const PADDING_PX = 30;
const MIN_PX_PER_SMALLEST_GAP = 10; // proportional scale: smallest time gap = at least this many px
const BREAK_THRESHOLD = 0.4;
const MS_PER_DAY = 86400000;

const toMs = (d: string) => new Date(d + 'T00:00:00').getTime();

const timelineDateRange = computed(() => {
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
  const events = visibleEvents.value;
  if (events.length < 2) return 0;
  let min = Infinity;
  for (let i = 1; i < events.length; i++) {
    const gap = toMs(events[i].date) - toMs(events[i - 1].date);
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

// Total height: proportional so smallest adjacent gap = MIN_PX_PER_SMALLEST_GAP
const totalHeight = computed(() => {
  const { rangeMs } = timelineDateRange.value;
  const effectiveRange = (props.axisBreaks && compressedRangeMs.value > 0) ? compressedRangeMs.value : rangeMs;
  const gap = minAdjacentGapMs.value;
  if (effectiveRange === 0 || gap === 0) {
    return Math.max(containerHeight.value, visibleEvents.value.length * 60 + PADDING_PX * 2);
  }
  const needed = (effectiveRange / gap) * MIN_PX_PER_SMALLEST_GAP + PADDING_PX * 2;
  return Math.max(containerHeight.value, Math.ceil(needed));
});

// Pure proportional Y position — scale is never distorted
const dateToY = (dateStr: string): number => {
  const { minMs, rangeMs } = timelineDateRange.value;
  if (!dateStr || rangeMs === 0) return PADDING_PX;
  const dateMs = toMs(dateStr);
  const effectiveRange = (props.axisBreaks && compressedRangeMs.value > 0) ? compressedRangeMs.value : rangeMs;

  let adjustedMs = dateMs - minMs;
  if (props.axisBreaks && gaps.value.length > 0) {
    for (const g of gaps.value) {
      if (dateMs > g.endMs) adjustedMs -= g.gapMs * 0.9;
      else if (dateMs > g.startMs && dateMs <= g.endMs) adjustedMs -= (dateMs - g.startMs) * 0.9;
    }
  }

  const usable = totalHeight.value - PADDING_PX * 2;
  return PADDING_PX + (adjustedMs / effectiveRange) * usable;
};

// Lane assignment — same approach as horizontal but left/right instead of above/below
interface LayoutItem {
  event: TimelineEvent;
  left: boolean; // true = left side, false = right side
  lane: number;
  connectorW: number; // horizontal connector width
}

function assignLanes(events: TimelineEvent[], itemH: number, gap: number): LayoutItem[] {
  if (events.length === 0) return [];
  // Track the lowest edge (bottom Y) per lane
  // Lanes: 0=left-lane0, 1=right-lane0, 2=left-lane1, 3=right-lane1, ...
  const laneBottoms: number[] = [];

  return events.map((event) => {
    const cy = dateToY(event.date);
    const top = cy - itemH / 2;
    const bottom = cy + itemH / 2;

    let assignedLane = 0;
    for (let l = 0; l < 20; l++) {
      if (laneBottoms[l] === undefined || top >= laneBottoms[l] + gap) {
        assignedLane = l;
        break;
      }
      if (l === laneBottoms.length - 1 || l === 19) {
        assignedLane = laneBottoms.length;
        break;
      }
    }

    laneBottoms[assignedLane] = bottom;

    const left = assignedLane % 2 === 0;
    const tier = Math.floor(assignedLane / 2);
    const connectorW = 8 + tier * (itemH + gap + 4);

    return { event, left, lane: assignedLane, connectorW };
  });
}

const cardLayout = computed(() => assignLanes(visibleEvents.value, CARD_H, CARD_GAP));
const labelLayout = computed(() => assignLanes(visibleEvents.value, LABEL_H, LABEL_GAP));

const breakPositions = computed(() => {
  return gaps.value.map((g) => {
    const midMs = g.startMs + g.gapMs * 0.05;
    return { py: dateToY(new Date(midMs).toISOString().slice(0, 10)) };
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

  const ticks: { py: number; label: string }[] = [];
  for (let ms = minMs; ms <= minMs + rangeMs; ms += stepDays * MS_PER_DAY) {
    const d = new Date(ms);
    const dateStr = d.toISOString().slice(0, 10);
    const py = dateToY(dateStr);
    const label = stepDays >= 365
      ? d.getUTCFullYear().toString()
      : stepDays >= 28
        ? d.toLocaleDateString(undefined, { year: '2-digit', month: 'short' })
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    ticks.push({ py, label });
  }
  return ticks;
});

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
</script>
