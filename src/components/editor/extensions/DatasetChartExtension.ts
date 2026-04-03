import { Node, mergeAttributes } from '@tiptap/core';
import { createApp } from 'vue';
import DatasetChartNode from '../DatasetChartNode.vue';

export interface DatasetChartOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        datasetChart: {
            insertDatasetChart: (attributes: {
                chartId: number;
                chartName: string;
                datasetId: number;
                datasetName: string;
            }) => ReturnType;
        };
    }
}

export const DatasetChartExtension = Node.create<DatasetChartOptions>({
    name: 'datasetChart',
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
            chartId: {
                default: null,
                parseHTML: (element) => {
                    const val = element.getAttribute('data-chart-id');
                    return val ? Number(val) : null;
                },
                renderHTML: (attributes) => ({
                    'data-chart-id': attributes.chartId,
                }),
            },
            chartName: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-chart-name') || '',
                renderHTML: (attributes) => ({
                    'data-chart-name': attributes.chartName,
                }),
            },
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
        };
    },

    parseHTML() {
        return [
            { tag: 'div[data-dataset-chart]' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                'data-dataset-chart': '',
                class: 'dataset-chart',
                contenteditable: 'false',
            }),
        ];
    },

    addNodeView() {
        return ({ node, editor }) => {
            const dom = document.createElement('div');
            dom.classList.add('dataset-chart-wrapper');
            dom.setAttribute('contenteditable', 'false');

            const app = createApp(DatasetChartNode, {
                chartId: node.attrs.chartId,
                chartName: node.attrs.chartName,
                datasetId: node.attrs.datasetId,
                datasetName: node.attrs.datasetName,
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
            insertDatasetChart:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            chartId: attributes.chartId,
                            chartName: attributes.chartName,
                            datasetId: attributes.datasetId,
                            datasetName: attributes.datasetName,
                        },
                    });
                },
        };
    },
});

export default DatasetChartExtension;
