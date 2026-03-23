import { Node, mergeAttributes } from '@tiptap/core';

export interface CitationNodeOptions {
    HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        citationNode: {
            insertCitation: (attributes: {
                entryId: number;
                citeKey: string;
                label: string;
            }) => ReturnType;
        };
    }
}

export const CitationNode = Node.create<CitationNodeOptions>({
    name: 'citationNode',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            'data-entry-id': {
                default: null,
            },
            'data-cite-key': {
                default: null,
            },
            'data-label': {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-entry-id]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: 'citation-node',
                contenteditable: 'false',
                style: 'background: #dbeafe; color: #1d4ed8; border-radius: 3px; padding: 0 4px; cursor: pointer; font-size: 0.9em; white-space: nowrap;',
            }),
            HTMLAttributes['data-label'] || '?',
        ];
    },

    addCommands() {
        return {
            insertCitation: (attributes) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        'data-entry-id': attributes.entryId,
                        'data-cite-key': attributes.citeKey,
                        'data-label': attributes.label,
                    },
                });
            },
        };
    },
});
