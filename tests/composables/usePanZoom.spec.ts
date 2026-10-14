import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePanZoom, type PanDrag, type PanZoomOptions } from '../../src/composables/usePanZoom';

// usePanZoom registers an unmount hook, so it needs a component instance.
function withPanZoom(options: PanZoomOptions) {
    let panZoom!: ReturnType<typeof usePanZoom>;
    const wrapper = mount(
        defineComponent({
            setup() {
                panZoom = usePanZoom(options);
                return () => h('div');
            },
        }),
    );
    return { panZoom, wrapper };
}

const mouse = (type: string, init: MouseEventInit = {}) => new MouseEvent(type, init);
const wheel = (deltaY: number) => new WheelEvent('wheel', { deltaY });

describe('usePanZoom', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts from the persisted values and defaults to 100%', () => {
        const { panZoom } = withPanZoom({ initialZoom: 1.5, initialPanX: 12, initialPanY: -8, minZoom: 0.25 });

        expect(panZoom.zoom.value).toBe(1.5);
        expect(panZoom.panX.value).toBe(12);
        expect(panZoom.panY.value).toBe(-8);
        expect(panZoom.zoomLabel.value).toBe('150%');
    });

    it('treats a falsy persisted zoom as the default (1), preserving the previous semantics', () => {
        const { panZoom } = withPanZoom({ initialZoom: 0, minZoom: 0.25 });

        expect(panZoom.zoom.value).toBe(1);
    });

    it('clamps zoom in at 5 and zoom out at the caller minZoom', () => {
        const timeline = withPanZoom({ minZoom: 0.25 });
        const canvas = withPanZoom({ minZoom: 0.2 });

        for (let i = 0; i < 20; i += 1) {
            timeline.panZoom.zoomIn();
            canvas.panZoom.zoomIn();
        }

        expect(timeline.panZoom.zoom.value).toBe(5);
        expect(canvas.panZoom.zoom.value).toBe(5);

        for (let i = 0; i < 40; i += 1) {
            timeline.panZoom.zoomOut();
            canvas.panZoom.zoomOut();
        }

        expect(timeline.panZoom.zoom.value).toBe(0.25);
        expect(canvas.panZoom.zoom.value).toBe(0.2);
    });

    it('zooms with the wheel and respects minZoom', () => {
        const { panZoom } = withPanZoom({ minZoom: 0.2 });

        panZoom.onWheel(wheel(-100));
        expect(panZoom.zoom.value).toBeCloseTo(1.1);

        for (let i = 0; i < 40; i += 1) {
            panZoom.onWheel(wheel(100));
        }

        expect(panZoom.zoom.value).toBe(0.2);
    });

    it('resets zoom and pan to the defaults', () => {
        const { panZoom } = withPanZoom({ initialZoom: 2, initialPanX: 30, initialPanY: 40, minZoom: 0.25 });

        panZoom.resetView();

        expect(panZoom.zoom.value).toBe(1);
        expect(panZoom.panX.value).toBe(0);
        expect(panZoom.panY.value).toBe(0);
    });

    it('persists the rounded view state 400ms after the last change', () => {
        vi.useFakeTimers();
        const onViewChange = vi.fn();
        const { panZoom } = withPanZoom({ minZoom: 0.25, onViewChange });

        panZoom.onWheel(wheel(-100));
        panZoom.onWheel(wheel(-100));
        panZoom.panX.value = 12.3456;
        panZoom.panY.value = -7.8912;

        expect(onViewChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(399);
        expect(onViewChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onViewChange).toHaveBeenCalledOnce();
        expect(onViewChange.mock.calls[0][0]).toEqual({
            zoom: 1.21,
            panX: 12.35,
            panY: -7.89,
        });
    });

    it('does not persist when no onViewChange is provided', () => {
        vi.useFakeTimers();
        const { panZoom } = withPanZoom({ minZoom: 0.25 });

        panZoom.zoomIn();

        expect(() => vi.advanceTimersByTime(400)).not.toThrow();
    });

    it('ignores drags that do not start with the left button', () => {
        const { panZoom } = withPanZoom({ minZoom: 0.25 });
        const drag = vi.fn();

        panZoom.startPan(mouse('mousedown', { button: 2 }), drag);
        window.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 10 }));

        expect(panZoom.isPanning.value).toBe(false);
        expect(drag).not.toHaveBeenCalled();
    });

    it('reports the pixel delta and the pan snapshot to the drag callback', () => {
        const { panZoom } = withPanZoom({ minZoom: 0.25 });
        const drag = vi.fn();
        panZoom.panX.value = 5;
        panZoom.panY.value = 6;

        panZoom.startPan(mouse('mousedown', { button: 0, clientX: 100, clientY: 50 }), drag);
        expect(panZoom.isPanning.value).toBe(true);

        window.dispatchEvent(mouse('mousemove', { clientX: 130, clientY: 70 }));

        expect(drag).toHaveBeenCalledOnce();
        expect(drag.mock.calls[0][0]).toEqual({ dx: 30, dy: 20, startPanX: 5, startPanY: 6 } as PanDrag);
    });

    it('stops reporting drags after mouseup', () => {
        const { panZoom } = withPanZoom({ minZoom: 0.25 });
        const drag = vi.fn();

        panZoom.startPan(mouse('mousedown', { button: 0, clientX: 0, clientY: 0 }), drag);
        window.dispatchEvent(mouse('mouseup'));
        window.dispatchEvent(mouse('mousemove', { clientX: 40, clientY: 40 }));

        expect(panZoom.isPanning.value).toBe(false);
        expect(drag).not.toHaveBeenCalled();
    });

    it('releases the window listeners when the component unmounts', () => {
        const { panZoom, wrapper } = withPanZoom({ minZoom: 0.25 });
        const drag = vi.fn();

        panZoom.startPan(mouse('mousedown', { button: 0, clientX: 0, clientY: 0 }), drag);
        wrapper.unmount();
        window.dispatchEvent(mouse('mousemove', { clientX: 40, clientY: 40 }));

        expect(drag).not.toHaveBeenCalled();
    });
});
