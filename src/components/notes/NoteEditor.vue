<template>
    <div class="note-editor flex flex-col h-full">
        <!-- Toolbar -->
        <div v-if="editor" class="flex items-center gap-1 px-4 py-2 border-b border-border bg-surface">
            <button type="button" @click="editor.chain().focus().toggleBold().run()"
                :class="['p-1.5 rounded transition-colors cursor-pointer', editor.isActive('bold') ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover']">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                </svg>
            </button>
            <button type="button" @click="editor.chain().focus().toggleItalic().run()"
                :class="['p-1.5 rounded transition-colors cursor-pointer', editor.isActive('italic') ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover']">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 4h4m-2 0l-4 16m0 0h4" />
                </svg>
            </button>
            <button type="button" @click="editor.chain().focus().toggleUnderline().run()"
                :class="['p-1.5 rounded transition-colors cursor-pointer', editor.isActive('underline') ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover']">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
                </svg>
            </button>
            <div class="w-px h-5 bg-border mx-1"></div>
            <button type="button" @click="editor.chain().focus().toggleBulletList().run()"
                :class="['p-1.5 rounded transition-colors cursor-pointer', editor.isActive('bulletList') ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover']">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
            </button>
            <button type="button" @click="editor.chain().focus().toggleOrderedList().run()"
                :class="['p-1.5 rounded transition-colors cursor-pointer', editor.isActive('orderedList') ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover']">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 6h13M7 12h13M7 18h13M3 6v.01M3 12v.01M3 18v.01" />
                </svg>
            </button>
            <div class="w-px h-5 bg-border mx-1"></div>
            <button type="button" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
                :class="['p-1.5 rounded transition-colors cursor-pointer text-xs font-bold', editor.isActive('heading', { level: 2 }) ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover']">
                H2
            </button>
            <button type="button" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
                :class="['p-1.5 rounded transition-colors cursor-pointer text-xs font-bold', editor.isActive('heading', { level: 3 }) ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover']">
                H3
            </button>
        </div>

        <!-- Editor content -->
        <div class="flex-1 overflow-y-auto">
            <editor-content :editor="editor" class="prose prose-sm max-w-none px-6 py-4" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

const props = defineProps<{
    modelValue: string | null;
}>();

const emit = defineEmits(['update:modelValue']);

const editor = useEditor({
    content: props.modelValue || '',
    extensions: [
        StarterKit,
        Underline,
        Placeholder.configure({
            placeholder: 'Start writing...',
        }),
    ],
    onUpdate: ({ editor }) => {
        emit('update:modelValue', editor.getHTML());
    },
});

watch(() => props.modelValue, (val) => {
    if (editor.value && val !== editor.value.getHTML()) {
        editor.value.commands.setContent(val || '', false);
    }
});

onBeforeUnmount(() => {
    editor.value?.destroy();
});
</script>

<style>
.ProseMirror {
    min-height: 200px;
    outline: none;
}

.ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-text-muted);
    pointer-events: none;
    height: 0;
}
</style>
