import { computed, onUnmounted, ref } from 'vue';

export interface ViewState {
    zoom: number;
    panX: number;
    panY: number;
}

export interface PanDrag {
    /** Pixel delta since the pointer went down. */
    dx: number;
    dy: number;
    /** Pan snapshot taken when the drag started. */
    startPanX: number;
    startPanY: number;
}

export interface PanZoomOptions {
    initialZoom?: number;
    initialPanX?: number;
    initialPanY?: number;
    /** Lower zoom bound; callers differ (timeline 0.25, canvas 0.2). */
    minZoom: number;
    onViewChange?: (state: ViewState) => void;
}

const MAX_ZOOM = 5;
const ZOOM_STEP = 1.3;
const PERSIST_DELAY_MS = 400;

/**
 * Pan/zoom view state shared by the embedded editor view nodes. Owns the
 * persisted state, the zoom controls and the drag listener lifecycle; each
 * node supplies its own pixel-to-pan math through `startPan`'s callback.
 */
export function usePanZoom(options: PanZoomOptions) {
    const zoom = ref(options.initialZoom || 1);
    const panX = ref(options.initialPanX || 0);
    const panY = ref(options.initialPanY || 0);
    const isPanning = ref(false);

    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let onDrag: ((drag: PanDrag) => void) | null = null;

    const persistView = () => {
        if (!options.onViewChange) return;
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
            options.onViewChange!({
                zoom: Math.round(zoom.value * 1000) / 1000,
                panX: Math.round(panX.value * 100) / 100,
                panY: Math.round(panY.value * 100) / 100,
            });
        }, PERSIST_DELAY_MS);
    };

    const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);

    const zoomIn = () => {
        zoom.value = Math.min(zoom.value * ZOOM_STEP, MAX_ZOOM);
        persistView();
    };

    const zoomOut = () => {
        zoom.value = Math.max(zoom.value / ZOOM_STEP, options.minZoom);
        persistView();
    };

    const resetView = () => {
        zoom.value = 1;
        panX.value = 0;
        panY.value = 0;
        persistView();
    };

    const onWheel = (event: WheelEvent) => {
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        zoom.value = Math.min(Math.max(zoom.value * factor, options.minZoom), MAX_ZOOM);
        persistView();
    };

    function handleMouseMove(event: MouseEvent) {
        if (!isPanning.value || !onDrag) return;
        onDrag({
            dx: event.clientX - startX,
            dy: event.clientY - startY,
            startPanX,
            startPanY,
        });
    }

    function handleMouseUp() {
        isPanning.value = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        persistView();
    }

    const startPan = (event: MouseEvent, drag: (drag: PanDrag) => void) => {
        if (event.button !== 0) return;
        isPanning.value = true;
        onDrag = drag;
        startX = event.clientX;
        startY = event.clientY;
        startPanX = panX.value;
        startPanY = panY.value;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    onUnmounted(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    return {
        zoom,
        panX,
        panY,
        isPanning,
        zoomLabel,
        zoomIn,
        zoomOut,
        resetView,
        onWheel,
        startPan,
    };
}
