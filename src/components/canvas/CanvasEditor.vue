<template>
  <div class="w-full h-full relative">
    <VueFlow v-model:nodes="nodes" v-model:edges="edges" :node-types="nodeTypes" :default-viewport="viewport"
      :snap-to-grid="true" :snap-grid="[15, 15]" :connection-mode="ConnectionMode.Loose"
      fit-view-on-init class="canvas-flow" @nodes-change="onNodesChange"
      @edges-change="onEdgesChange" @connect="onConnect" @viewport-change="onViewportChange"
      @node-double-click="onNodeDoubleClick"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
      :class="{ 'cursor-crosshair': !!pendingTool }">
      <Background :gap="15" :size="1" />
      <Controls />
      <MiniMap :node-color="miniMapNodeColor" :mask-color="'rgba(0,0,0,0.15)'" />
    </VueFlow>

    <!-- Edge toolbar -->
    <div v-if="selectedEdge" class="absolute top-3 left-1/2 -translate-x-1/2 z-20
      flex items-center gap-0.5 bg-surface-elevated border border-border rounded-lg shadow-lg px-1.5 py-1">

      <!-- Edge type: smoothstep / bezier -->
      <button @click="updateEdgeProp('type', 'smoothstep')" title="Straight segments"
        :class="[edgeBtnClass, (selectedEdge.type === 'smoothstep' || !selectedEdge.type) && edgeActiveClass]">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4,4 4,20 20,20" />
        </svg>
      </button>
      <button @click="updateEdgeProp('type', 'default')" title="Curved line"
        :class="[edgeBtnClass, selectedEdge.type === 'default' && edgeActiveClass]">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4,4 C4,20 20,4 20,20" />
        </svg>
      </button>

      <div class="h-4 w-px bg-border mx-0.5"></div>

      <!-- Arrow toggle -->
      <button @click="toggleArrow" title="Toggle arrow"
        :class="[edgeBtnClass, selectedEdge.data?.arrow && edgeActiveClass]">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      <!-- Dashed toggle -->
      <button @click="toggleDashed" title="Toggle dashed"
        :class="[edgeBtnClass, selectedEdge.data?.dashed && edgeActiveClass]">
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3">
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
      </button>

      <div class="h-4 w-px bg-border mx-0.5"></div>

      <!-- Edge color -->
      <div class="relative">
        <button @click="showEdgeColors = !showEdgeColors" title="Line color" :class="edgeBtnClass">
          <div class="w-3.5 h-3.5 rounded border border-border"
            :style="{ backgroundColor: selectedEdge.data?.color || '#94a3b8' }"></div>
        </button>
      </div>

      <!-- Delete edge -->
      <button @click="deleteSelectedEdge" title="Delete" :class="edgeBtnClass" class="!text-red-500">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>

    <!-- Edge color picker (teleported) -->
    <Teleport to="body">
      <div v-if="showEdgeColors" class="fixed inset-0 z-[9998]" @click="showEdgeColors = false"></div>
      <div v-if="showEdgeColors" class="fixed z-[9999] bg-surface-elevated border border-border rounded-xl shadow-xl p-2.5"
        :style="edgeColorPos">
        <div class="grid grid-cols-5 gap-1.5">
          <button v-for="c in edgeColors" :key="c" @click="setEdgeColor(c)"
            class="w-7 h-7 rounded-lg border-2 cursor-pointer hover:scale-110 transition-transform"
            :class="(selectedEdge?.data?.color || '#94a3b8') === c ? 'border-accent shadow-sm' : 'border-transparent'"
            :style="{ backgroundColor: c }" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw, onMounted, onBeforeUnmount, provide } from 'vue';
import { VueFlow, ConnectionMode, useVueFlow, type Node, type Edge, type Connection } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

import TextNode from './nodes/TextNode.vue';
import ShapeNode from './nodes/ShapeNode.vue';
import BubbleNode from './nodes/BubbleNode.vue';
import CardNode from './nodes/CardNode.vue';
import ImageNode from './nodes/ImageNode.vue';
import DocRefNode from './nodes/DocRefNode.vue';
import ResourceRefNode from './nodes/ResourceRefNode.vue';
import ChartNode from './nodes/ChartNode.vue';
import TimelineNode from './nodes/TimelineNode.vue';
import EntityGraphNode from './nodes/EntityGraphNode.vue';

import type { CanvasData } from '../../types/canvas';
import apiClient from '../../services/api';
import { type RelationshipData } from '../../services/relationships/useRelationships';
import { getSocket } from '../../services/notifications/notification';

