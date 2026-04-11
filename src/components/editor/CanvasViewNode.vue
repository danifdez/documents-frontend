<template>
    <div class="canvas-view-node my-3 rounded-xl border border-border bg-surface-elevated overflow-hidden select-none">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    stroke-width="1.75">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="1.5" />
                    <circle cx="15" cy="15" r="1.5" />
                    <path d="M10.5 9.5L13.5 14" />
                </svg>
                <span class="text-sm font-semibold text-text-primary">{{ canvasName }}</span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                    Canvas
                </span>
            </div>
            <div class="flex items-center gap-1">
                <!-- Zoom controls -->
                <button @click="zoomIn"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Zoom in">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <span class="text-[10px] text-text-muted w-8 text-center tabular-nums">{{ zoomLabel }}</span>
                <button @click="zoomOut"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Zoom out">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
                    </svg>
                </button>
                <button @click="resetView"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Fit to view">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                </button>

                <div class="h-4 w-px bg-border mx-0.5"></div>

                <a :href="`#/canvas/${canvasId}`"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
                    title="Open canvas" @click.stop>
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
                <button @click="loadCanvas" :disabled="loading"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Refresh">
                    <svg class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24"
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

        <!-- Empty canvas -->
        <div v-else-if="!canvasData || canvasData.nodes.length === 0"
            class="px-4 py-8 text-sm text-text-muted text-center">
            Empty canvas
        </div>

        <!-- Canvas preview with pan/zoom -->
        <div v-else ref="viewportRef" class="canvas-viewport relative overflow-hidden cursor-grab active:cursor-grabbing"
            style="height: 280px;" @wheel.prevent="onWheel" @mousedown.stop="onMouseDown"
            @dragstart.prevent.stop>
            <svg :viewBox="currentViewBox" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <!-- Edges -->
                <line v-for="edge in canvasData.edges" :key="edge.id" :x1="getNodeCenter(edge.source).x"
                    :y1="getNodeCenter(edge.source).y" :x2="getNodeCenter(edge.target).x"
                    :y2="getNodeCenter(edge.target).y" :stroke="edge.data?.color || '#94a3b8'" stroke-width="2"
                    :stroke-dasharray="edge.data?.dashed ? '6 4' : 'none'" />

                <!-- Edge arrows -->
                <polygon v-for="edge in canvasData.edges.filter(e => e.data?.arrow)" :key="'arrow-' + edge.id"
                    :points="getArrowPoints(edge)" :fill="edge.data?.color || '#94a3b8'" />

                <!-- Nodes -->
                <g v-for="node in canvasData.nodes" :key="node.id">
                    <!-- Shape nodes -->
                    <template v-if="node.type === 'shape'">
                        <rect v-if="!node.data?.shape || node.data.shape === 'rect'" :x="node.position.x"
                            :y="node.position.y" :width="getNodeWidth(node)" :height="getNodeHeight(node)"
                            :rx="node.data?.borderRadius || 4" :fill="node.data?.color || '#e2e8f0'"
                            :stroke="node.data?.strokeColor || '#94a3b8'" stroke-width="1.5" />
                        <ellipse v-else-if="node.data.shape === 'circle'"
                            :cx="node.position.x + getNodeWidth(node) / 2"
                            :cy="node.position.y + getNodeHeight(node) / 2" :rx="getNodeWidth(node) / 2"
                            :ry="getNodeHeight(node) / 2" :fill="node.data?.color || '#e2e8f0'"
                            :stroke="node.data?.strokeColor || '#94a3b8'" stroke-width="1.5" />
                        <polygon v-else-if="node.data.shape === 'diamond'" :points="getDiamondPoints(node)"
                            :fill="node.data?.color || '#e2e8f0'" :stroke="node.data?.strokeColor || '#94a3b8'"
                            stroke-width="1.5" />
                        <rect v-else :x="node.position.x" :y="node.position.y" :width="getNodeWidth(node)"
                            :height="getNodeHeight(node)" rx="4" :fill="node.data?.color || '#e2e8f0'"
                            :stroke="node.data?.strokeColor || '#94a3b8'" stroke-width="1.5" />
                        <text v-if="node.data?.label" :x="node.position.x + getNodeWidth(node) / 2"
                            :y="node.position.y + getNodeHeight(node) / 2" text-anchor="middle"
                            dominant-baseline="central" class="text-[11px] fill-text-secondary"
                            style="pointer-events: none;">
                            {{ truncate(node.data.label, 20) }}
                        </text>
                    </template>

                    <!-- Text nodes -->
                    <template v-else-if="node.type === 'text'">
                        <rect :x="node.position.x" :y="node.position.y" :width="getNodeWidth(node)"
                            :height="getNodeHeight(node)" rx="6" fill="white" stroke="#e2e8f0" stroke-width="1" />
                        <text :x="node.position.x + 8" :y="node.position.y + 18"
                            class="text-[11px] fill-text-primary" style="pointer-events: none;">
                            {{ truncate(stripHtml(node.data?.text || ''), 25) }}
                        </text>
                    </template>

                    <!-- Bubble nodes -->
                    <template v-else-if="node.type === 'bubble'">
                        <ellipse :cx="node.position.x + getNodeWidth(node) / 2"
                            :cy="node.position.y + getNodeHeight(node) / 2" :rx="getNodeWidth(node) / 2"
                            :ry="getNodeHeight(node) / 2" :fill="node.data?.color || '#eef2ff'"
                            :stroke="node.data?.borderColor || '#6366f1'" stroke-width="1.5" />
                        <text :x="node.position.x + getNodeWidth(node) / 2"
                            :y="node.position.y + getNodeHeight(node) / 2" text-anchor="middle"
                            dominant-baseline="central" class="text-[10px]"
                            :fill="node.data?.textColor || '#4f46e5'" style="pointer-events: none;">
                            {{ truncate(node.data?.text || '', 15) }}
                        </text>
                    </template>

                    <!-- Card nodes -->
                    <template v-else-if="node.type === 'card'">
                        <rect :x="node.position.x" :y="node.position.y" :width="getNodeWidth(node)"
                            :height="getNodeHeight(node)" rx="8" fill="white" stroke="#e2e8f0" stroke-width="1" />
                        <rect :x="node.position.x" :y="node.position.y" :width="getNodeWidth(node)" height="4" rx="2"
                            :fill="node.data?.accent || '#6366f1'" />
                        <text :x="node.position.x + 10" :y="node.position.y + 22"
                            class="text-[11px] font-semibold fill-text-primary" style="pointer-events: none;">
                            {{ truncate(node.data?.title || '', 20) }}
                        </text>
                    </template>

                    <!-- Entity graph nodes -->
                    <template v-else-if="node.type === 'entityGraph'">
                        <rect :x="node.position.x" :y="node.position.y" :width="getNodeWidth(node)"
                            :height="getNodeHeight(node)" rx="8" :fill="entityColor(node.data?.entityType)"
                            stroke="none" opacity="0.15" />
                        <rect :x="node.position.x" :y="node.position.y" :width="getNodeWidth(node)"
                            :height="getNodeHeight(node)" rx="8" fill="none"
                            :stroke="entityColor(node.data?.entityType)" stroke-width="1.5" />
                        <text :x="node.position.x + getNodeWidth(node) / 2"
                            :y="node.position.y + getNodeHeight(node) / 2" text-anchor="middle"
                            dominant-baseline="central" class="text-[10px] font-medium"
                            :fill="entityColor(node.data?.entityType)" style="pointer-events: none;">
                            {{ truncate(node.data?.entityName || '', 15) }}
                        </text>
                    </template>

                    <!-- Generic fallback -->
                    <template v-else>
                        <rect :x="node.position.x" :y="node.position.y" :width="getNodeWidth(node)"
                            :height="getNodeHeight(node)" rx="6" fill="white" stroke="#e2e8f0" stroke-width="1" />
                        <text :x="node.position.x + getNodeWidth(node) / 2"
                            :y="node.position.y + getNodeHeight(node) / 2" text-anchor="middle"
                            dominant-baseline="central" class="text-[10px] fill-text-muted"
                            style="pointer-events: none;">
                            {{ getNodeLabel(node) }}
                        </text>
                    </template>
                </g>
            </svg>
        </div>

        <!-- Footer -->
        <div
            class="px-4 py-1.5 border-t border-border bg-surface text-[10px] text-text-muted flex items-center justify-between">
            <span v-if="canvasData">
                {{ canvasData.nodes.length }} node{{ canvasData.nodes.length !== 1 ? 's' : '' }},
                {{ canvasData.edges.length }} edge{{ canvasData.edges.length !== 1 ? 's' : '' }}
            </span>
            <a :href="`#/canvas/${canvasId}`" class="text-accent hover:text-accent-dark transition-colors"
                @click.stop>
                Open full canvas
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import apiClient from '../../services/api';
import type { CanvasData, CanvasNode, CanvasEdge } from '../../types/canvas';

