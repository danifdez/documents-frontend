<template>
    <div class="h-full flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div class="flex items-center gap-2">
                <button @click="viewMode = 'graph'" :class="viewMode === 'graph' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary'" class="px-3 py-1 rounded text-xs font-medium transition-colors">Graph</button>
                <button @click="viewMode = 'table'" :class="viewMode === 'table' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary'" class="px-3 py-1 rounded text-xs font-medium transition-colors">Table</button>
            </div>
            <div class="flex items-center gap-2">
                <button v-if="viewMode === 'graph'" @click="zoomToFit" class="px-2 py-1 rounded text-xs bg-surface-elevated text-text-secondary hover:text-text-primary" title="Fit to view">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
                <button @click="showAddModal = true" class="px-3 py-1 rounded text-xs font-medium bg-accent text-white hover:opacity-90">Add Relationship</button>
                <button @click="refresh" :disabled="isLoading" class="px-3 py-1 rounded text-xs font-medium bg-surface-elevated text-text-secondary hover:text-text-primary">Refresh</button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="flex-1 flex items-center justify-center">
            <div class="text-sm text-text-muted">Loading relationships...</div>
        </div>

        <!-- Empty -->
        <div v-else-if="relationships.length === 0" class="flex-1 flex items-center justify-center">
            <div class="text-center">
                <div class="text-sm text-text-muted mb-2">No relationships found</div>
                <button @click="extract" :disabled="extracting" class="px-3 py-1 rounded text-xs font-medium bg-accent text-white hover:opacity-90">
                    {{ extracting ? 'Extracting...' : 'Extract Relationships' }}
                </button>
            </div>
        </div>

        <!-- Graph -->
        <div v-else-if="viewMode === 'graph'" class="flex-1 min-h-0 relative">
            <canvas ref="canvasRef" class="w-full h-full"
                :class="draggedNode !== null ? 'cursor-grabbing' : hoveredNode !== null ? 'cursor-grab' : 'cursor-grab'"
                @wheel.prevent="onWheel" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp" />
            <div class="absolute bottom-3 right-3 flex flex-col gap-1">
                <button @click="zoomIn" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary text-sm font-bold">+</button>
                <button @click="zoomOut" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary text-sm font-bold">-</button>
                <button @click="zoomToFit" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary" title="Fit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
            </div>
            <div class="absolute bottom-3 left-3 text-[10px] text-text-muted">{{ Math.round(zoom * 100) }}%</div>
        </div>

        <!-- Table -->
        <div v-else class="flex-1 min-h-0 overflow-y-auto">
            <table class="w-full text-sm">
                <thead class="sticky top-0 bg-surface">
                    <tr class="border-b border-border">
                        <th class="text-left px-4 py-2 text-text-secondary font-medium">Subject</th>
                        <th class="text-left px-4 py-2 text-text-secondary font-medium">Relationship</th>
                        <th class="text-left px-4 py-2 text-text-secondary font-medium">Object</th>
                        <th class="text-left px-4 py-2 text-text-secondary font-medium">Confidence</th>
                        <th class="text-right px-4 py-2 text-text-secondary font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(rel, idx) in relationships" :key="idx" class="border-b border-border hover:bg-surface-elevated transition-colors">
                        <td class="px-4 py-2"><span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getEntityColor(getEntityType(rel.source)) }"></span>{{ getEntityName(rel.source) }}</span></td>
                        <td class="px-4 py-2"><span class="px-2 py-0.5 rounded bg-surface-elevated text-xs font-mono">{{ rel.predicate }}</span></td>
                        <td class="px-4 py-2"><span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getEntityColor(getEntityType(rel.target)) }"></span>{{ getEntityName(rel.target) }}</span></td>
                        <td class="px-4 py-2 text-text-muted">{{ Math.round((rel.confidence || 0) * 100) }}%</td>
                        <td class="px-4 py-2 text-right"><button @click="handleDelete(rel)" class="text-xs text-red-500 hover:text-red-700">Delete</button></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Add modal -->
        <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showAddModal = false">
            <div class="bg-surface rounded-lg shadow-xl p-6 w-96 max-w-[90vw]">
                <h3 class="text-sm font-semibold mb-4">Add Relationship</h3>
                <div class="space-y-3">
                    <div><label class="block text-xs text-text-secondary mb-1">Subject</label><select v-model="newRel.subjectId" class="w-full px-3 py-1.5 rounded border border-border bg-surface text-sm"><option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }} ({{ e.type }})</option></select></div>
                    <div><label class="block text-xs text-text-secondary mb-1">Predicate</label><input v-model="newRel.predicate" type="text" placeholder="e.g. works_for" class="w-full px-3 py-1.5 rounded border border-border bg-surface text-sm" /></div>
                    <div><label class="block text-xs text-text-secondary mb-1">Object</label><select v-model="newRel.objectId" class="w-full px-3 py-1.5 rounded border border-border bg-surface text-sm"><option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }} ({{ e.type }})</option></select></div>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button @click="showAddModal = false" class="px-3 py-1.5 rounded text-xs bg-surface-elevated text-text-secondary">Cancel</button>
                    <button @click="handleCreate" :disabled="!newRel.subjectId || !newRel.predicate || !newRel.objectId" class="px-3 py-1.5 rounded text-xs bg-accent text-white disabled:opacity-50">Add</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRelationships, type Relationship } from '../../services/relationships/useRelationships';

