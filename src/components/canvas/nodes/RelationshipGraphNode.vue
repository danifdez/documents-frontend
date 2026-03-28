<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="280" :min-height="220" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="relationshipGraph" :data="node.data"
      @update="onToolbarUpdate" />

    <div class="flex items-center justify-between px-3 pt-3 shrink-0">
      <div v-if="node.data.title" class="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        {{ node.data.title }}
      </div>
      <div class="flex gap-1">
        <select v-if="entityTypes.length > 1" v-model="filterType"
          class="text-[10px] px-1 py-0.5 rounded border border-border bg-surface">
          <option value="">All types</option>
          <option v-for="t in entityTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-if="predicateList.length > 1" v-model="filterPredicate"
          class="text-[10px] px-1 py-0.5 rounded border border-border bg-surface max-w-[100px]">
          <option value="">All</option>
          <option v-for="p in predicateList" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>
    </div>

    <div class="flex-1 min-h-0 relative">
      <canvas ref="canvasRef" class="w-full h-full" />
      <div v-if="!hasData" class="absolute inset-0 flex items-center justify-center text-xs text-text-muted">
        No relationship data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();
const { node } = useNode();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const filterType = ref('');
const filterPredicate = ref('');

const typeColors: Record<string, string> = {
  PERSON: '#6366f1', PER: '#6366f1',
  ORG: '#3b82f6', ORGANIZATION: '#3b82f6',
  GPE: '#10b981', LOCATION: '#10b981', LOC: '#10b981', GEOPOLITICAL: '#10b981',
  EVENT: '#f59e0b', WORK_OF_ART: '#ec4899', FACILITY: '#8b5cf6',
  PRODUCT: '#f97316', NATIONALITY: '#06b6d4',
  default: '#94a3b8',
};

interface SimNode { id: string; name: string; type: string; x: number; y: number; vx: number; vy: number; radius: number; }
interface SimLink { source: number; target: number; predicate: string; weight: number; }

let simNodes: SimNode[] = [];
let simLinks: SimLink[] = [];
let animFrame = 0;

const hasData = computed(() => {
  const entities = node.data.entities || [];
  return entities.length > 0;
});

const entityTypes = computed(() => {
  const types = new Set<string>();
  for (const e of (node.data.entities || [])) { if (e.type) types.add(e.type); }
  return Array.from(types).sort();
});

const predicateList = computed(() => {
  const preds = new Set<string>();
  for (const r of (node.data.relationships || [])) { if (r.predicate) preds.add(r.predicate); }
  return Array.from(preds).sort();
});

const filteredData = computed(() => {
  let entities: any[] = node.data.entities || [];
  let relationships: any[] = node.data.relationships || [];

  if (filterPredicate.value) {
    relationships = relationships.filter((r: any) => r.predicate === filterPredicate.value);
  }
  if (filterType.value) {
    const typeEntities = new Set(entities.filter((e: any) => e.type === filterType.value).map((e: any) => e.id || e.name));
    relationships = relationships.filter((r: any) => typeEntities.has(r.source) || typeEntities.has(r.target));
  }

  // Only keep entities used in filtered relationships
  const usedIds = new Set<string>();
  for (const r of relationships) { usedIds.add(String(r.source)); usedIds.add(String(r.target)); }
  entities = entities.filter((e: any) => usedIds.has(String(e.id || e.name)));

  return { entities, relationships };
});

const buildSimulation = () => {
  const { entities, relationships } = filteredData.value;
  if (!entities.length) return;

  const canvas = canvasRef.value;
  if (!canvas) return;
  const w = canvas.offsetWidth || 300;
  const h = canvas.offsetHeight || 200;

  const idxMap = new Map<string, number>();
  simNodes = entities.map((e: any, i: number) => {
    const key = String(e.id || e.name);
    idxMap.set(key, i);
    return {
      id: key, name: e.name, type: e.type || 'default',
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: 0, vy: 0, radius: Math.min(22, 7 + e.name.length * 0.5),
    };
  });

  simLinks = [];
  for (const r of relationships) {
    const si = idxMap.get(String(r.source));
    const ti = idxMap.get(String(r.target));
    if (si !== undefined && ti !== undefined) {
      simLinks.push({ source: si, target: ti, predicate: r.predicate || '', weight: r.confidence || r.weight || 1 });
    }
  }
  runSimulation(w, h);
};