const props = defineProps<{
    canvasId: number;
    canvasName: string;
    editable?: boolean;
    initialZoom?: number;
    initialPanX?: number;
    initialPanY?: number;
    onViewChange?: (state: { zoom: number; panX: number; panY: number }) => void;
}>();

const canvasData = ref<CanvasData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const viewportRef = ref<HTMLElement | null>(null);

// Pan & zoom state — initialize from persisted attrs
const zoom = ref(props.initialZoom || 1);
const panX = ref(props.initialPanX || 0);
const panY = ref(props.initialPanY || 0);

// Debounced persist
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const persistView = () => {
    if (!props.onViewChange) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        props.onViewChange!({
            zoom: Math.round(zoom.value * 1000) / 1000,
            panX: Math.round(panX.value * 100) / 100,
            panY: Math.round(panY.value * 100) / 100,
        });
    }, 400);
};
const isPanning = ref(false);
let panStartX = 0;
let panStartY = 0;
let panStartPanX = 0;
let panStartPanY = 0;

const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);

const getNodeWidth = (node: CanvasNode) => node.style?.width || 150;
const getNodeHeight = (node: CanvasNode) => node.style?.height || 60;

const getNodeCenter = (nodeId: string) => {
    const node = canvasData.value?.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
        x: node.position.x + getNodeWidth(node) / 2,
        y: node.position.y + getNodeHeight(node) / 2,
    };
};

