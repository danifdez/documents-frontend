import { Node, mergeAttributes } from '@tiptap/core';

export interface ReferenceNodeOptions {
    HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        referenceNode: {
            insertReferenceNode: (attributes: { referenceId: string; referenceType: string; text: string }) => ReturnType;
        };
    }
}

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
        };
    },
    addAttributes() {
        return {
            'data-reference-id': {
                default: null,
            },
            'data-reference-type': {
                default: null,
            },
            'data-text': {
                default: null,
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'span[data-reference-id]',
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: 'reference-node',
                contenteditable: 'false',
                style: 'background: #e0e7ff; color: #3730a3; border-radius: 3px; padding: 0 4px; cursor: pointer;',
            }),
            HTMLAttributes['data-text'] || 'Reference',
        ];
    },
    addCommands() {
        return {
            insertReferenceNode: (attributes) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        'data-reference-id': attributes.referenceId,
                        'data-reference-type': attributes.referenceType,
                        'data-text': attributes.text,
                    },
                });
            },
        };
    },
});