const props = defineProps<{ resourceId: number; projectId?: number }>();
const { isLoading, data, fetchByResource, createRelationship, deleteRelationship, extractRelationships } = useRelationships();

const viewMode = ref<'graph' | 'table'>('graph');
const showAddModal = ref(false);
const extracting = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const newRel = ref({ subjectId: 0, predicate: '', objectId: 0 });

const entities = computed(() => data.value.entities);
const relationships = computed(() => data.value.relationships);

const typeColors: Record<string, string> = {
    PERSON: '#6366f1', PER: '#6366f1',
    ORG: '#3b82f6', ORGANIZATION: '#3b82f6',
    GPE: '#10b981', LOCATION: '#10b981', LOC: '#10b981', GEOPOLITICAL: '#10b981',
    EVENT: '#f59e0b', WORK_OF_ART: '#ec4899', FACILITY: '#8b5cf6',
    PRODUCT: '#f97316', NATIONALITY: '#06b6d4', default: '#94a3b8',
};

const getEntityColor = (type: string) => typeColors[type?.toUpperCase()] || typeColors.default;
const getEntityName = (id: number | string) => entities.value.find(e => e.id === id)?.name || String(id);
const getEntityType = (id: number | string) => entities.value.find(e => e.id === id)?.type || '';

const refresh = async () => {
    await fetchByResource(props.resourceId);
    if (viewMode.value === 'graph') nextTick(buildGraph);
};

const extract = async () => { extracting.value = true; await extractRelationships(props.resourceId); extracting.value = false; await refresh(); };

const handleCreate = async () => {
    if (!newRel.value.subjectId || !newRel.value.predicate || !newRel.value.objectId) return;
    await createRelationship({ subjectId: newRel.value.subjectId, predicate: newRel.value.predicate, objectId: newRel.value.objectId, resourceId: props.resourceId, projectId: props.projectId });
    showAddModal.value = false; newRel.value = { subjectId: 0, predicate: '', objectId: 0 }; await refresh();
};

const handleDelete = async (rel: Relationship) => {
    await deleteRelationship({ subjectId: Number(rel.source), predicate: rel.predicate, objectId: Number(rel.target), resourceId: props.resourceId });
    await refresh();
};

// --- Camera ---
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);

const zoomIn = () => { zoom.value = Math.min(zoom.value * 1.3, 5); drawFrame(); };
const zoomOut = () => { zoom.value = Math.max(zoom.value / 1.3, 0.15); drawFrame(); };

const zoomToFit = () => {
    if (!simNodes.length || !canvasRef.value) return;
    const w = canvasRef.value.offsetWidth, h = canvasRef.value.offsetHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of simNodes) {
        const pad = n.radius + 50;
        minX = Math.min(minX, n.x - pad); minY = Math.min(minY, n.y - pad);
        maxX = Math.max(maxX, n.x + pad); maxY = Math.max(maxY, n.y + pad);
    }
    const gw = maxX - minX || 1, gh = maxY - minY || 1;
    zoom.value = Math.min((w - 40) / gw, (h - 40) / gh, 2.5);
    panX.value = (w / 2) - ((minX + maxX) / 2) * zoom.value;
    panY.value = (h / 2) - ((minY + maxY) / 2) * zoom.value;
    drawFrame();
};

