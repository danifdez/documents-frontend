import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { MARK_CONFIG, markStyle, isMarkType, type MarkType } from './markTypes';

export interface MarkOptions {
    HTMLAttributes: Record<string, any>;
    onMarkClick?: (markId: string, markType: MarkType) => void;
    onMarkShortcut?: (markType: MarkType) => boolean;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textMark: {
            setTextMark: (markId: string, markType?: MarkType) => ReturnType;
            unsetTextMark: () => ReturnType;
        };
    }
}

function readType(element: HTMLElement): MarkType {
    const attr = element.getAttribute('data-mark-type') || element.getAttribute('data-marker-type');
    if (isMarkType(attr)) return attr;
    const classes = element.className || '';
    const found = (Object.keys(MARK_CONFIG) as MarkType[]).find(
        (type) => classes.includes(`marker-type-${type}`) || classes.includes(`marker-${type}`),
    );
    return found || 'highlight';
}

function readMarkId(element: HTMLElement): string | null {
    return element.getAttribute('data-mark-id') || element.getAttribute('data-marker-id');
}

export const MarkExtension = Mark.create<MarkOptions>({
    name: 'textMark',
    priority: 1000,

    addOptions() {
        return {
            HTMLAttributes: {},
            onMarkClick: undefined,
            onMarkShortcut: undefined,
        };
    },

    addAttributes() {
        return {
            markId: {
                default: null,
                parseHTML: (element) => readMarkId(element as HTMLElement),
                renderHTML: (attributes) => {
                    if (!attributes.markId) return {};
                    return { 'data-mark-id': attributes.markId };
                },
            },
            markType: {
                default: 'highlight',
                parseHTML: (element) => readType(element as HTMLElement),
                renderHTML: (attributes) => ({
                    'data-mark-type': attributes.markType || 'highlight',
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-mark-id]',
                getAttrs: (element) => {
                    if (typeof element === 'string') return {};
                    return {
                        markId: readMarkId(element as HTMLElement),
                        markType: readType(element as HTMLElement),
                    };
                },
            },
            {
                tag: 'span[data-marker-id]',
                getAttrs: (element) => {
                    if (typeof element === 'string') return {};
                    return {
                        markId: readMarkId(element as HTMLElement),
                        markType: readType(element as HTMLElement),
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const type = (HTMLAttributes['data-mark-type'] || 'highlight') as MarkType;
        const config = MARK_CONFIG[type] || MARK_CONFIG.highlight;

        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: `marker-highlight marker-type-${type}`,
                style: markStyle(type),
                title: config.label,
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setTextMark:
                (markId: string, markType: MarkType = 'highlight') =>
                ({ commands }) => {
                    return commands.setMark(this.name, { markId, markType });
                },
            unsetTextMark:
                () =>
                ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
        };
    },

    addKeyboardShortcuts() {
        const apply = (type: MarkType) => () => {
            const handler = this.options.onMarkShortcut;
            if (handler) return handler(type);
            return false;
        };

        return {
            'Mod-Alt-i': apply('idea'),
            'Mod-Alt-w': apply('important'),
            'Mod-Alt-r': apply('review'),
            'Mod-Alt-h': apply('highlight'),
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
                        const textMark = $pos.marks().find((mark) => mark.type.name === 'textMark');

                        if (textMark && textMark.attrs.markId) {
                            onMarkClick(textMark.attrs.markId, textMark.attrs.markType);
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});

export { MARK_CONFIG, generateMarkId, isMarkType, type MarkType } from './markTypes';

export default MarkExtension;