const props = defineProps<{
  canvasData: CanvasData | null;
  pendingTool: { type: string; data: Record<string, any> } | null;
}>();

const emit = defineEmits<{
  'canvas-change': [data: CanvasData];
  'edit-image': [nodeId: string, currentSrc: string];
  'node-placed': [];
  'node-selected': [node: { id: string; type: string; data: Record<string, any> } | null];
}>();

const nodeTypes = {
  text: markRaw(TextNode),
  shape: markRaw(ShapeNode),
  bubble: markRaw(BubbleNode),
  card: markRaw(CardNode),
  image: markRaw(ImageNode),
  docRef: markRaw(DocRefNode),
  resourceRef: markRaw(ResourceRefNode),
  chart: markRaw(ChartNode),
  timeline: markRaw(TimelineNode),
  entityGraph: markRaw(EntityGraphNode),
};

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);
const viewport = ref({ x: 0, y: 0, zoom: 1 });
let skipDataWatch = false;
let internalChange = false;

const { getSelectedNodes, getSelectedEdges, removeNodes, removeEdges, findNode } = useVueFlow();

const cleanupImageResource = (node: Node) => {
  if (node.type !== 'image') return;
  const src = node.data?.src as string;
  if (!src) return;
  const match = src.match(/\/resources\/(\d+)\/view/);
  if (match) {
    apiClient.delete(`/resources/${match[1]}`).catch(() => {});
  }
};

const deleteNode = (nodeId: string) => {
  const node = findNode(nodeId);
  if (node) {
    cleanupImageResource(node);
    removeNodes([node]);
    emitChange();
  }
};

const duplicateNode = (nodeId: string) => {
  const original = findNode(nodeId);
  if (!original) return;
  const newNode: Node = {
    id: `${original.type}-${Date.now()}`,
    type: original.type,
    position: { x: original.position.x + 30, y: original.position.y + 30 },
    data: { ...original.data },
  };
  nodes.value = [...nodes.value, newNode];
  emitChange();
};

const fetchNeighborhood = (entityNames: string[]): Promise<RelationshipData> => {
  const requestId = `nb-${Date.now()}`;
  const namesParam = entityNames.map(n => encodeURIComponent(n)).join(',');

  return new Promise<RelationshipData>((resolve) => {
    const sock = getSocket();

    const timeout = setTimeout(() => {
      sock.off('relationshipQueryResponse', onResponse);
      resolve({ entities: [], relationships: [] });
    }, 30000);

    const onResponse = (responseData: any) => {
      if (responseData.requestId === requestId) {
        sock.off('relationshipQueryResponse', onResponse);
        clearTimeout(timeout);
        resolve({
          entities: responseData.entities || [],
          relationships: responseData.relationships || [],
        });
      }
    };
    sock.on('relationshipQueryResponse', onResponse);

    apiClient.get(`/relationships/neighborhood?names=${namesParam}&requestId=${requestId}`)
      .catch(() => {
        sock.off('relationshipQueryResponse', onResponse);
        clearTimeout(timeout);
        resolve({ entities: [], relationships: [] });
      });
  });
};

const drawRelationships = async (nodeId: string) => {
  const sourceNode = findNode(nodeId);
  if (!sourceNode || sourceNode.type !== 'entityGraph') return;

  const entityName = sourceNode.data.entityName;
  if (!entityName) return;

  // All entity nodes on canvas (including source)
  const allEntityNodes = nodes.value.filter(n => n.type === 'entityGraph' && n.data.entityName);
  const otherEntityNodes = allEntityNodes.filter(n => n.id !== nodeId);
  if (!otherEntityNodes.length) return;

  sourceNode.data = { ...sourceNode.data, _relLoading: true };

  try {
    // Query neighborhood for all entity names on canvas
    const allNames = allEntityNodes.map(n => n.data.entityName as string);
    const result = await fetchNeighborhood(allNames);
    const relationships = result.relationships || [];

    console.log('[DrawRel] queried names:', allNames);
    console.log('[DrawRel] got', relationships.length, 'relationships');
    if (relationships.length > 0) {
      console.log('[DrawRel] sample:', relationships.slice(0, 10));
    }

    // Build name -> canvas node id map
    const nameToNodeId = new Map<string, string>();
    for (const n of allEntityNodes) {
      nameToNodeId.set((n.data.entityName as string).toLowerCase(), n.id);
    }

    const sourceName = entityName.toLowerCase();

    let added = 0;
    for (const rel of relationships) {
      const srcName = String(rel.source).toLowerCase();
      const tgtName = String(rel.target).toLowerCase();
      const label = (rel.predicate || '').replace(/_/g, ' ');

      let fromNodeId: string | null = null;
      let toNodeId: string | null = null;

      // Only draw edges involving the source entity
      if (srcName === sourceName && nameToNodeId.has(tgtName)) {
        fromNodeId = nodeId;
        toNodeId = nameToNodeId.get(tgtName)!;
      } else if (tgtName === sourceName && nameToNodeId.has(srcName)) {
        fromNodeId = nameToNodeId.get(srcName)!;
        toNodeId = nodeId;
      }

      if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) continue;

      const edgeExists = edges.value.some(e =>
        (e.source === fromNodeId && e.target === toNodeId) ||
        (e.source === toNodeId && e.target === fromNodeId)
      );
      if (edgeExists) continue;

      edges.value = [...edges.value, {
        id: `rel-${fromNodeId}-${toNodeId}-${Date.now()}-${added}`,
        source: fromNodeId,
        target: toNodeId,
        type: 'smoothstep',
        label,
        data: { arrow: true, color: '#6366f1' },
        style: { stroke: '#6366f1', strokeWidth: 1.5 },
        markerEnd: { type: 'arrowclosed' as any, width: 12, height: 12, color: '#6366f1' },
      }];
      added++;
    }

    if (added > 0) emitChange();
  } finally {
    const sn = findNode(nodeId);
    if (sn) sn.data = { ...sn.data, _relLoading: false };
  }
};

