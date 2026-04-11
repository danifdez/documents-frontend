import { Node, mergeAttributes } from '@tiptap/core';
import { createApp } from 'vue';
import TimelineViewNode from '../TimelineViewNode.vue';

export interface TimelineViewOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        timelineView: {
            insertTimelineView: (attributes: {
                timelineId: number;
                timelineName: string;
                filterMode?: string;
                epochId?: string;
                dateFrom?: string;
                dateTo?: string;
            }) => ReturnType;
        };
    }
}

export const TimelineViewExtension = Node.create<TimelineViewOptions>({
    name: 'timelineView',
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
            timelineId: {
                default: null,
                parseHTML: (element) => {
                    const val = element.getAttribute('data-timeline-id');
                    return val ? Number(val) : null;
                },
                renderHTML: (attributes) => ({
                    'data-timeline-id': attributes.timelineId,
                }),
            },
            timelineName: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-timeline-name') || '',
                renderHTML: (attributes) => ({
                    'data-timeline-name': attributes.timelineName,
                }),
            },
            filterMode: {
                default: 'all',
                parseHTML: (element) => element.getAttribute('data-filter-mode') || 'all',
                renderHTML: (attributes) => ({
                    'data-filter-mode': attributes.filterMode,
                }),
            },
            epochId: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-epoch-id') || '',
                renderHTML: (attributes) => ({
                    'data-epoch-id': attributes.epochId,
                }),
            },
            dateFrom: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-date-from') || '',
                renderHTML: (attributes) => ({
                    'data-date-from': attributes.dateFrom,
                }),
            },
            dateTo: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-date-to') || '',
                renderHTML: (attributes) => ({
                    'data-date-to': attributes.dateTo,
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
            { tag: 'div[data-timeline-view]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-timeline-view': '',
                class: 'timeline-view',
                contenteditable: 'false',
            }),
        ];
    },

    addNodeView() {
        return ({ node, editor, getPos }) => {
            const dom = document.createElement('div');
            dom.classList.add('timeline-view-wrapper');
            dom.setAttribute('contenteditable', 'false');

            const updateAttrs = (attrs: Record<string, any>) => {
                const pos = getPos();
                if (typeof pos !== 'number') return;
                const currentNode = editor.view.state.doc.nodeAt(pos);
                if (!currentNode) return;
                const tr = editor.view.state.tr.setNodeMarkup(pos, undefined, {
                    ...currentNode.attrs,
                    ...attrs,
                });
                editor.view.dispatch(tr);
            };

            const app = createApp(TimelineViewNode, {
                timelineId: node.attrs.timelineId,
                timelineName: node.attrs.timelineName,
                filterMode: node.attrs.filterMode,
                epochId: node.attrs.epochId,
                dateFrom: node.attrs.dateFrom,
                dateTo: node.attrs.dateTo,
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
            insertTimelineView:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            timelineId: attributes.timelineId,
                            timelineName: attributes.timelineName,
                            filterMode: attributes.filterMode || 'all',
                            epochId: attributes.epochId || '',
                            dateFrom: attributes.dateFrom || '',
                            dateTo: attributes.dateTo || '',
                        },
                    });
                },
        };
    },
});

export default TimelineViewExtension;
