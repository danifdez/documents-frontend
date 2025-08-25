<template>
    <div class="editor-container">
        <EditorToolbar :editor="editor" :is-saving="isSaving" :saved-successfully="savedSuccessfully"
            :show-comments="showComments" :show-toc="showToc" @toggle-comments="toggleComments" @toggle-toc="toggleToc"
            @add-comment="handleAddCommentRequest" @add-mark="handleAddMarkRequest" @remove-mark="handleRemoveMark"
            @add-reference="showReferenceModal = true" />
        <div class="editor-scroll-wrapper">
            <div class="flex-1 p-2.5 border border-gray-300 rounded overflow-auto bg-white min-h-[300px] outline-none font-sans leading-relaxed editor-content"
                spellcheck="false" autocorrect="off" autocomplete="off" data-gramm="false" data-enable-grammarly="false"
                data-lt-tmp-id="false" data-lt-active="false" data-lt-autocomplete="off" data-lt-spellcheck="false">
                <template v-if="editor">
                    <editor-content :style="cssVars" :editor="editor" />
                </template>
            </div>
        </div>
        <CommentModal :is-visible="showCommentModal" :selected-text="selectedCommentText" :is-loading="isCommentLoading"
            @save="saveComment" @cancel="cancelComment" />
        <MarkModal :is-visible="showMarkModal" :selected-text="selectedMarkText" :is-loading="isMarkLoading"
            @save="saveMark" @cancel="cancelMark" />
        <ReferenceModal v-model="showReferenceModal" @select="handleReferenceSelect" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin } from 'prosemirror-state';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CommentExtension from './extensions/CommentExtension';
import MarkExtension from './extensions/MarkExtension';
import EditorToolbar from './EditorToolbar.vue';
import CommentModal from '../comments/CommentModal.vue';
import MarkModal from '../marks/MarkModal.vue';
import { useRoute } from 'vue-router';
import { useCommentCreate } from '../../services/comments/useCommentCreate';
import { useMarkCreate } from '../../services/marks/useMarkCreate';
import { useMarkUpdate } from '../../services/marks/useMarkUpdate';
import { useMarkDelete } from '../../services/marks/useMarkDelete';
import { useMarks } from '../../services/marks/useMarks';
import ReferenceModal from '../../components/references/ReferenceModal.vue';
import Image from '@tiptap/extension-image';
import { ReferenceNode } from './extensions/ReferenceExtension';

const props = defineProps({
    content: {
        type: String,
        default: ''
    },
    isSaving: {
        type: Boolean,
        default: false
    },
    savedSuccessfully: {
        type: Boolean,
        default: false
    },
    showToc: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'content-change',
    'toggle-comments',
    'toggle-toc',
    'highlight-comment',
    'highlight-mark'
]);

const editor = ref(null);
const isMounted = ref(false);
const showComments = ref(false);
const route = useRoute();
const { createComment, isLoading: isCommentLoading } = useCommentCreate();
const { createMark, isLoading: isMarkLoading } = useMarkCreate();
const { updateMark } = useMarkUpdate();
const { deleteMark } = useMarkDelete();
const { marks, loadMarks } = useMarks();
const markContentMap = ref<Map<string, string>>(new Map());
const showCommentModal = ref(false);
const showMarkModal = ref(false);
const selectedCommentText = ref('');
const selectedMarkText = ref('');
const currentSelection = ref(null);
const matches = ref([]);
const showReferenceModal = ref(false);
let currentDecorations = DecorationSet.empty

const settings = ref({ fontSize: 16, fontFamily: 'sans-serif', paragraphSpacing: 1.5 });

const cssVars = ref({
    '--font-size-p': settings.value.fontSize.toString(),
    '--font-family': settings.value.fontFamily,
    '--paragraph-spacing': settings.value.paragraphSpacing.toString(),
});

function createSearchDecorationPlugin(getDecorations) {
    return new Plugin({
        props: {
            decorations() {
                return getDecorations()
            },
        },
    })
}

const toggleComments = () => {
    showComments.value = !showComments.value;
    emit('toggle-comments', showComments.value);
};

const toggleToc = () => {
    emit('toggle-toc');
};

const handleAddCommentRequest = (selection: { text: string; from: number; to: number }) => {
    selectedCommentText.value = selection.text;
    currentSelection.value = {
        from: selection.from,
        to: selection.to
    };
    showCommentModal.value = true;
};

const saveComment = async (commentText: string) => {
    try {
        if (!commentText.trim() || !route.params.id || route.params.id === 'new') {
            return;
        }

        const newComment = await createComment(
            route.params.id,
            commentText,
        );

        if (editor.value && currentSelection.value) {
            const { from, to } = currentSelection.value;
            editor.value.commands.setTextSelection({ from, to });
            editor.value.commands.setComment(newComment._id);
        }

        showCommentModal.value = false;
        currentSelection.value = null;

        if (!showComments.value) {
            toggleComments();
        }
    } catch (error) {
        console.error('Error saving comment:', error);
    }
};

