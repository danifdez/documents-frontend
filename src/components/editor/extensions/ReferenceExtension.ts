import { Node, mergeAttributes } from '@tiptap/core';
import { createApp, type App } from 'vue';
import ReferencePopover from '../ReferencePopover.vue';
import type { BibliographyEntry } from '../../../types/Bibliography';
import type { CitationStyle } from '../../../services/citations/citationFormatter';

export type RefType = 'bibliography' | 'resource' | 'doc' | 'mark' | 'knowledge';

export interface ReferenceNodeOptions {
    HTMLAttributes: Record<string, unknown>;
    getEntries: () => BibliographyEntry[];
    citationStyle: CitationStyle;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        referenceNode: {
            insertReference: (attributes: {
                refId: string;
                refType: RefType;
                label: string;
                displayMode?: string;
                citeStyle?: CitationStyle;
            }) => ReturnType;
        };
    }
}

const STYLE_MAP: Record<string, string> = {
    bibliography: 'background:#dbeafe;color:#1d4ed8;',
    resource: 'background:#e0e7ff;color:#3730a3;',
    doc: 'background:#d1fae5;color:#065f46;',
    mark: 'background:#fef3c7;color:#92400e;',
    knowledge: 'background:#ede9fe;color:#5b21b6;',
};

export const ReferenceNode = Node.create<ReferenceNodeOptions>({
    name: 'referenceNode',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    addOptions() {
        return {
            HTMLAttributes: {},
            getEntries: () => [],
            citationStyle: 'apa' as CitationStyle,
        };
    },

    addAttributes() {
        return {
            'data-ref-id': { default: null },
            'data-ref-type': { default: null },
            'data-display-mode': { default: 'citation' },
            'data-label': { default: null },
            'data-cite-style': { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-ref-id]' }];
    },

    renderHTML({ HTMLAttributes }) {
        const refType = HTMLAttributes['data-ref-type'] || 'resource';
        const baseStyle = STYLE_MAP[refType] || STYLE_MAP.resource;
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: 'reference-node',
                contenteditable: 'false',
                style: `${baseStyle}border-radius:3px;padding:0 4px;cursor:pointer;font-size:0.9em;white-space:nowrap;`,
            }),
            HTMLAttributes['data-label'] || '?',
        ];
    },

    addNodeView() {
        const getEntries = this.options.getEntries;
        const defaultCiteStyle = this.options.citationStyle;

        return ({ node, getPos, editor }) => {
            const dom = document.createElement('span');
            dom.style.display = 'inline';

            const updateAttrs = (newAttrs: Record<string, any>) => {
                const pos = typeof getPos === 'function' ? getPos() : undefined;
                if (pos == null) return;
                editor.view.dispatch(
                    editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...newAttrs })
                );
            };

            const app: App = createApp(ReferencePopover, {
                refId: String(node.attrs['data-ref-id'] ?? ''),
                refType: String(node.attrs['data-ref-type'] ?? 'resource'),
                label: node.attrs['data-label'] || '?',
                displayMode: node.attrs['data-display-mode'] || 'citation',
                citeStyle: node.attrs['data-cite-style'] || defaultCiteStyle,
                getEntries,
                onUpdateAttrs: updateAttrs,
            });

            app.mount(dom);

            return {
                dom,
                destroy: () => app.unmount(),
                ignoreMutation: () => true,
                stopEvent: (event: Event) => event.type === 'mousedown' || event.type === 'click',
            };
        };
    },

    addCommands() {
        return {
            insertReference: (attributes) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        'data-ref-id': attributes.refId,
                        'data-ref-type': attributes.refType,
                        'data-label': attributes.label,
                        'data-display-mode': attributes.displayMode ?? 'citation',
                        'data-cite-style': attributes.citeStyle ?? null,
                    },
                });
            },
        };
    },
});
