<template>
    <div class="px-6 py-4 h-screen flex flex-col overflow-hidden">
        <!-- Header -->
        <Breadcrumb :items="breadcrumbItems" />
        <div class="flex items-center justify-between mb-3 shrink-0">
            <div class="flex items-center gap-3">
                <h1 class="text-lg font-bold text-text-primary">Relationships</h1>
            </div>
            <div class="flex items-center gap-3">
                <!-- View toggle -->
                <div class="flex gap-1">
                    <button @click="viewMode = 'graph'" :class="viewMode === 'graph' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary'" class="px-3 py-1.5 rounded text-xs font-medium transition-colors">
                        Graph
                    </button>
                    <button @click="viewMode = 'table'" :class="viewMode === 'table' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary'" class="px-3 py-1.5 rounded text-xs font-medium transition-colors">
                        Table
                    </button>
                </div>
                <button @click="refresh" :disabled="isLoading" class="px-3 py-1.5 rounded text-xs font-medium bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
                    Refresh
                </button>
            </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-3 mb-2 shrink-0">
            <!-- Resource filter -->
            <div class="flex items-center gap-2">
                <label class="text-xs text-text-secondary">Resources:</label>
                <select v-model="selectedResourceId" class="px-2 py-1 rounded border border-border bg-surface text-sm min-w-[160px]">
                    <option :value="0">All resources</option>
                    <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</option>
                </select>
            </div>
            <!-- Entity type filter -->
            <div class="flex items-center gap-2">
                <label class="text-xs text-text-secondary">Entity type:</label>
                <select v-model="selectedEntityType" class="px-2 py-1 rounded border border-border bg-surface text-sm">
                    <option value="">All types</option>
                    <option v-for="t in entityTypes" :key="t" :value="t">{{ t }}</option>
                </select>
            </div>
            <!-- Predicate filter -->
            <div class="flex items-center gap-2">
                <label class="text-xs text-text-secondary">Predicate:</label>
                <select v-model="selectedPredicate" class="px-2 py-1 rounded border border-border bg-surface text-sm">
                    <option value="">All predicates</option>
                    <option v-for="p in predicates" :key="p" :value="p">{{ p }}</option>
                </select>
            </div>
            <div class="text-xs text-text-muted">
                {{ filteredRelationships.length }} relationships, {{ filteredEntities.length }} entities
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex-1 flex items-center justify-center">
            <div class="text-sm text-text-muted">Loading relationships...</div>
        </div>

        <!-- Empty -->
        <div v-else-if="data.relationships.length === 0" class="flex-1 flex items-center justify-center">
            <div class="text-sm text-text-muted">No relationships found for this project</div>
        </div>

        <!-- Graph view -->
        <div v-else-if="viewMode === 'graph'" class="flex-1 min-h-0 rounded-lg border border-border overflow-hidden relative">
            <canvas ref="canvasRef" class="w-full h-full cursor-grab active:cursor-grabbing"
                @wheel.prevent="onWheel" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" />
            <div class="absolute bottom-3 right-3 flex flex-col gap-1">
                <button @click="zoomIn" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary text-sm font-bold">+</button>
                <button @click="zoomOut" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary text-sm font-bold">-</button>
                <button @click="zoomToFit" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary" title="Fit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>
            </div>
            <div class="absolute bottom-3 left-3 text-[10px] text-text-muted">{{ Math.round(zoom * 100) }}%</div>
        </div>

        <!-- Table view -->
        <div v-else class="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border">
            <table class="w-full text-sm">
                <thead class="sticky top-0 bg-surface">
                    <tr class="border-b border-border">
                        <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Subject</th>
                        <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Relationship</th>
                        <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Object</th>
                        <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Confidence</th>
                        <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Resource</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(rel, idx) in filteredRelationships" :key="idx" class="border-b border-border hover:bg-surface-elevated transition-colors">
                        <td class="px-4 py-2">
                            <span class="inline-flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: getEntityColor(getEntityType(rel.source)) }"></span>
                                {{ getEntityName(rel.source) }}
                            </span>
                        </td>
                        <td class="px-4 py-2">
                            <span class="px-2 py-0.5 rounded bg-surface-elevated text-xs font-mono">{{ rel.predicate }}</span>
                        </td>
                        <td class="px-4 py-2">
                            <span class="inline-flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: getEntityColor(getEntityType(rel.target)) }"></span>
                                {{ getEntityName(rel.target) }}
                            </span>
                        </td>
                        <td class="px-4 py-2 text-text-muted">{{ Math.round((rel.confidence || 0) * 100) }}%</td>
                        <td class="px-4 py-2 text-text-muted">
                            <router-link v-if="rel.resource_id" :to="`/resource/${rel.resource_id}`" class="text-accent hover:underline">
                                {{ getResourceName(rel.resource_id) }}
                            </router-link>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useRelationships } from '../services/relationships/useRelationships';