const onWheel = (e: WheelEvent) => {
    const canvas = canvasRef.value; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const oldZoom = zoom.value;
    zoom.value = Math.max(0.15, Math.min(5, zoom.value * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    panX.value = mx - (mx - panX.value) * (zoom.value / oldZoom);
    panY.value = my - (my - panY.value) * (zoom.value / oldZoom);
    drawFrame();
};

// --- Node dragging + Pan ---
let draggedNode = ref<number | null>(null);
let hoveredNode = ref<number | null>(null);
let isPanning = false;
let mouseStartX = 0, mouseStartY = 0;
let panStartPanX = 0, panStartPanY = 0;
let dragOffsetX = 0, dragOffsetY = 0;

const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - panX.value) / zoom.value,
    y: (sy - panY.value) / zoom.value,
});

const hitTestNode = (sx: number, sy: number): number | null => {
    const { x, y } = screenToWorld(sx, sy);
    for (let i = simNodes.length - 1; i >= 0; i--) {
        const n = simNodes[i];
        const dx = x - n.x, dy = y - n.y;
        if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return i;
    }
    return null;
};

const onMouseDown = (e: MouseEvent) => {
    const canvas = canvasRef.value; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    const nodeIdx = hitTestNode(sx, sy);
    if (nodeIdx !== null) {
        draggedNode.value = nodeIdx;
        const { x, y } = screenToWorld(sx, sy);
        dragOffsetX = simNodes[nodeIdx].x - x;
        dragOffsetY = simNodes[nodeIdx].y - y;
        simNodes[nodeIdx].vx = 0; simNodes[nodeIdx].vy = 0;
    } else {
        isPanning = true;
        mouseStartX = e.clientX; mouseStartY = e.clientY;
        panStartPanX = panX.value; panStartPanY = panY.value;
    }
};

const onMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef.value; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    if (draggedNode.value !== null) {
        const { x, y } = screenToWorld(sx, sy);
        simNodes[draggedNode.value].x = x + dragOffsetX;
        simNodes[draggedNode.value].y = y + dragOffsetY;
        simNodes[draggedNode.value].vx = 0; simNodes[draggedNode.value].vy = 0;
        drawFrame();
    } else if (isPanning) {
        panX.value = panStartPanX + (e.clientX - mouseStartX);
        panY.value = panStartPanY + (e.clientY - mouseStartY);
        drawFrame();
    } else {
        hoveredNode.value = hitTestNode(sx, sy);
    }
};

const onMouseUp = () => { draggedNode.value = null; isPanning = false; };

// --- Graph ---
interface SimNode { id: number | string; name: string; type: string; x: number; y: number; vx: number; vy: number; radius: number; }
interface SimLink { source: number; target: number; predicate: string; weight: number; }

let simNodes: SimNode[] = [];
let simLinks: SimLink[] = [];
let animFrame = 0;
const SIM_W = 1600;
const SIM_H = 1200;

const buildGraph = () => {
    const ents = entities.value;
    const rels = relationships.value;
    if (!ents.length || !canvasRef.value) return;

    const idxMap = new Map<number | string, number>();
    simNodes = ents.map((e, i) => {
        idxMap.set(e.id, i);
        return {
            id: e.id, name: e.name, type: e.type || 'default',
            x: SIM_W / 2 + (Math.random() - 0.5) * SIM_W * 0.5,
            y: SIM_H / 2 + (Math.random() - 0.5) * SIM_H * 0.5,
            vx: 0, vy: 0,
            radius: Math.min(36, 14 + e.name.length * 0.7),
        };
    });

    simLinks = [];
    for (const r of rels) {
        const si = idxMap.get(r.source), ti = idxMap.get(r.target);
        if (si !== undefined && ti !== undefined) simLinks.push({ source: si, target: ti, predicate: r.predicate, weight: r.confidence || 1 });
    }
    runSimulation();
};

