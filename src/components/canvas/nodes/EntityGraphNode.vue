<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="220" :min-height="180" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="entityGraph" :data="node.data"
      @update="onToolbarUpdate" />

    <div v-if="node.data.title" class="text-xs font-semibold text-text-secondary uppercase tracking-wider px-3 pt-3 shrink-0">
      {{ node.data.title }}
    </div>

    <div class="flex-1 min-h-0 relative">
      <canvas ref="canvasRef" class="w-full h-full" />
      <div v-if="!hasData" class="absolute inset-0 flex items-center justify-center text-xs text-text-muted">
        No entity data
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

const typeColors: Record<string, string> = {
  PERSON: '#6366f1', PER: '#6366f1',
  ORG: '#3b82f6', ORGANIZATION: '#3b82f6',
  GPE: '#10b981', LOCATION: '#10b981', LOC: '#10b981',
  EVENT: '#f59e0b',
  WORK: '#ec4899',
  DATE: '#14b8a6',
  default: '#94a3b8',
};

interface SimNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface SimLink {
  source: number;
  target: number;
  weight: number;
}

let simNodes: SimNode[] = [];
let simLinks: SimLink[] = [];
let animFrame = 0;

const hasData = computed(() => {
  const entities = node.data.entities || [];
  return entities.length > 0;
});

const buildSimulation = () => {
  const entities: { id: string; name: string; type: string }[] = node.data.entities || [];
  const links: { source: string; target: string; weight: number }[] = node.data.links || [];

  if (!entities.length) return;

  const canvas = canvasRef.value;
  if (!canvas) return;
  const w = canvas.offsetWidth || 300;
  const h = canvas.offsetHeight || 200;

  const idxMap = new Map<string, number>();
  simNodes = entities.map((e, i) => {
    idxMap.set(e.name, i);
    return {
      id: e.id || e.name,
      name: e.name,
      type: e.type || 'default',
      x: w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: 0,
      vy: 0,
      radius: Math.min(20, 6 + e.name.length * 0.5),
    };
  });

  simLinks = [];
  for (const l of links) {
    const si = idxMap.get(l.source);
    const ti = idxMap.get(l.target);
    if (si !== undefined && ti !== undefined) {
      simLinks.push({ source: si, target: ti, weight: l.weight || 1 });
    }
  }

  runSimulation(w, h);
};

const runSimulation = (w: number, h: number) => {
  let iterations = 0;
  const maxIterations = 120;

  const tick = () => {
    if (iterations >= maxIterations) {
      draw(w, h);
      return;
    }
    iterations++;

    const alpha = 1 - iterations / maxIterations;
    const repulsion = 800;
    const attraction = 0.005;
    const centerForce = 0.01;

    // Center force
    for (const n of simNodes) {
      n.vx += (w / 2 - n.x) * centerForce * alpha;
      n.vy += (h / 2 - n.y) * centerForce * alpha;
    }

    // Repulsion (all pairs)
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        let dx = simNodes[j].x - simNodes[i].x;
        let dy = simNodes[j].y - simNodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (repulsion * alpha) / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        simNodes[i].vx -= dx;
        simNodes[i].vy -= dy;
        simNodes[j].vx += dx;
        simNodes[j].vy += dy;
      }
    }

    // Attraction (links)
    for (const l of simLinks) {
      const s = simNodes[l.source];
      const t = simNodes[l.target];
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction * alpha * (l.weight || 1);
      s.vx += (dx / dist) * force;
      s.vy += (dy / dist) * force;
      t.vx -= (dx / dist) * force;
      t.vy -= (dy / dist) * force;
    }

    // Apply velocities with damping
    for (const n of simNodes) {
      n.vx *= 0.8;
      n.vy *= 0.8;
      n.x += n.vx;
      n.y += n.vy;
      // Bounds
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
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Draw links
  for (const l of simLinks) {
    const s = simNodes[l.source];
    const t = simNodes[l.target];
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = Math.min(3, 0.5 + l.weight * 0.5);
    ctx.stroke();
  }

  // Draw nodes
  for (const n of simNodes) {
    const color = typeColors[n.type.toUpperCase()] || typeColors.default;

    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--color-text-primary') || '#1e293b';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const maxLen = 14;
    const label = n.name.length > maxLen ? n.name.slice(0, maxLen - 1) + '…' : n.name;
    ctx.fillText(label, n.x, n.y + n.radius + 3);
  }
};

const resizeObserver = new ResizeObserver(() => {
  if (canvasRef.value && hasData.value) {
    cancelAnimationFrame(animFrame);
    buildSimulation();
  }
});

onMounted(() => {
  nextTick(() => {
    if (canvasRef.value) {
      resizeObserver.observe(canvasRef.value);
    }
    if (hasData.value) buildSimulation();
  });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animFrame);
  resizeObserver.disconnect();
});

watch(() => [node.data.entities, node.data.links], () => {
  cancelAnimationFrame(animFrame);
  if (hasData.value) nextTick(buildSimulation);
}, { deep: true });

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
