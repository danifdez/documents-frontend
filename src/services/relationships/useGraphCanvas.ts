import { ref } from 'vue';
import {
    buildGraphLayout,
    collectNodesWithinHops,
    computeFitTransform,
    drawGraph,
    findNodeAt,
    type SimLink,
    type SimNode,
} from './graphEngine';
import type { Relationship, RelationshipEntity } from './useRelationships';

export interface UseGraphCanvasOptions {
    getEntities: () => RelationshipEntity[];
    getRelationships: () => Relationship[];
    getNodeColor: (type: string) => string;
}

// Interactive layer over graphEngine: owns the canvas element, pan/zoom state
// and mouse/keyboard handlers; all layout and drawing is delegated to the engine.
export function useGraphCanvas({ getEntities, getRelationships, getNodeColor }: UseGraphCanvasOptions) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const zoom = ref(1);
    const panX = ref(0);
    const panY = ref(0);
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let panStartPanX = 0;
    let panStartPanY = 0;
    let draggedNode: SimNode | null = null;
    let didDrag = false;
    const selectedNodeIdx = ref<number | null>(null);
    // Focused node (dblclick): shows only nodes up to 2 hops away
    const focusedNodeIdx = ref<number | null>(null);
    // Set of entity IDs visible in the focused/selected view — used by entity list
    const activeEntityIds = ref<Set<number | string> | null>(null);

    let nodes: SimNode[] = [];
    let links: SimLink[] = [];

    const drawFrame = () => {
        const canvas = canvasRef.value;
        if (!canvas) return;
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = w * dpr; canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawGraph(ctx, nodes, links, {
            width: w,
            height: h,
            dpr,
            zoom: zoom.value,
            panX: panX.value,
            panY: panY.value,
            selectedNodeIdx: selectedNodeIdx.value,
            focusedNodeIdx: focusedNodeIdx.value,
            mutedColor: getComputedStyle(canvas).getPropertyValue('--color-text-muted') || '#94a3b8',
            getNodeColor,
        });
    };

    const buildGraph = () => {
        const ents = getEntities();
        if (!ents.length || !canvasRef.value) return;
        const layout = buildGraphLayout(ents, getRelationships());
        nodes = layout.nodes;
        links = layout.links;
        zoomToFit();
    };

    // Esc to clear selection and focus
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (focusedNodeIdx.value !== null) {
                focusedNodeIdx.value = null;
                activeEntityIds.value = null;
            }
            selectedNodeIdx.value = null;
            drawFrame();
        }
    };

    // Used when filters change: reset without redrawing (a rebuild follows)
    const clearSelection = () => {
        selectedNodeIdx.value = null;
        focusedNodeIdx.value = null;
        activeEntityIds.value = null;
    };

    const zoomIn = () => { zoom.value = Math.min(zoom.value * 1.25, 5); drawFrame(); };
    const zoomOut = () => { zoom.value = Math.max(zoom.value / 1.25, 0.2); drawFrame(); };

    const zoomToFit = () => {
        if (!nodes.length || !canvasRef.value) return;
        const fit = computeFitTransform(nodes, canvasRef.value.offsetWidth, canvasRef.value.offsetHeight);
        zoom.value = fit.zoom;
        panX.value = fit.panX;
        panY.value = fit.panY;
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

    const screenToGraph = (clientX: number, clientY: number): { gx: number; gy: number } => {
        const canvas = canvasRef.value!;
        const rect = canvas.getBoundingClientRect();
        const gx = (clientX - rect.left - panX.value) / zoom.value;
        const gy = (clientY - rect.top - panY.value) / zoom.value;
        return { gx, gy };
    };

    const onMouseDown = (e: MouseEvent) => {
        didDrag = false;
        const { gx, gy } = screenToGraph(e.clientX, e.clientY);
        const node = findNodeAt(nodes, gx, gy);
        if (node) {
            draggedNode = node;
        } else {
            isPanning = true;
            panStartX = e.clientX; panStartY = e.clientY;
            panStartPanX = panX.value; panStartPanY = panY.value;
        }
    };

    const onMouseMove = (e: MouseEvent) => {
        if (draggedNode) {
            didDrag = true;
            const { gx, gy } = screenToGraph(e.clientX, e.clientY);
            draggedNode.x = gx;
            draggedNode.y = gy;
            drawFrame();
        } else if (isPanning) {
            didDrag = true;
            panX.value = panStartPanX + (e.clientX - panStartX);
            panY.value = panStartPanY + (e.clientY - panStartY);
            drawFrame();
        }
    };

    const onMouseUp = () => {
        // Click (not drag) on a node → select it (1-hop highlight)
        if (!didDrag && draggedNode) {
            const clickedIdx = nodes.indexOf(draggedNode);
            if (selectedNodeIdx.value === clickedIdx && focusedNodeIdx.value === null) {
                selectedNodeIdx.value = null;
                activeEntityIds.value = null;
            } else if (focusedNodeIdx.value === null) {
                selectedNodeIdx.value = clickedIdx;
                // Set active entity IDs for 1-hop
                const ids = new Set<number | string>();
                ids.add(nodes[clickedIdx].id);
                for (const l of links) {
                    if (l.source === clickedIdx) ids.add(nodes[l.target].id);
                    if (l.target === clickedIdx) ids.add(nodes[l.source].id);
                }
                activeEntityIds.value = ids;
            }
            drawFrame();
        }
        // Click on empty space (no drag) → deselect and unfocus
        if (!didDrag && !draggedNode) {
            selectedNodeIdx.value = null;
            focusedNodeIdx.value = null;
            activeEntityIds.value = null;
            drawFrame();
        }
        isPanning = false;
        draggedNode = null;
    };

    const onMouseLeave = () => {
        isPanning = false;
        draggedNode = null;
    };

    const onDblClick = (e: MouseEvent) => {
        const { gx, gy } = screenToGraph(e.clientX, e.clientY);
        const node = findNodeAt(nodes, gx, gy);
        if (!node) {
            focusedNodeIdx.value = null;
            activeEntityIds.value = null;
            drawFrame();
            return;
        }
        const nodeIdx = nodes.indexOf(node);
        // If already focused on this node, unfocus
        if (focusedNodeIdx.value === nodeIdx) {
            focusedNodeIdx.value = null;
            activeEntityIds.value = null;
            drawFrame();
            return;
        }
        focusedNodeIdx.value = nodeIdx;
        selectedNodeIdx.value = nodeIdx;

        const visited = collectNodesWithinHops(links, nodeIdx, 2);

        // Set active entity IDs for the entity list
        const ids = new Set<number | string>();
        for (const ni of visited) ids.add(nodes[ni].id);
        activeEntityIds.value = ids;

        drawFrame();
    };

    const resizeObserver = new ResizeObserver(() => {
        if (canvasRef.value && getEntities().length > 0) drawFrame();
    });

    const observeCanvas = () => {
        if (canvasRef.value) resizeObserver.observe(canvasRef.value);
    };

    const dispose = () => {
        resizeObserver.disconnect();
    };

    return {
        canvasRef,
        zoom,
        activeEntityIds,
        buildGraph,
        zoomIn,
        zoomOut,
        zoomToFit,
        onWheel,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave,
        onDblClick,
        onKeyDown,
        clearSelection,
        observeCanvas,
        dispose,
    };
}