import apiClient from '../services/api';
import Breadcrumb from '../components/ui/Breadcrumb.vue';

const route = useRoute();
const projectId = computed(() => Number(route.params.id));
const projectName = ref('');
const resources = ref<{ id: number; name: string }[]>([]);

const breadcrumbItems = computed(() => {
  const items: { name: string; path?: string }[] = [];
  if (projectName.value) {
    items.push({ name: projectName.value, path: `/project/${projectId.value}` });
  }
  items.push({ name: 'Relationships' });
  return items;
});

const { isLoading, data, fetchByProject } = useRelationships();

const viewMode = ref<'graph' | 'table'>('graph');
const selectedResourceId = ref(0);
const selectedEntityType = ref('');
const selectedPredicate = ref('');
const canvasRef = ref<HTMLCanvasElement | null>(null);

const typeColors: Record<string, string> = {
    PERSON: '#6366f1', PER: '#6366f1',
    ORG: '#3b82f6', ORGANIZATION: '#3b82f6',
    GPE: '#10b981', LOCATION: '#10b981', LOC: '#10b981', GEOPOLITICAL: '#10b981',
    EVENT: '#f59e0b',
    WORK_OF_ART: '#ec4899',
    FACILITY: '#8b5cf6',
    PRODUCT: '#f97316',
    NATIONALITY: '#06b6d4',
    default: '#94a3b8',
};

const getEntityColor = (type: string) => typeColors[type?.toUpperCase()] || typeColors.default;
const getEntityName = (id: number | string) => data.value.entities.find(e => e.id === id)?.name || String(id);
const getEntityType = (id: number | string) => data.value.entities.find(e => e.id === id)?.type || '';
const getResourceName = (id: number) => resources.value.find(r => r.id === id)?.name || `Resource #${id}`;

const entityTypes = computed(() => {
    const types = new Set<string>();
    for (const e of data.value.entities) { if (e.type) types.add(e.type); }
    return Array.from(types).sort();
});

const predicates = computed(() => {
    const preds = new Set<string>();
    for (const r of data.value.relationships) { if (r.predicate) preds.add(r.predicate); }
    return Array.from(preds).sort();
});

const filteredRelationships = computed(() => {
    let rels = data.value.relationships;
    if (selectedResourceId.value) rels = rels.filter(r => r.resource_id === selectedResourceId.value);
    if (selectedPredicate.value) rels = rels.filter(r => r.predicate === selectedPredicate.value);
    if (selectedEntityType.value) {
        const ids = new Set(data.value.entities.filter(e => e.type === selectedEntityType.value).map(e => e.id));
        rels = rels.filter(r => ids.has(r.source) || ids.has(r.target));
    }
    return rels;
});

const filteredEntities = computed(() => {
    const usedIds = new Set<number | string>();
    for (const r of filteredRelationships.value) { usedIds.add(r.source); usedIds.add(r.target); }
    return data.value.entities.filter(e => usedIds.has(e.id));
});