provide('canvasDeleteNode', deleteNode);
provide('canvasDuplicateNode', duplicateNode);
provide('canvasDrawRelationships', drawRelationships);

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

    const selectedNodes = getSelectedNodes.value;
    const selectedEdges = getSelectedEdges.value;
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      e.preventDefault();
      if (selectedNodes.length > 0) {
        selectedNodes.forEach(cleanupImageResource);
        removeNodes(selectedNodes);
      }
      if (selectedEdges.length > 0) removeEdges(selectedEdges);
      emitChange();
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown);
});

watch(() => props.canvasData, (data) => {
  if (data) {
    if (internalChange) { internalChange = false; return; }
    skipDataWatch = true;
    nodes.value = data.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
      style: n.style ? {
        width: n.style.width ? `${n.style.width}px` : undefined,
        height: n.style.height ? `${n.style.height}px` : undefined,
      } : undefined,
    }));
    edges.value = data.edges.map((e) => {
      const edgeData = e.data || {};
      const color = edgeData.color || '#94a3b8';
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type || 'smoothstep',
        label: e.label,
        data: edgeData,
        style: buildEdgeStyle(edgeData),
        markerEnd: edgeData.arrow ? { type: 'arrowclosed' as any, width: 12, height: 12, color } : undefined,
      };
    });
    if (data.viewport) {
      viewport.value = data.viewport;
    }
    setTimeout(() => { skipDataWatch = false; }, 0);
  }
}, { immediate: true });

// Watch for node data changes (e.g. text edits inside nodes via useNode)
watch(nodes, () => {
  if (skipDataWatch) return;
  emitChange();
}, { deep: true });

const emitChange = () => {
  const data: CanvasData = {
    nodes: nodes.value.map((n) => ({
      id: n.id,
      type: n.type as any,
      position: n.position,
      data: n.data,
      style: n.style ? {
        width: typeof n.style.width === 'string' ? parseInt(n.style.width) : n.style.width,
        height: typeof n.style.height === 'string' ? parseInt(n.style.height) : n.style.height,
      } : undefined,
    })),
    edges: edges.value.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type,
      label: typeof e.label === 'string' ? e.label : undefined,
      data: e.data,
    })),
    viewport: viewport.value,
  };
  internalChange = true;
  emit('canvas-change', data);
};

const onNodesChange = () => emitChange();
const onEdgesChange = () => emitChange();
const onViewportChange = (vp: { x: number; y: number; zoom: number }) => {
  viewport.value = vp;
};