const runSimulation = (w: number, h: number) => {
  let iterations = 0;
  const maxIterations = 140;
  const tick = () => {
    if (iterations >= maxIterations) { draw(w, h); return; }
    iterations++;
    const alpha = 1 - iterations / maxIterations;

    for (const n of simNodes) { n.vx += (w / 2 - n.x) * 0.01 * alpha; n.vy += (h / 2 - n.y) * 0.01 * alpha; }
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        let dx = simNodes[j].x - simNodes[i].x; let dy = simNodes[j].y - simNodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (900 * alpha) / (dist * dist);
        dx = (dx / dist) * force; dy = (dy / dist) * force;
        simNodes[i].vx -= dx; simNodes[i].vy -= dy; simNodes[j].vx += dx; simNodes[j].vy += dy;
      }
    }
    for (const l of simLinks) {
      const s = simNodes[l.source]; const t = simNodes[l.target];
      const dx = t.x - s.x; const dy = t.y - s.y; const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * 0.004 * alpha * (l.weight || 1);
      s.vx += (dx / dist) * force; s.vy += (dy / dist) * force;
      t.vx -= (dx / dist) * force; t.vy -= (dy / dist) * force;
    }
    for (const n of simNodes) {
      n.vx *= 0.8; n.vy *= 0.8; n.x += n.vx; n.y += n.vy;
      n.x = Math.max(n.radius + 5, Math.min(w - n.radius - 5, n.x));
      n.y = Math.max(n.radius + 5, Math.min(h - n.radius - 5, n.y));
    }
    draw(w, h);
    animFrame = requestAnimationFrame(tick);
  };
  tick();
};

const draw = (w: number, h: number) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

  // Links with arrows and labels
  for (const l of simLinks) {
    const s = simNodes[l.source]; const t = simNodes[l.target];
    const dx = t.x - s.x; const dy = t.y - s.y; const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = Math.min(2.5, 0.5 + l.weight * 0.5); ctx.stroke();

    // Arrow
    const arrowLen = 7; const angle = Math.atan2(dy, dx);
    const ex = t.x - (dx / dist) * t.radius; const ey = t.y - (dy / dist) * t.radius;
    ctx.beginPath(); ctx.moveTo(ex, ey);
    ctx.lineTo(ex - arrowLen * Math.cos(angle - 0.35), ey - arrowLen * Math.sin(angle - 0.35));
    ctx.lineTo(ex - arrowLen * Math.cos(angle + 0.35), ey - arrowLen * Math.sin(angle + 0.35));
    ctx.closePath(); ctx.fillStyle = 'rgba(148,163,184,0.5)'; ctx.fill();

    // Label
    if (l.predicate) {
      const mx = (s.x + t.x) / 2; const my = (s.y + t.y) / 2;
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--color-text-muted') || '#94a3b8';
      ctx.font = '7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const lbl = l.predicate.replace(/_/g, ' ');
      ctx.fillText(lbl.length > 16 ? lbl.slice(0, 15) + '...' : lbl, mx, my - 2);
    }
  }

  // Nodes
  for (const n of simNodes) {
    const color = typeColors[n.type.toUpperCase()] || typeColors.default;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fillStyle = color + '33'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--color-text-primary') || '#1e293b';
    ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const maxLen = 14;
    const label = n.name.length > maxLen ? n.name.slice(0, maxLen - 1) + '...' : n.name;
    ctx.fillText(label, n.x, n.y + n.radius + 3);
  }
};

const resizeObserver = new ResizeObserver(() => {
  if (canvasRef.value && hasData.value) { cancelAnimationFrame(animFrame); buildSimulation(); }
});

onMounted(() => {
  nextTick(() => {
    if (canvasRef.value) resizeObserver.observe(canvasRef.value);
    if (hasData.value) buildSimulation();
  });
});

onBeforeUnmount(() => { cancelAnimationFrame(animFrame); resizeObserver.disconnect(); });

watch(() => [node.data.entities, node.data.relationships], () => {
  cancelAnimationFrame(animFrame);
  if (hasData.value) nextTick(buildSimulation);
}, { deep: true });

watch([filterType, filterPredicate], () => {
  cancelAnimationFrame(animFrame);
  if (hasData.value) nextTick(buildSimulation);
});

const onToolbarUpdate = (updates: Record<string, any>) => { node.data = { ...node.data, ...updates }; };
</script>
