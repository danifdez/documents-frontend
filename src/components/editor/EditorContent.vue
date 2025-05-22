<template>
    <div class="editor-container">
        <EditorToolbar :editor="editor" :is-saving="isSaving" :saved-successfully="savedSuccessfully" />
        <div
            class="flex-1 p-2.5 border border-gray-300 rounded overflow-auto bg-white min-h-[300px] outline-none font-sans leading-relaxed editor-content">
            <template v-if="editor">
                <editor-content :editor="editor" />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
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
import EditorToolbar from './EditorToolbar.vue';

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
    'content-change'
]);

const editor = ref(null);
const isMounted = ref(false);

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
</style>