const onConnect = (connection: Connection) => {
  const newEdge: Edge = {
    id: `e-${connection.source}-${connection.target}-${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: 'smoothstep',
    data: {},
    style: buildEdgeStyle({}),
  };
  edges.value = [...edges.value, newEdge];
  emitChange();
};

const onNodeClick = ({ node }: { node: Node }) => {
  emit('node-selected', { id: node.id, type: node.type as string, data: node.data });
};

const onNodeDoubleClick = ({ node }: { node: Node }) => {
  if (node.type === 'image') {
    emit('edit-image', node.id, node.data.src || '');
  }
};

// --- Edge toolbar ---
const edgeBtnClass = 'p-1.5 rounded-md text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer flex items-center justify-center';
const edgeActiveClass = 'bg-accent-subtle !text-accent';
const showEdgeColors = ref(false);
const edgeColors = ['#94a3b8', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const selectedEdge = computed(() => {
  const sel = getSelectedEdges.value;
  return sel.length === 1 ? sel[0] : null;
});

const edgeColorPos = computed(() => {
  // Position below the toolbar, centered
  return { top: '52px', left: '50%', transform: 'translateX(-50%)' };
});

const buildEdgeStyle = (data: Record<string, any> | undefined) => {
  const color = data?.color || '#94a3b8';
  const dashed = data?.dashed;
  return {
    stroke: color,
    strokeWidth: 1.5,
    ...(dashed ? { strokeDasharray: '6 4' } : {}),
  };
};

const updateEdgeProp = (prop: string, value: string | boolean) => {
  if (!selectedEdge.value) return;
  const idx = edges.value.findIndex(e => e.id === selectedEdge.value!.id);
  if (idx === -1) return;
  const edge = edges.value[idx];

  if (prop === 'type') {
    edges.value[idx] = { ...edge, type: value, data: { ...edge.data }, style: buildEdgeStyle(edge.data) };
  } else {
    const newData = { ...edge.data, [prop]: value };
    edges.value[idx] = { ...edge, data: newData, style: buildEdgeStyle(newData) };
  }
  edges.value = [...edges.value];
  emitChange();
};

const toggleArrow = () => {
  if (!selectedEdge.value) return;
  const hasArrow = selectedEdge.value.data?.arrow;
  const idx = edges.value.findIndex(e => e.id === selectedEdge.value!.id);
  if (idx === -1) return;
  const edge = edges.value[idx];
  const newData = { ...edge.data, arrow: !hasArrow };
  const color = newData.color || '#94a3b8';
  edges.value[idx] = {
    ...edge,
    data: newData,
    style: buildEdgeStyle(newData),
    markerEnd: !hasArrow ? { type: 'arrowclosed' as any, width: 12, height: 12, color } : undefined,
  };
  edges.value = [...edges.value];
  emitChange();
};

const toggleDashed = () => {
  const current = selectedEdge.value?.data?.dashed;
  updateEdgeProp('dashed', !current);
};

const setEdgeColor = (color: string) => {
  showEdgeColors.value = false;
  if (!selectedEdge.value) return;
  const idx = edges.value.findIndex(e => e.id === selectedEdge.value!.id);
  if (idx === -1) return;
  const edge = edges.value[idx];
  const newData = { ...edge.data, color };
  const hasArrow = newData.arrow;
  edges.value[idx] = {
    ...edge,
    data: newData,
    style: buildEdgeStyle(newData),
    markerEnd: hasArrow ? { type: 'arrowclosed' as any, width: 12, height: 12, color } : undefined,
  };
  edges.value = [...edges.value];
  emitChange();
};

const deleteSelectedEdge = () => {
  if (!selectedEdge.value) return;
  removeEdges([selectedEdge.value]);
  emitChange();
};

const updateNodeData = (nodeId: string, data: Record<string, any>) => {
  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    node.data = { ...node.data, ...data };
    emitChange();
  }
};

const defaultSizes: Record<string, { width: number; height: number }> = {
  text: { width: 150, height: 40 },
  shape: { width: 60, height: 60 },
  'bubble-central': { width: 180, height: 80 },
  'bubble-topic': { width: 140, height: 56 },
  'bubble-sub': { width: 110, height: 44 },
  'card-person': { width: 160, height: 70 },
  'card-team': { width: 170, height: 70 },
  image: { width: 160, height: 120 },
  docRef: { width: 160, height: 36 },
  resourceRef: { width: 160, height: 36 },
  chart: { width: 300, height: 220 },
  timeline: { width: 240, height: 200 },
  entityGraph: { width: 120, height: 56 },
};

const resolveType = (type: string) => {
  if (type.startsWith('shape-')) return 'shape';
  if (type.startsWith('bubble-')) return 'bubble';
  if (type.startsWith('card-')) return 'card';
  return type;
};

const addNodeAt = (type: string, data: Record<string, any>, x: number, y: number) => {
  const realType = resolveType(type);
  const size = defaultSizes[type] || defaultSizes[realType] || { width: 150, height: 40 };
  const newNode: Node = {
    id: `${realType}-${Date.now()}`,
    type: realType,
    position: { x: x - size.width / 2, y: y - size.height / 2 },
    data,
    style: { width: `${size.width}px`, height: `${size.height}px` },
  };
  nodes.value = [...nodes.value, newNode];
  emitChange();
};

const addNode = (type: string, data: Record<string, any> = {}, style?: Record<string, any>) => {
  const centerX = (-viewport.value.x + 400) / viewport.value.zoom;
  const centerY = (-viewport.value.y + 300) / viewport.value.zoom;
  const realType = resolveType(type);
  const size = defaultSizes[type] || defaultSizes[realType] || { width: 150, height: 40 };
  const newNode: Node = {
    id: `${realType}-${Date.now()}`,
    type: realType,
    position: { x: centerX, y: centerY },
    data,
    style: { width: `${size.width}px`, height: `${size.height}px`, ...style },
  };
  nodes.value = [...nodes.value, newNode];
  emitChange();
};

const { screenToFlowCoordinate } = useVueFlow();

const onPaneClick = (event: MouseEvent) => {
  emit('node-selected', null);
  if (!props.pendingTool) return;
  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY });
  addNodeAt(props.pendingTool.type, { ...props.pendingTool.data }, position.x, position.y);
  emit('node-placed');
};

const miniMapNodeColor = (node: Node) => {
  switch (node.type) {
    case 'shape': return '#818cf8';
    case 'bubble': return '#60a5fa';
    case 'card': return '#a78bfa';
    case 'image': return '#34d399';
    case 'docRef': return '#6366f1';
    case 'resourceRef': return '#10b981';
    case 'chart': return '#f59e0b';
    case 'timeline': return '#14b8a6';
    case 'entityGraph': return '#f97316';
    default: return '#94a3b8';
  }
};

const exportAsImage = async () => {
  const { toPng } = await import('html-to-image');
  const el = document.querySelector('.canvas-flow .vue-flow__viewport') as HTMLElement;
  if (!el) return;

  // Hide UI elements during export
  const controls = document.querySelector('.canvas-flow .vue-flow__controls') as HTMLElement;
  const minimap = document.querySelector('.canvas-flow .vue-flow__minimap') as HTMLElement;
  if (controls) controls.style.display = 'none';
  if (minimap) minimap.style.display = 'none';

  // Inline edge styles so html-to-image renders them correctly
  const edgePaths = el.querySelectorAll('.vue-flow__edge-path');
  const originalStyles: { el: SVGElement; style: string }[] = [];
  edgePaths.forEach((path) => {
    const svgPath = path as SVGElement;
    originalStyles.push({ el: svgPath, style: svgPath.getAttribute('style') || '' });
    const computed = getComputedStyle(svgPath);
    svgPath.setAttribute('style',
      `stroke: ${computed.stroke || '#94a3b8'}; stroke-width: ${computed.strokeWidth || '1.5'}; fill: none;`
    );
  });

  // Remove marker-end references (they render as black blocks)
  const markerPaths = el.querySelectorAll('[marker-end]');
  const originalMarkers: { el: SVGElement; marker: string }[] = [];
  markerPaths.forEach((path) => {
    const svgPath = path as SVGElement;
    originalMarkers.push({ el: svgPath, marker: svgPath.getAttribute('marker-end') || '' });
    svgPath.removeAttribute('marker-end');
  });

  try {
    const dataUrl = await toPng(el, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-surface-base')?.trim() || '#f8fafc',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (node.classList?.contains('vue-flow__handle')) return false;
          if (node.classList?.contains('vue-flow__resize-control')) return false;
        }
        return true;
      },
    });

    const link = document.createElement('a');
    link.download = 'canvas.png';
    link.href = dataUrl;
    link.click();
  } finally {
    // Restore original styles and markers
    originalStyles.forEach(({ el: svgEl, style }) => svgEl.setAttribute('style', style));
    originalMarkers.forEach(({ el: svgEl, marker }) => svgEl.setAttribute('marker-end', marker));
    if (controls) controls.style.display = '';
    if (minimap) minimap.style.display = '';
  }
};

defineExpose({ addNode, updateNodeData, exportAsImage });
</script>

<style>
.canvas-flow {
  background-color: var(--color-surface-base, #f8fafc);
}

.canvas-flow.cursor-crosshair,
.canvas-flow.cursor-crosshair .vue-flow__pane {
  cursor: crosshair;
}

.canvas-flow .vue-flow__edge.selected .vue-flow__edge-path {
  stroke: var(--color-accent, #6366f1) !important;
  stroke-width: 2;
}

.canvas-flow .vue-flow__connection-path {
  stroke: var(--color-accent, #6366f1);
  stroke-width: 1.5;
  stroke-dasharray: 5 5;
}

.canvas-flow .vue-flow__minimap {
  background-color: var(--color-surface-elevated, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