const refresh = async () => {
    const resourceIds = selectedResourceId.value ? [selectedResourceId.value] : undefined;
    await fetchByProject(projectId.value, resourceIds);
    if (viewMode.value === 'graph') nextTick(buildGraph);
};

const loadProjectInfo = async () => {
    try { const res = await apiClient.get(`/projects/${projectId.value}`); projectName.value = res.data.name; } catch { }
    try { const res = await apiClient.get(`/resources/project/${projectId.value}`); resources.value = (res.data || []).map((r: any) => ({ id: r.id, name: r.name })); } catch { }
};

// --- Zoom & Pan ---
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartPanX = 0;
let panStartPanY = 0;

const zoomIn = () => { zoom.value = Math.min(zoom.value * 1.25, 5); drawFrame(); };
const zoomOut = () => { zoom.value = Math.max(zoom.value / 1.25, 0.2); drawFrame(); };

const zoomToFit = () => {
    if (!simNodes.length || !canvasRef.value) return;
    const w = canvasRef.value.offsetWidth;
    const h = canvasRef.value.offsetHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of simNodes) {
        minX = Math.min(minX, n.x - n.radius - 40);
        minY = Math.min(minY, n.y - n.radius - 40);
        maxX = Math.max(maxX, n.x + n.radius + 40);
        maxY = Math.max(maxY, n.y + n.radius + 40);
    }
    const gw = maxX - minX || 1;
    const gh = maxY - minY || 1;
    zoom.value = Math.min((w - 60) / gw, (h - 60) / gh, 3);
    panX.value = (w / 2) - ((minX + maxX) / 2) * zoom.value;
    panY.value = (h / 2) - ((minY + maxY) / 2) * zoom.value;
    drawFrame();
};

