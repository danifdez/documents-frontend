<template>
    <div class="knowledge-editor flex flex-col h-full">
        <EditorToolbar :editor="editor" :is-saving="isSaving" :saved-successfully="savedSuccessfully" context="knowledge"
            @add-citation="showCitationModal = true" />
        <div class="flex-1 min-h-0 overflow-hidden">
            <div class="p-4 border border-border rounded-lg overflow-y-auto bg-surface-elevated min-h-[300px] h-full outline-none font-sans leading-relaxed"
                spellcheck="false">
                <template v-if="editor">
                    <editor-content :editor="editor" />
                    <BibliographyList :editor="editor" :entries="bibliographyEntries" citation-format="apa" />
                </template>
            </div>
        </div>
        <CitationModal v-model="showCitationModal" :entries="bibliographyEntries" citation-format="apa"
            :existing-entry-ids="citedEntryIds" @select="handleCitationSelect" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { MathExtension } from '../editor/extensions/MathExtension';
import { VideoExtension } from '../editor/extensions/VideoExtension';
import { CitationNode } from '../editor/extensions/CitationExtension';
import EditorToolbar from '../editor/EditorToolbar.vue';
import CitationModal from '../bibliography/CitationModal.vue';
import BibliographyList from '../bibliography/BibliographyList.vue';
import { useBibliography } from '../../services/bibliography/useBibliography';
import type { BibliographyEntry } from '../../types/Bibliography';
import 'katex/dist/katex.min.css';

const props = defineProps<{
    modelValue: string | null;
}>();

const emit = defineEmits(['update:modelValue']);

const editor = ref<any>(null);
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const showCitationModal = ref(false);
const { entries: bibliographyEntries, loadGlobal } = useBibliography();

const citedEntryIds = computed<number[]>(() => {
    if (!editor.value) return [];
    const ids: number[] = [];
    const seen = new Set<number>();
    editor.value.state.doc.descendants((node: Record<string, any>) => {
        if (node.type.name === 'citationNode') {
            const id = node.attrs['data-entry-id'];
            if (id != null && !seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
        }
    });
    return ids;
});

const handleCitationSelect = (entry: BibliographyEntry, label: string) => {
    if (!editor.value) return;
    editor.value
        .chain()
        .focus()
        .insertCitation({
            entryId: entry.id,
            citeKey: entry.citeKey ?? String(entry.id),
            label,
        })
        .run();
};

onMounted(() => {
    editor.value = new Editor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                blockquote: {
                    HTMLAttributes: {
                        class: 'border-l-4 border-border pl-4 my-2 text-text-muted',
                    },
                },
                codeBlock: {
                    HTMLAttributes: { class: 'code-block' },
                },
                code: {
                    HTMLAttributes: { class: 'inline-code' },
                },
                link: false,
                underline: false,
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: { class: 'border-collapse w-full my-2' },
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: { class: 'bg-surface-hover font-semibold' },
            }),
            TableCell.configure({
                HTMLAttributes: { class: 'border border-border p-2' },
            }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                HTMLAttributes: {
                    class: 'text-blue-500 underline cursor-pointer',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            Placeholder.configure({ placeholder: 'Escribe aquí...' }),
            MathExtension,
            VideoExtension,
            CitationNode,
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
        ],
        content: props.modelValue || '',
        autofocus: false,
        editable: true,
        onUpdate: ({ editor }) => {
            emit('update:modelValue', editor.getHTML());
        },
    });

    loadGlobal();
});

onBeforeUnmount(() => {
    editor.value?.destroy();
});

watch(() => props.modelValue, (val) => {
    if (editor.value && val !== editor.value.getHTML()) {
        editor.value.commands.setContent(val || '');
    }
});
</script>

<style scoped>
.knowledge-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
}

:deep(.ProseMirror) {
    min-height: 280px;
    padding: 0.5rem;
    outline: none;
    font-size: 15px;
}

:deep(.ProseMirror p) {
    margin-bottom: 0.5em;
}

:deep(.ProseMirror h1) {
    font-size: 1.8em;
    margin-bottom: 0.5em;
}

:deep(.ProseMirror h2) {
    font-size: 1.5em;
    margin-bottom: 0.4em;
}

:deep(.ProseMirror h3) {
    font-size: 1.25em;
    margin-bottom: 0.3em;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
    color: var(--color-text-muted);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
}
</style>
