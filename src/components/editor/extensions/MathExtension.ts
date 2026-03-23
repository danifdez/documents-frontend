import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import katex from 'katex';

export interface MathOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        mathNode: {
            insertMath: (formula: string) => ReturnType;
        };
    }
}

export const MathExtension = Node.create<MathOptions>({
    name: 'mathNode',
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
            formula: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-formula') || '',
                renderHTML: (attributes) => ({
                    'data-formula': attributes.formula,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-formula]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: 'math-node',
                contenteditable: 'false',
            }),
        ];
    },

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('span');
            dom.classList.add('math-node');
            dom.setAttribute('data-formula', node.attrs.formula);
            dom.contentEditable = 'false';
            dom.style.cssText =
                'display:inline-block;padding:2px 6px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:4px;cursor:pointer;font-family:serif;vertical-align:middle;';

            try {
                katex.render(node.attrs.formula, dom, {
                    throwOnError: false,
                    displayMode: false,
                });
            } catch {
                dom.textContent = node.attrs.formula;
            }

            dom.title = node.attrs.formula;

            return { dom };
        };
    },

    addCommands() {
        return {
            insertMath:
                (formula: string) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: { formula },
                    });
                },
        };
    },

    addProseMirrorPlugins() {
        const editor = this.editor;

        return [
            new Plugin({
                key: new PluginKey('math-edit'),
                props: {
                    handleDoubleClick(view, pos) {
                        const node = view.state.doc.nodeAt(pos);
                        if (node && node.type.name === 'mathNode') {
                            const currentFormula = node.attrs.formula;
                            const newFormula = prompt('Edit math formula (LaTeX):', currentFormula);
                            if (newFormula !== null && newFormula !== currentFormula) {
                                const tr = view.state.tr;
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    formula: newFormula,
                                });
                                view.dispatch(tr);
                            }
                            return true;
                        }
                        return false;
                    },
                },
            }),
        ];
    },
});

export default MathExtension;