const cancelComment = () => {
    showCommentModal.value = false;
    currentSelection.value = null;
    selectedCommentText.value = '';
};

const highlightComment = (commentId: string) => {
    emit('highlight-comment', commentId);
};

const handleAddMarkRequest = (selection: { text: string; from: number; to: number }) => {
    selectedMarkText.value = selection.text;
    currentSelection.value = {
        from: selection.from,
        to: selection.to
    };
    showMarkModal.value = true;
};

const saveMark = async () => {
    try {
        if (!route.params.id || route.params.id === 'new') {
            return;
        }

        const newMark = await createMark(
            route.params.id as string,
            selectedMarkText.value
        );

        if (editor.value && currentSelection.value) {
            const { from, to } = currentSelection.value;
            editor.value.commands.setTextSelection({ from, to });
            editor.value.commands.setTextMark(newMark._id);
        }

        showMarkModal.value = false;
        currentSelection.value = null;
    } catch (error) {
        console.error('Error creating mark:', error);
    }
};

const cancelMark = () => {
    showMarkModal.value = false;
    currentSelection.value = null;
};

const onMarkClick = (markId: string) => {
    console.log('Mark clicked:', markId);
};

const loadDocumentMarks = async () => {
    try {
        if (route.params.id && route.params.id !== 'new') {
            const loadedMarks = await loadMarks(route.params.id as string);

            if (editor.value && loadedMarks.length > 0) {
                loadedMarks.forEach(mark => {
                    markContentMap.value.set(mark._id, mark.content);
                });
                setTimeout(() => {
                    loadedMarks.forEach(mark => {
                        try {
                            if (!mark.content || !mark._id) {
                                console.warn('Invalid mark data:', mark);
                                return;
                            }

                            const content = editor.value.state.doc.textContent;
                            const position = content.indexOf(mark.content);

                            if (position !== -1) {
                                editor.value.commands.setTextSelection({
                                    from: position,
                                    to: position + mark.content.length
                                });
                                editor.value.commands.setTextMark(mark._id);
                            } else {
                                console.warn(`Mark content not found in document: ${mark.content}`);
                            }
                        } catch (err) {
                            console.error(`Error applying mark ${mark._id}:`, err);
                        }
                    });
                }, 500);
            }
        }
    } catch (error) {
        console.error('Error loading marks:', error);
    }
};

const checkForMarkChanges = (editor: Editor) => {
    if (markContentMap.value.size === 0) return;

    const doc = editor.state.doc;
    const markChanges = new Map<string, string>();

    const processNode = (node: any, pos: number) => {
        const marks = node.marks.filter((mark: any) => mark.type.name === 'textMark');

        if (marks.length > 0) {
            const content = node.text;

            marks.forEach((mark: any) => {
                const markId = mark.attrs.markId;
                const originalContent = markContentMap.value.get(markId);

                if (originalContent && content !== originalContent && !markChanges.has(markId)) {
                    markChanges.set(markId, content);
                }
            });
        }
    };

    doc.descendants((node: any, pos: number) => {
        if (node.isText) {
            processNode(node, pos);
        }
        return true;
    });

    if (markChanges.size > 0) {
        markChanges.forEach((newContent, markId) => {
            updateMark(markId, newContent)
                .then(() => {
                    markContentMap.value.set(markId, newContent);
                    console.log(`Updated mark ${markId} with new content: ${newContent}`);
                })
                .catch(error => {
                    console.error(`Error updating mark ${markId}:`, error);
                });
        });
    }
};

const handleReferenceSelect = (item: any) => {
    const { from, to } = editor.value.state.selection;
    const text = editor.value.state.doc.textBetween(from, to) || item.name || item.content;

    editor.value
        .chain()
        .focus()
        .insertReferenceNode({
            referenceId: item._id,
            referenceType: item.type,
            text: text,
        })
        .run();
};

const applySettings = () => {
    cssVars.value = {
        '--font-size-p': settings.value.fontSize.toString(),
        '--font-family': settings.value.fontFamily || 'sans-serif',
        '--paragraph-spacing': settings.value.paragraphSpacing.toString(),
    };
};

const loadAndApplySettings = async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
        const loaded = await window.electronAPI.getSettings();
        if (loaded) {
            settings.value = loaded;
        }
    }
    applySettings();
};