const onWheel = (e: WheelEvent) => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZoom = zoom.value;
    zoom.value = Math.max(0.15, Math.min(5, zoom.value * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    panX.value = mx - (mx - panX.value) * (zoom.value / oldZoom);
    panY.value = my - (my - panY.value) * (zoom.value / oldZoom);
    drawFrame();
};

const onMouseDown = (e: MouseEvent) => { isPanning = true; panStartX = e.clientX; panStartY = e.clientY; panStartPanX = panX.value; panStartPanY = panY.value; };
const onMouseMove = (e: MouseEvent) => { if (!isPanning) return; panX.value = panStartPanX + (e.clientX - panStartX); panY.value = panStartPanY + (e.clientY - panStartY); drawFrame(); };
const onMouseUp = () => { isPanning = false; };

// --- Graph rendering ---
interface SimNode { id: number | string; name: string; type: string; x: number; y: number; vx: number; vy: number; radius: number; }
interface SimLink { source: number; target: number; predicate: string; weight: number; }
let simNodes: SimNode[] = [];
let simLinks: SimLink[] = [];
let animFrame = 0;
const SIM_W = 1400;
const SIM_H = 1000;

const buildGraph = () => {
    const ents = filteredEntities.value;
    const rels = filteredRelationships.value;
    if (!ents.length || !canvasRef.value) return;

    const idxMap = new Map<number | string, number>();
    simNodes = ents.map((e, i) => {
        idxMap.set(e.id, i);
        return { id: e.id, name: e.name, type: e.type || 'default',
            x: SIM_W / 2 + (Math.random() - 0.5) * SIM_W * 0.6,
            y: SIM_H / 2 + (Math.random() - 0.5) * SIM_H * 0.6,
            vx: 0, vy: 0, radius: Math.min(32, 12 + e.name.length * 0.6) };
    });

    simLinks = [];
    for (const r of rels) {
        const si = idxMap.get(r.source); const ti = idxMap.get(r.target);
        if (si !== undefined && ti !== undefined) simLinks.push({ source: si, target: ti, predicate: r.predicate, weight: r.confidence || 1 });
    }
    runSimulation();
};

const runSimulation = () => {
    let iterations = 0;
    const maxIter = 220;
    const tick = () => {
        if (iterations >= maxIter) { zoomToFit(); return; }
        iterations++;
        const alpha = 1 - iterations / maxIter;

        for (const n of simNodes) { n.vx += (SIM_W / 2 - n.x) * 0.008 * alpha; n.vy += (SIM_H / 2 - n.y) * 0.008 * alpha; }
        for (let i = 0; i < simNodes.length; i++) for (let j = i + 1; j < simNodes.length; j++) {
            let dx = simNodes[j].x - simNodes[i].x, dy = simNodes[j].y - simNodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (1500 * alpha) / (dist * dist);
            dx = (dx / dist) * force; dy = (dy / dist) * force;
            simNodes[i].vx -= dx; simNodes[i].vy -= dy; simNodes[j].vx += dx; simNodes[j].vy += dy;
        }
        for (const l of simLinks) {
            const s = simNodes[l.source], t = simNodes[l.target];
            const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = dist * 0.003 * alpha * (l.weight || 1);
            s.vx += (dx / dist) * force; s.vy += (dy / dist) * force;
            t.vx -= (dx / dist) * force; t.vy -= (dy / dist) * force;
        }
        for (const n of simNodes) { n.vx *= 0.8; n.vy *= 0.8; n.x += n.vx; n.y += n.vy; }

        drawFrame();
        animFrame = requestAnimationFrame(tick);
    };
    tick();
};

const drawFrame = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(panX.value, panY.value);
    ctx.scale(zoom.value, zoom.value);

    const textColor = getComputedStyle(canvas).getPropertyValue('--color-text-primary') || '#e2e8f0';
    const mutedColor = getComputedStyle(canvas).getPropertyValue('--color-text-muted') || '#94a3b8';

    for (const l of simLinks) {
        const s = simNodes[l.source], t = simNodes[l.target];
        const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;

        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = Math.min(3, 1 + l.weight); ctx.stroke();

        const arrowLen = 10, angle = Math.atan2(dy, dx);
        const ex = t.x - (dx / dist) * (t.radius + 2), ey = t.y - (dy / dist) * (t.radius + 2);
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - arrowLen * Math.cos(angle - 0.3), ey - arrowLen * Math.sin(angle - 0.3));
        ctx.lineTo(ex - arrowLen * Math.cos(angle + 0.3), ey - arrowLen * Math.sin(angle + 0.3));
        ctx.closePath(); ctx.fillStyle = 'rgba(148,163,184,0.5)'; ctx.fill();

        const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
        ctx.fillStyle = mutedColor;
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        const lbl = l.predicate.replace(/_/g, ' ');
        ctx.fillText(lbl.length > 24 ? lbl.slice(0, 23) + '...' : lbl, mx, my - 4);
    }

    for (const n of simNodes) {
        const color = getEntityColor(n.type);
        ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color + '44'; ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const nl = n.name.length > 20 ? n.name.slice(0, 19) + '...' : n.name;
        ctx.fillText(nl, n.x, n.y + n.radius + 5);

        ctx.fillStyle = color;
        ctx.font = '9px system-ui, sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText(n.type.length > 5 ? n.type.slice(0, 4) : n.type, n.x, n.y);
    }

    ctx.restore();
};

const resizeObserver = new ResizeObserver(() => {
    if (canvasRef.value && filteredEntities.value.length > 0) drawFrame();
});

onMounted(async () => {
    await loadProjectInfo();
    await refresh();
    nextTick(() => { if (canvasRef.value) resizeObserver.observe(canvasRef.value); });
});

onBeforeUnmount(() => { cancelAnimationFrame(animFrame); resizeObserver.disconnect(); });

watch([selectedResourceId, selectedEntityType, selectedPredicate], () => {
    if (viewMode.value === 'graph') nextTick(buildGraph);
});

watch(viewMode, (mode) => {
    if (mode === 'graph' && filteredEntities.value.length > 0) nextTick(buildGraph);
});

watch(projectId, async () => {
    await loadProjectInfo();
    await refresh();
});
</script>
