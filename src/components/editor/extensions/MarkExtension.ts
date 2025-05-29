import { Mark } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface MarkOptions {
    HTMLAttributes: Record<string, any>;
    onMarkClick?: (markId: string) => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textMark: {
            setTextMark: (markId: string) => ReturnType;
            unsetTextMark: () => ReturnType;
        }
    }
}

export const MarkExtension = Mark.create<MarkOptions>({
    name: 'textMark',
    priority: 1000, // High priority to make sure it's applied

    addOptions() {
        return {
            HTMLAttributes: {},
            onMarkClick: undefined,
        };
    },

    addAttributes() {
        return {
            markId: {
                default: null,
                parseHTML: element => element.getAttribute('data-mark-id'),
                renderHTML: attributes => {
                    if (!attributes.markId) {
                        return {};
                    }

                    return {
                        'data-mark-id': attributes.markId,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-mark-id]',
                getAttrs: element => {
                    if (typeof element === 'string') return {};

                    return {
                        markId: element.getAttribute('data-mark-id'),
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', { ...this.options.HTMLAttributes, ...HTMLAttributes, class: 'text-mark' }, 0];
    },

    addCommands() {
        return {
            setTextMark:
                markId => ({ commands }) => {
                    return commands.setMark(this.name, { markId });
                },
            unsetTextMark:
                () => ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
        };
    },

    addProseMirrorPlugins() {
        const { onMarkClick } = this.options;

        if (!onMarkClick) {
            return [];
        }

        return [
            new Plugin({
                key: new PluginKey('mark-click'),
                props: {
                    handleClick(view, pos) {
                        const { doc } = view.state;
                        const $pos = doc.resolve(pos);
                        const textMark = $pos.marks().find(mark => mark.type.name === 'textMark');

                        if (textMark && textMark.attrs.markId) {
                            onMarkClick(textMark.attrs.markId);
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});

export default MarkExtension;