onMounted(async () => {
    isMounted.value = true;

    editor.value = new Editor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                blockquote: {
                    HTMLAttributes: {
                        class: 'border-l-4 border-gray-300 pl-4 my-2 text-gray-500',
                    },
                },
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse w-full my-2',
                },
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'bg-gray-100 font-semibold',
                },
            }),
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-gray-300 p-2',
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline cursor-pointer',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            Placeholder.configure({
                placeholder: 'Start writing...',
            }),
            CommentExtension.configure({
                HTMLAttributes: {
                    class: 'bg-yellow-100 rounded px-1',
                },
                onCommentClick: (commentId) => {
                    highlightComment(commentId);
                    if (!showComments.value) {
                        toggleComments();
                    }
                },
            }),
            MarkExtension.configure({
                HTMLAttributes: {
                    class: 'bg-orange-100 rounded px-1',
                },
                onMarkClick: onMarkClick,
            }),
            ReferenceNode,
            Image, // <-- Add Image extension here
        ],
        content: props.content || '<p></p>',
        autofocus: true,
        editable: true,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            checkForMarkChanges(editor);
            emit('content-change', html);
        },
    });

    if (editor.value) {
        editor.value.registerPlugin(createSearchDecorationPlugin(() => currentDecorations))
    }

    await loadDocumentMarks();
    loadAndApplySettings();
});

onBeforeUnmount(() => {
    isMounted.value = false;
    if (editor.value) {
        editor.value.destroy();
    }
});

watch(() => props.content, (newContent) => {
    if (editor.value && newContent !== editor.value.getHTML()) {
        editor.value.commands.setContent(newContent || '<p></p>');
    }
}, { deep: true });

watch(
    () => settings.value,
    () => {
        applySettings();
    },
    { deep: true }
);

const setLink = (url: string) => {
    if (url === '' || url === undefined) {
        editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
    }

    // Make sure the URL has a valid protocol
    if (!/^https?:\/\//i.test(url) && !url.startsWith('#')) {
        url = 'https://' + url;
    }

    editor.value
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url, target: '_blank' })
        .run();
};

const handleRemoveMark = async (markId: string) => {
    try {
        if (!editor.value) return;

        editor.value.chain()
            .focus()
            .extendMarkRange('textMark')
            .unsetMark('textMark')
            .run();

        await deleteMark(markId);
        markContentMap.value.delete(markId);
    } catch (error) {
        console.error('Error removing mark:', error);
    }
};

const search = (text: string) => {
    matches.value = [];
    const decorations: Decoration[] = [];
    editor.value.state.doc.descendants((node, pos) => {
        if (node.isText) {
            let index = node.text.indexOf(text);
            while (index !== -1) {
                const from = pos + index;
                const to = pos + index + text.length;

                matches.value.push({
                    from,
                    to,
                    match: text
                });
                decorations.push(
                    Decoration.inline(from, to, { class: 'search-highlight' })
                );

                index = node.text.indexOf(text, index + 1);
            }
        }
    });
    currentDecorations = DecorationSet.create(editor.value.state.doc, decorations)
    editor.value.view.dispatch(editor.value.state.tr)
    return matches.value.length;
}

const scrollTo = (index: number) => {
    if (!matches.value.length || index >= matches.value.length || !editor.value) return;

    const { from, to } = matches.value[index];

    editor.value.chain().setTextSelection({ from, to }).run();

    requestAnimationFrame(() => {
        try {
            const dom = editor.value.view.domAtPos(from);
            const element = dom.node.nodeType === 3 ? dom.node.parentElement : dom.node as HTMLElement;

            if (element && typeof element.scrollIntoView === 'function') {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (e) {
            console.error('scrollTo error:', e);
        }
    });
};

const clearHighlights = () => {
    matches.value = [];
    currentDecorations = DecorationSet.empty;
    if (editor.value) {
        editor.value.view.dispatch(editor.value.state.tr);
    }
};

const scrollToPosition = (position: number) => {
    if (!editor.value) return;

    // First, set the text selection at the position
    editor.value.chain().setTextSelection(position).run();
    editor.value.commands.focus();

    // Find the editor container element for proper scrolling
    const editorElement = editor.value.view.dom;
    const scrollContainer = editorElement.closest('.editor-content') || editorElement.parentElement;

    // Scroll the element into view with proper timing
    setTimeout(() => {
        try {
            const dom = editor.value.view.domAtPos(position);
            let targetElement = dom.node;
            
            // If it's a text node, get the parent element
            if (targetElement.nodeType === 3) {
                targetElement = targetElement.parentElement;
            }
            
            // Find the actual heading element
            while (targetElement && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(targetElement.tagName)) {
                targetElement = targetElement.parentElement;
                if (!targetElement || targetElement === document.body) break;
            }

            if (targetElement && typeof targetElement.scrollIntoView === 'function') {
                // Use scrollIntoView with proper options for better positioning
                targetElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start',
                    inline: 'nearest' 
                });
                
                // Additional manual scroll adjustment to ensure proper viewport positioning
                setTimeout(() => {
                    if (scrollContainer && scrollContainer.scrollTop !== undefined) {
                        const elementRect = targetElement.getBoundingClientRect();
                        const containerRect = scrollContainer.getBoundingClientRect();
                        
                        // Calculate the offset to position the heading near the top of the viewport
                        const offset = 20; // 20px from top
                        const currentScroll = scrollContainer.scrollTop;
                        const elementPosition = elementRect.top - containerRect.top;
                        const targetScroll = currentScroll + elementPosition - offset;
                        
                        scrollContainer.scrollTo({
                            top: Math.max(0, targetScroll),
                            behavior: 'smooth'
                        });
                    }
                }, 100);
            }
        } catch (e) {
            console.error('scrollToPosition error:', e);
        }
    }, 150);
};defineExpose({
    editor,
    setLink,
    search,
    scrollTo,
    scrollToPosition,
    clearHighlights,
    undo() {
        if (editor.value) {
            editor.value.commands.undo();
        }
    },
    redo() {
        if (editor.value) {
            editor.value.commands.redo();
        }
    },
});