const runSimulation = () => {
    let iterations = 0;
    const maxIter = 250;
    const tick = () => {
        if (iterations >= maxIter) { zoomToFit(); return; }
        iterations++;
        const alpha = 1 - iterations / maxIter;

        // Center gravity
        for (const n of simNodes) {
            n.vx += (SIM_W / 2 - n.x) * 0.005 * alpha;
            n.vy += (SIM_H / 2 - n.y) * 0.005 * alpha;
        }

        // Repulsion (stronger, minimum distance)
        for (let i = 0; i < simNodes.length; i++) {
            for (let j = i + 1; j < simNodes.length; j++) {
                let dx = simNodes[j].x - simNodes[i].x;
                let dy = simNodes[j].y - simNodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const minDist = simNodes[i].radius + simNodes[j].radius + 80;
                const force = (3000 * alpha) / (dist * dist);
                // Extra push if too close
                const extraPush = dist < minDist ? (minDist - dist) * 0.5 * alpha : 0;
                const totalForce = force + extraPush;
                dx = (dx / dist) * totalForce; dy = (dy / dist) * totalForce;
                simNodes[i].vx -= dx; simNodes[i].vy -= dy;
                simNodes[j].vx += dx; simNodes[j].vy += dy;
            }
        }

        // Attraction (links)
        for (const l of simLinks) {
            const s = simNodes[l.source], t = simNodes[l.target];
            const dx = t.x - s.x, dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const idealDist = s.radius + t.radius + 120;
            const force = (dist - idealDist) * 0.002 * alpha;
            s.vx += (dx / dist) * force; s.vy += (dy / dist) * force;
            t.vx -= (dx / dist) * force; t.vy -= (dy / dist) * force;
        }

        // Velocity damping
        for (const n of simNodes) {
            n.vx *= 0.75; n.vy *= 0.75;
            n.x += n.vx; n.y += n.vy;
        }

        drawFrame();
        animFrame = requestAnimationFrame(tick);
    };
    tick();
};

const drawFrame = () => {
    const canvas = canvasRef.value; if (!canvas) return;
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(panX.value, panY.value);
    ctx.scale(zoom.value, zoom.value);

    const textColor = getComputedStyle(canvas).getPropertyValue('--color-text-primary') || '#e2e8f0';
    const mutedColor = getComputedStyle(canvas).getPropertyValue('--color-text-muted') || '#94a3b8';

    // Links
    for (const l of simLinks) {
        const s = simNodes[l.source], t = simNodes[l.target];
        const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;

        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 2; ctx.stroke();

        // Arrow
        const angle = Math.atan2(dy, dx);
        const ex = t.x - (dx / dist) * (t.radius + 3), ey = t.y - (dy / dist) * (t.radius + 3);
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 12 * Math.cos(angle - 0.28), ey - 12 * Math.sin(angle - 0.28));
        ctx.lineTo(ex - 12 * Math.cos(angle + 0.28), ey - 12 * Math.sin(angle + 0.28));
        ctx.closePath(); ctx.fillStyle = 'rgba(148,163,184,0.45)'; ctx.fill();

        // Edge label
        const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
        const label = l.predicate.replace(/_/g, ' ');
        ctx.fillStyle = mutedColor;
        ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(label.length > 28 ? label.slice(0, 27) + '...' : label, mx, my - 6);
    }

    // Nodes
    for (let i = 0; i < simNodes.length; i++) {
        const n = simNodes[i];
        const color = getEntityColor(n.type);
        const isHovered = hoveredNode.value === i;
        const isDragged = draggedNode.value === i;

        // Shadow
        ctx.shadowColor = isDragged ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = isDragged ? 12 : 6; ctx.shadowOffsetY = 2;

        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color + (isHovered || isDragged ? '66' : '44'); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = color; ctx.lineWidth = isHovered || isDragged ? 3 : 2; ctx.stroke();

        // Entity name below
        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const label = n.name.length > 22 ? n.name.slice(0, 21) + '...' : n.name;
        ctx.fillText(label, n.x, n.y + n.radius + 6);

        // Type abbreviation inside
        ctx.fillStyle = color;
        ctx.font = '10px system-ui, sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText(n.type.length > 5 ? n.type.slice(0, 4) : n.type, n.x, n.y);
    }

    ctx.restore();
};

const resizeObserver = new ResizeObserver(() => { if (canvasRef.value && entities.value.length > 0) drawFrame(); });

onMounted(async () => {
    await refresh();
    nextTick(() => { if (canvasRef.value) resizeObserver.observe(canvasRef.value); });
});

onBeforeUnmount(() => { cancelAnimationFrame(animFrame); resizeObserver.disconnect(); });

watch(viewMode, (mode) => { if (mode === 'graph' && entities.value.length > 0) nextTick(buildGraph); });
</script>
