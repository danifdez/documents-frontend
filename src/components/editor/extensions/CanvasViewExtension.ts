import { Node, mergeAttributes } from '@tiptap/core';
import { createApp } from 'vue';
import CanvasViewNode from '../CanvasViewNode.vue';

export interface CanvasViewOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        canvasView: {
            insertCanvasView: (attributes: {
                canvasId: number;
                canvasName: string;
            }) => ReturnType;
        };
    }
}

export const CanvasViewExtension = Node.create<CanvasViewOptions>({
    name: 'canvasView',
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            canvasId: {
                default: null,
                parseHTML: (element) => {
                    const val = element.getAttribute('data-canvas-id');
                    return val ? Number(val) : null;
                },
                renderHTML: (attributes) => ({
                    'data-canvas-id': attributes.canvasId,
                }),
            },
            canvasName: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-canvas-name') || '',
                renderHTML: (attributes) => ({
                    'data-canvas-name': attributes.canvasName,
                }),
            },
            viewZoom: {
                default: 1,
                parseHTML: (element) => {
                    const val = element.getAttribute('data-view-zoom');
                    return val ? Number(val) : 1;
                },
                renderHTML: (attributes) => ({
                    'data-view-zoom': attributes.viewZoom,
                }),
            },
            viewPanX: {
                default: 0,
                parseHTML: (element) => {
                    const val = element.getAttribute('data-view-pan-x');
                    return val ? Number(val) : 0;
                },
                renderHTML: (attributes) => ({
                    'data-view-pan-x': attributes.viewPanX,
                }),
            },
            viewPanY: {
                default: 0,
                parseHTML: (element) => {
                    const val = element.getAttribute('data-view-pan-y');
                    return val ? Number(val) : 0;
                },
                renderHTML: (attributes) => ({
                    'data-view-pan-y': attributes.viewPanY,
                }),
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'div[data-canvas-view]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-canvas-view': '',
                class: 'canvas-view',
                contenteditable: 'false',
            }),
        ];
    },

    addNodeView() {
        return ({ node, editor, getPos }) => {
            const dom = document.createElement('div');
            dom.classList.add('canvas-view-wrapper');
            dom.setAttribute('contenteditable', 'false');

            const updateAttrs = (attrs: Record<string, any>) => {
                const pos = getPos();
                if (typeof pos !== 'number') return;
                // Read current attrs from the document state (not the stale closure)
                const currentNode = editor.view.state.doc.nodeAt(pos);
                if (!currentNode) return;
                const tr = editor.view.state.tr.setNodeMarkup(pos, undefined, {
                    ...currentNode.attrs,
                    ...attrs,
                });
                editor.view.dispatch(tr);
            };

            const app = createApp(CanvasViewNode, {
                canvasId: node.attrs.canvasId,
                canvasName: node.attrs.canvasName,
                editable: editor.isEditable,
                initialZoom: node.attrs.viewZoom,
                initialPanX: node.attrs.viewPanX,
                initialPanY: node.attrs.viewPanY,
                onViewChange: (state: { zoom: number; panX: number; panY: number }) => {
                    updateAttrs({
                        viewZoom: state.zoom,
                        viewPanX: state.panX,
                        viewPanY: state.panY,
                    });
                },
            });

            app.mount(dom);

            return {
                dom,
                destroy: () => app.unmount(),
                ignoreMutation: () => true,
            };
        };
    },

    addCommands() {
        return {
            insertCanvasView:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            canvasId: attributes.canvasId,
                            canvasName: attributes.canvasName,
                        },
                    });
                },
        };
    },
});

export default CanvasViewExtension;
