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
        <svg class="h-3.5 w-3.5 text-teal-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-xs font-semibold text-text-primary truncate">{{ node.data.timelineName || 'Timeline' }}</span>
      </div>
      <button @click="loadTimeline" :disabled="loading"
        class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer nodrag shrink-0"
        title="Refresh">
        <svg class="h-3 w-3" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24"
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
      <img v-else-if="timelineImage" :src="timelineImage" class="h-full max-w-none" style="object-fit: contain; min-width: 100%;" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';
import apiClient from '../../../services/api';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();
const { node } = useNode();

const loading = ref(false);
const error = ref<string | null>(null);
const events = ref<any[]>([]);
const epochs = ref<any[]>([]);
const timelineImage = ref<string | null>(null);
const contentEl = ref<HTMLElement | null>(null);

const filteredEvents = computed(() => {
  let evts = [...events.value];
  const mode = node.data.filterMode;

  if (mode === 'epoch' && node.data.epochId) {
    const epoch = epochs.value.find((e: any) => e.id === node.data.epochId);
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
    const res = await apiClient.get(`/timelines/${node.data.timelineId}`);
    events.value = res.data.timelineData || [];
    epochs.value = res.data.epochs || [];
    node.data.timelineName = res.data.name;
    renderImage();
  } catch (err: any) {
    error.value = err.message || 'Failed to load timeline';
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const renderImage = () => {
  const evts = sortedEvents.value;
  if (!evts.length) { timelineImage.value = null; return; }

  // Dynamic sizing
  const cardW = 180;
  const cardH = 68;
  const cardGap = 20;
  const minSpacePerEvent = cardW + cardGap;
  const padL = 60;
  const padR = 60;
  const padTop = 40;
  const padBot = 60;
  const breakW = 24; // width of axis break indicator

  // Parse dates and compute axis breaks
  const dates = evts.map(e => new Date(e.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);

  // Detect large gaps between consecutive events
  // A gap is "large" if it's > 3x the median gap
  const gaps: { after: number; gapMs: number }[] = [];
  const sortedDates = [...dates].sort((a, b) => a - b);
  const allGaps: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    allGaps.push(sortedDates[i] - sortedDates[i - 1]);
  }
  const medianGap = allGaps.length
    ? [...allGaps].sort((a, b) => a - b)[Math.floor(allGaps.length / 2)]
    : 0;
  const breakThreshold = medianGap * 3;

  interface AxisBreak { afterDate: number; beforeDate: number; gapMs: number }
  const axisBreaks: AxisBreak[] = [];
  if (allGaps.length >= 2 && breakThreshold > 0) {
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = sortedDates[i] - sortedDates[i - 1];
      if (gap > breakThreshold) {
        axisBreaks.push({ afterDate: sortedDates[i - 1], beforeDate: sortedDates[i], gapMs: gap });
      }
    }
  }

  // Compute compressed total range: replace each break gap with a small fixed visual gap
  const compressedGapMs = medianGap || 86400000; // each break becomes this much time visually
  const totalRemoved = axisBreaks.reduce((s, b) => s + b.gapMs - compressedGapMs, 0);
  const fullRange = (maxDate - minDate) || 86400000;
  const compressedRange = fullRange - totalRemoved;

  const W = Math.max(800, padL + padR + evts.length * minSpacePerEvent);
  const H = 520;
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const axisY = H / 2 + 10;
  const usableW = W - padL - padR - axisBreaks.length * breakW;

  // Map date to X with compressed gaps
  const dateToX = (d: string | number) => {
    const t = typeof d === 'number' ? d : new Date(d).getTime();
    if (evts.length === 1) return padL + (usableW + axisBreaks.length * breakW) / 2;

    // How much compressed time is before t
    let compressed = t - minDate;
    let breaksBeforeCount = 0;
    for (const b of axisBreaks) {
      if (t > b.beforeDate) {
        compressed -= (b.gapMs - compressedGapMs);
        breaksBeforeCount++;
      } else if (t > b.afterDate) {
        // Inside a break zone: clamp to start of break
        compressed -= (t - b.afterDate - compressedGapMs);
        breaksBeforeCount++;
      }
    }

    const ratio = compressedRange > 0 ? compressed / compressedRange : 0.5;
    return padL + ratio * usableW + breaksBeforeCount * breakW;
  };

  // Find X positions of axis breaks for drawing
  const breakPositions: { x: number }[] = [];
  for (const b of axisBreaks) {
    const xAfter = dateToX(b.afterDate);
    breakPositions.push({ x: xAfter + (dateToX(b.beforeDate) - xAfter) / 2 });
  }

  // Epoch bands
  const visibleEpochs = epochs.value.filter((ep: any) => {
    const epStart = new Date(ep.startDate).getTime();
    const epEnd = new Date(ep.endDate).getTime();
    return epEnd >= minDate && epStart <= maxDate;
  });
  for (const ep of visibleEpochs) {
    const x1 = Math.max(padL, dateToX(ep.startDate));
    const x2 = Math.min(W - padR, dateToX(ep.endDate));
    if (x2 > x1) {
      ctx.fillStyle = ep.color || 'rgba(99,102,241,0.08)';
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x1, padTop, x2 - x1, H - padTop - padBot);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ep.name, x1 + 6, padTop + 16);
    }
  }

  // Axis line (with breaks)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  if (breakPositions.length === 0) {
    ctx.beginPath();
    ctx.moveTo(padL - 10, axisY);
    ctx.lineTo(W - padR + 10, axisY);
    ctx.stroke();
  } else {
    // Draw segments between breaks
    const segments: { from: number; to: number }[] = [];
    let segStart = padL - 10;
    for (const bp of breakPositions) {
      segments.push({ from: segStart, to: bp.x - breakW / 2 });
      segStart = bp.x + breakW / 2;
    }
    segments.push({ from: segStart, to: W - padR + 10 });

    for (const seg of segments) {
      ctx.beginPath();
      ctx.moveTo(seg.from, axisY);
      ctx.lineTo(seg.to, axisY);
      ctx.stroke();
    }

    // Draw zigzag break indicators
    for (const bp of breakPositions) {
      const bx = bp.x - breakW / 2;
      const zh = 8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 2, axisY - zh - 4, breakW + 4, zh * 2 + 8);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, axisY - zh);
      ctx.lineTo(bx + breakW * 0.25, axisY + zh);
      ctx.lineTo(bx + breakW * 0.5, axisY - zh);
      ctx.lineTo(bx + breakW * 0.75, axisY + zh);
      ctx.lineTo(bx + breakW, axisY - zh);
      ctx.stroke();
    }
  }

  // Time ticks — place one per event position for clarity
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  // Use evenly-spaced ticks based on compressed range
  const tickCount = Math.min(10, Math.max(4, Math.floor((usableW + axisBreaks.length * breakW) / 140)));
  for (let i = 0; i <= tickCount; i++) {
    const t = minDate + (fullRange * i) / tickCount;
    const x = dateToX(t);
    // Skip ticks that land on break zones
    const onBreak = breakPositions.some(bp => Math.abs(x - bp.x) < breakW);
    if (onBreak) continue;
    ctx.beginPath();
    ctx.moveTo(x, axisY - 4);
    ctx.lineTo(x, axisY + 4);
    ctx.stroke();
    const d = new Date(t);
    ctx.fillText(d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }), x, axisY + 22);
  }

  // Assign lanes with proper overlap avoidance
  type Lane = { x: number; right: number; row: number };
  const lanesAbove: Lane[] = [];
  const lanesBelow: Lane[] = [];

  const assignLane = (x: number, preferAbove: boolean): { above: boolean; row: number } => {
    const tryAssign = (lanes: Lane[], above: boolean): number | null => {
      for (let row = 0; row < 3; row++) {
        const overlapping = lanes.some(l => l.row === row && x < l.right + cardGap && x + cardW > l.x - cardGap);
        if (!overlapping) {
          lanes.push({ x: x - cardW / 2, right: x + cardW / 2, row });
          return row;
        }
      }
      return null;
    };

    const primary = preferAbove ? lanesAbove : lanesBelow;
    const secondary = preferAbove ? lanesBelow : lanesAbove;
    let row = tryAssign(primary, preferAbove);
    if (row !== null) return { above: preferAbove, row };
    row = tryAssign(secondary, !preferAbove);
    if (row !== null) return { above: !preferAbove, row };
    // fallback
    const lanes = preferAbove ? lanesAbove : lanesBelow;
    lanes.push({ x: x - cardW / 2, right: x + cardW / 2, row: 0 });
    return { above: preferAbove, row: 0 };
  };

  for (let i = 0; i < evts.length; i++) {
    const ev = evts[i];
    const x = dateToX(ev.date);
    const color = ev.color || '#6366f1';

    const { above, row } = assignLane(x, i % 2 === 0);
    const gap = 20;
    const cardY = above
      ? axisY - gap - cardH - row * (cardH + 8)
      : axisY + gap + row * (cardH + 8);

    // Connector line
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, axisY);
    ctx.lineTo(x, above ? cardY + cardH : cardY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Range bar
    if (ev.endDate) {
      const x2 = dateToX(ev.endDate);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.25;
      roundRect(ctx, Math.min(x, x2), axisY - 3, Math.abs(x2 - x), 6, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Dot on axis
    ctx.beginPath();
    ctx.arc(x, axisY, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Card shadow
    const cardX = x - cardW / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    roundRect(ctx, cardX + 1, cardY + 2, cardW, cardH, 8);
    ctx.fill();

    // Card background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Color accent bar (left)
    ctx.fillStyle = color;
    roundRect(ctx, cardX, cardY, 4, cardH, { tl: 8, bl: 8, tr: 0, br: 0 });
    ctx.fill();

    // Card text
    const textX = cardX + 12;
    const textW = cardW - 20;

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const dateLabel = formatDate(ev.date) + (ev.endDate ? '  —  ' + formatDate(ev.endDate) : '');
    ctx.fillText(truncText(ctx, dateLabel, textW), textX, cardY + 16);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(truncText(ctx, ev.title || ev.label || '', textW), textX, cardY + 34);

    if (ev.description) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(truncText(ctx, ev.description, textW), textX, cardY + 50);
    }
  }

  timelineImage.value = canvas.toDataURL('image/png');
};

const truncText = (ctx: CanvasRenderingContext2D, text: string, maxW: number) => {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '...').width > maxW) t = t.slice(0, -1);
  return t + '...';
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | { tl: number; tr: number; bl: number; br: number }) => {
  const radii = typeof r === 'number' ? { tl: r, tr: r, bl: r, br: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + radii.tl, y);
  ctx.lineTo(x + w - radii.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii.tr);
  ctx.lineTo(x + w, y + h - radii.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii.br, y + h);
  ctx.lineTo(x + radii.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii.bl);
  ctx.lineTo(x, y + radii.tl);
  ctx.quadraticCurveTo(x, y, x + radii.tl, y);
  ctx.closePath();
};

onMounted(() => {
  if (node.data.timelineId) loadTimeline();
});

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
