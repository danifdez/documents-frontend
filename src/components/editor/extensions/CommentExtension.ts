import { Mark } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export interface CommentOptions {
    HTMLAttributes: Record<string, any>;
    onCommentClick?: (commentId: string) => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        comment: {
            setComment: (commentId: string) => ReturnType;
            unsetComment: () => ReturnType;
        }
    }
}

export const CommentExtension = Mark.create<CommentOptions>({
    name: 'comment',
    priority: 1000, // High priority to make sure it's applied

    addOptions() {
        return {
            HTMLAttributes: {},
            onCommentClick: undefined,
        };
    },

    addAttributes() {
        return {
            commentId: {
                default: null,
                parseHTML: element => element.getAttribute('data-comment-id'),
                renderHTML: attributes => {
                    if (!attributes.commentId) {
                        return {};
                    }

                    return {
                        'data-comment-id': attributes.commentId,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-comment-id]',
                getAttrs: element => {
                    if (typeof element === 'string') return {};

                    return {
                        commentId: element.getAttribute('data-comment-id'),
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', { ...this.options.HTMLAttributes, ...HTMLAttributes, class: 'comment-mark' }, 0];
    },

    addCommands() {
        return {
            setComment:
                commentId => ({ commands }) => {
                    return commands.setMark(this.name, { commentId });
                },
            unsetComment:
                () => ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
        };
    },

    addProseMirrorPlugins() {
        const { onCommentClick } = this.options;

        if (!onCommentClick) {
            return [];
        }

        return [
            new Plugin({
                key: new PluginKey('comment-click'),
                props: {
                    handleClick(view, pos) {
                        const { doc } = view.state;
                        const $pos = doc.resolve(pos);
                        const commentMark = $pos.marks().find(mark => mark.type.name === 'comment');

                        if (commentMark && commentMark.attrs.commentId) {
                            onCommentClick(commentMark.attrs.commentId);
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});

export default CommentExtension;
