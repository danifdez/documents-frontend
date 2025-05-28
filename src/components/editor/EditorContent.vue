<template>
    <div class="editor-container">
        <EditorToolbar :editor="editor" :is-saving="isSaving" :saved-successfully="savedSuccessfully"
            :show-comments="showComments" @toggle-comments="toggleComments" @add-comment="handleAddCommentRequest" />
        <div
            class="flex-1 p-2.5 border border-gray-300 rounded overflow-auto bg-white min-h-[300px] outline-none font-sans leading-relaxed editor-content">
            <template v-if="editor">
                <editor-content :editor="editor" />
            </template>
        </div>
        <CommentModal :is-visible="showCommentModal" :selected-text="selectedCommentText" :is-loading="isCommentLoading"
            @save="saveComment" @cancel="cancelComment" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
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
import EditorToolbar from './EditorToolbar.vue';
import CommentModal from '../comments/CommentModal.vue';
import { useRoute } from 'vue-router';
import { useCommentCreate } from '../../services/comments/useCommentCreate';

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
    }
});

const emit = defineEmits([
    'content-change',
    'toggle-comments',
    'highlight-comment'
]);

const editor = ref(null);
const isMounted = ref(false);
const showComments = ref(false);
const route = useRoute();
const { createComment, isLoading: isCommentLoading } = useCommentCreate();
const showCommentModal = ref(false);
const selectedCommentText = ref('');
const currentSelection = ref(null);

const toggleComments = () => {
    showComments.value = !showComments.value;
    emit('toggle-comments', showComments.value);
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

onMounted(() => {
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
        ],
        content: props.content || '<p></p>',
        autofocus: true,
        editable: true,
        onUpdate: ({ editor }) => {
            emit('content-change', editor.getHTML());
        },
    });
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

defineExpose({
    editor,
    setLink,
});
</script>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.editor-content {
    position: relative;
}

:deep(.ProseMirror) {
    min-height: 280px;
    padding: 0.5rem;
    outline: none;
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
</style>