// Base bounds of all nodes
const baseBounds = computed(() => {
    if (!canvasData.value || canvasData.value.nodes.length === 0) {
        return { x: 0, y: 0, w: 600, h: 280 };
    }
    const nodes = canvasData.value.nodes;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
        const w = getNodeWidth(node);
        const h = getNodeHeight(node);
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + w);
        maxY = Math.max(maxY, node.position.y + h);
    }
    const padding = 40;
    return {
        x: minX - padding,
        y: minY - padding,
        w: maxX - minX + padding * 2,
        h: maxY - minY + padding * 2,
    };
});

const currentViewBox = computed(() => {
    const b = baseBounds.value;
    const cx = b.x + b.w / 2 + panX.value;
    const cy = b.y + b.h / 2 + panY.value;
    const vw = b.w / zoom.value;
    const vh = b.h / zoom.value;
    return `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;
});

const zoomIn = () => { zoom.value = Math.min(zoom.value * 1.3, 5); persistView(); };
const zoomOut = () => { zoom.value = Math.max(zoom.value / 1.3, 0.2); persistView(); };
const resetView = () => { zoom.value = 1; panX.value = 0; panY.value = 0; persistView(); };

const onWheel = (e: WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoom.value = Math.min(Math.max(zoom.value * factor, 0.2), 5);
    persistView();
};

const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.value = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartPanX = panX.value;
    panStartPanY = panY.value;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (e: MouseEvent) => {
    if (!isPanning.value) return;
    const b = baseBounds.value;
    // Convert pixel delta to SVG coordinate delta
    const el = viewportRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scaleX = (b.w / zoom.value) / rect.width;
    const scaleY = (b.h / zoom.value) / rect.height;
    panX.value = panStartPanX - (e.clientX - panStartX) * scaleX;
    panY.value = panStartPanY - (e.clientY - panStartY) * scaleY;
};

const onMouseUp = () => {
    isPanning.value = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    persistView();
};

onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
});

const getDiamondPoints = (node: CanvasNode) => {
    const x = node.position.x;
    const y = node.position.y;
    const w = getNodeWidth(node);
    const h = getNodeHeight(node);
    return `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
};

const getArrowPoints = (edge: CanvasEdge) => {
    const from = getNodeCenter(edge.source);
    const to = getNodeCenter(edge.target);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return '0,0 0,0 0,0';
    const ux = dx / len;
    const uy = dy / len;
    const size = 8;
    const tipX = to.x;
    const tipY = to.y;
    return `${tipX},${tipY} ${tipX - ux * size - uy * size / 2},${tipY - uy * size + ux * size / 2} ${tipX - ux * size + uy * size / 2},${tipY - uy * size - ux * size / 2}`;
};

const truncate = (text: string, max: number) => {
    if (text.length <= max) return text;
    return text.slice(0, max) + '...';
};

const stripHtml = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

const getNodeLabel = (node: CanvasNode) => {
    if (node.type === 'docRef') return node.data?.title || node.data?.sourceName || 'Document';
    if (node.type === 'resourceRef') return node.data?.title || node.data?.resourceName || 'Resource';
    if (node.type === 'image') return node.data?.caption || 'Image';
    if (node.type === 'chart') return node.data?.chartName || 'Chart';
    if (node.type === 'timeline') return node.data?.timelineName || 'Timeline';
    return node.type;
};

const entityColor = (type: string) => {
    const colors: Record<string, string> = {
        Person: '#6366f1',
        Organization: '#f59e0b',
        Location: '#10b981',
        Event: '#ef4444',
        Concept: '#8b5cf6',
    };
    return colors[type] || '#64748b';
};

const loadCanvas = async () => {
    if (!props.canvasId) return;
    loading.value = true;
    error.value = null;
    try {
        const response = await apiClient.get(`/canvases/${props.canvasId}`);
        canvasData.value = response.data.canvasData || null;
    } catch (err: any) {
        error.value = err.response?.data?.message || 'Failed to load canvas';
    } finally {
        loading.value = false;
    }
};

onMounted(() => loadCanvas());
</script>