</script>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.editor-scroll-wrapper {
    flex: 1 1 auto;
    min-height: 0;
    max-height: 100%;
    height: calc(100vh - 200px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.editor-content {
    position: relative;
    height: 100%;
    max-height: 100%;
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
}

.editor-content::-webkit-scrollbar {
    width: 8px;
}

.editor-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.editor-content::-webkit-scrollbar-track {
    background: #f1f5f9;
}

:deep(.search-highlight) {
    background-color: yellow;
    border-radius: 2px;
}

:deep(.ProseMirror) {
    min-height: 280px;
    padding: 0.5rem;
    outline: none;
    font-size: calc(var(--font-size-p) * 1px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.5em);
    font-family: var(--font-family);
}

:deep(.ProseMirror img) {
    width: 100%;
    margin: calc(var(--paragraph-spacing) * 0.5em) 0;
}

:deep(.ProseMirror h1) {
    font-size: calc(var(--font-size-p) * 2.2px);
    margin-bottom: calc(var(--paragraph-spacing) * 1em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.ProseMirror h2) {
    font-size: calc(var(--font-size-p) * 1.8px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.4em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.ProseMirror h3) {
    font-size: calc(var(--font-size-p) * 1.5px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.8em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.ProseMirror p) {
    margin-bottom: calc(var(--paragraph-spacing) * 0.5em);
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
}

.menu-item {
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    margin: 0 0.25rem;
    cursor: pointer;
}

.menu-item:hover {
    background-color: #f8f9fa;
}

.menu-item.is-active {
    background-color: #e9ecef;
    font-weight: bold;
}

:deep(.editor-content table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
}

:deep(.editor-content th) {
    background-color: #f1f5f9;
    font-weight: 600;
    text-align: left;
    border: 1px solid #d1d5db;
    padding: 0.5rem;
}

:deep(.editor-content td) {
    border: 1px solid #d1d5db;
    padding: 0.5rem;
}

:deep(.editor-content tr:nth-child(even)) {
    background-color: #f9fafb;
}

:deep(.editor-content ul) {
    list-style-type: disc !important;
    padding-left: 2.5rem;
    margin: 0.5rem 0;
}

:deep(.editor-content ul li) {
    display: list-item !important;
    margin-bottom: 0.25rem;
    list-style-type: disc !important;
}

:deep(.editor-content ol) {
    list-style-type: decimal;
    padding-left: 2.5rem;
    margin: 0.5rem 0;
}

:deep(.editor-content ol li) {
    display: list-item;
    margin-bottom: 0.25rem;
}

:deep(.editor-content a) {
    color: #3b82f6;
    text-decoration: underline;
    cursor: pointer;
}

:deep(.editor-content a:hover) {
    color: #2563eb;
}

:deep(.editor-content blockquote) {
    border-left: 4px solid #d1d5db;
    padding-left: 1rem;
    margin: 0.5rem 0;
    color: #6b7280;
}

:deep(.comment-mark) {
    background-color: rgba(255, 255, 0, 0.3);
    border-bottom: 2px solid #FFD700;
    cursor: pointer;
    position: relative;
    display: inline;
    padding: 2px 0;
}

:deep(.comment-mark:hover) {
    background-color: rgba(255, 255, 0, 0.5);
}

:deep(.text-mark) {
    background-color: #FFE082;
    border-radius: 0.15rem;
    padding: 0.05rem 0.15rem;
    cursor: pointer;
}
</style>