import { Node, mergeAttributes } from '@tiptap/core';
import { createApp, h } from 'vue';
import DatasetViewNode from '../DatasetViewNode.vue';

export interface DatasetViewOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        datasetView: {
            insertDatasetView: (attributes: {
                datasetId: number;
                datasetName: string;
                fields: string[];
                filters: { field: string; operator: string; value: string }[];
            }) => ReturnType;
        };
    }
}

export const DatasetViewExtension = Node.create<DatasetViewOptions>({
    name: 'datasetView',
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
            datasetId: {
                default: null,
                parseHTML: (element) => {
                    const val = element.getAttribute('data-dataset-id');
                    return val ? Number(val) : null;
                },
                renderHTML: (attributes) => ({
                    'data-dataset-id': attributes.datasetId,
                }),
            },
            datasetName: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-dataset-name') || '',
                renderHTML: (attributes) => ({
                    'data-dataset-name': attributes.datasetName,
                }),
            },
            fields: {
                default: '[]',
                parseHTML: (element) => element.getAttribute('data-fields') || '[]',
                renderHTML: (attributes) => ({
                    'data-fields': attributes.fields,
                }),
            },
            filters: {
                default: '[]',
                parseHTML: (element) => element.getAttribute('data-filters') || '[]',
                renderHTML: (attributes) => ({
                    'data-filters': attributes.filters,
                }),
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'div[data-dataset-view]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-dataset-view': '',
                class: 'dataset-view',
                contenteditable: 'false',
            }),
        ];
    },

    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement('div');
            dom.classList.add('dataset-view-wrapper');
            dom.setAttribute('contenteditable', 'false');

            const app = createApp(DatasetViewNode, {
                datasetId: node.attrs.datasetId,
                datasetName: node.attrs.datasetName,
                fields: node.attrs.fields,
                filters: node.attrs.filters,
                editable: editor.isEditable,
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
            insertDatasetView:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            datasetId: attributes.datasetId,
                            datasetName: attributes.datasetName,
                            fields: JSON.stringify(attributes.fields),
                            filters: JSON.stringify(attributes.filters),
                        },
                    });
                },
        };
    },
});

export default DatasetViewExtension;
