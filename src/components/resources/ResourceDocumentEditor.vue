<template>
    <div :class="variant === 'workspace'
        ? 'flex flex-col h-full w-full min-w-0'
        : 'lg:col-span-1 flex flex-col overflow-hidden min-h-0'">
        <template v-if="variant === 'workspace'">
            <div class="flex justify-between items-center mb-4">
                <div
                    class="text-xl font-semibold bg-transparent border-none outline-none focus:bg-surface-hover focus:px-2 focus:py-1 rounded w-full text-text-primary">
                    Workspace
                </div>
                <div class="flex gap-2 ml-2">
                    <Button @click="emit('open-split')" size="small" title="Open in split view">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 7h12M8 12h12m-7 5h7M3 7h.01M3 12h.01M3 17h.01" />
                        </svg>
                    </Button>
                </div>
            </div>
            <div v-if="isSaving" class="flex items-center text-sm text-text-muted mb-2">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-text-muted"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                        stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                </svg>
                Saving...
            </div>
            <div v-else-if="savedSuccessfully" class="flex items-center text-sm text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M5 13l4 4L19 7" />
                </svg>
                Saved
            </div>
            <div class="flex-1 overflow-y-auto min-w-0 w-full overflow-x-hidden">
                <EditorContent ref="editor" :content="documentModel.content || ''" :is-saving="isSaving"
                    :saved-successfully="savedSuccessfully" context="workspace"
                    @content-change="handleContentChange" />
            </div>
        </template>

        <template v-else>
            <div class="bg-surface-elevated rounded-2xl border border-border p-4 flex-shrink-0">
                <div class="flex items-center justify-between mb-3">
                    <input v-model="documentModel.name" @input="handleNameChange" type="text"
                        class="flex-1 px-3 py-1.5 bg-transparent border-0 border-b border-border text-base font-semibold text-text-primary focus:outline-none focus:border-accent transition-colors tracking-tight"
                        placeholder="Document name..." />
                    <button @click="emit('close')"
                        class="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="flex justify-between items-center">
                    <div v-if="isSaving" class="flex items-center gap-1.5 text-xs text-text-muted">
                        <div class="animate-spin rounded-full h-3 w-3 border-2 border-accent border-t-transparent"></div>
                        Saving...
                    </div>
                    <div v-else-if="savedSuccessfully" class="flex items-center gap-1 text-xs text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                    </div>
                </div>
            </div>

            <div class="overflow-y-auto flex-1 min-h-0 mt-3 bg-surface-elevated rounded-2xl border border-border p-4">
                <EditorContent ref="editor" :content="documentModel.content || ''" :is-saving="isSaving"
                    :saved-successfully="savedSuccessfully" @content-change="handleContentChange" />
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAutoSave } from '../../composables/useAutoSave';
import { useNotification } from '../../composables/useNotification';
import { useDocument } from '../../services/documents/useDocument';
import EditorContent from '../editor/EditorContent.vue';
import Button from '../ui/Button.vue';

interface EditableDocument {
    id: string | number;
    name: string;
    content?: string | null;
    [key: string]: unknown;
}

const props = defineProps<{
    variant: 'workspace' | 'split';
}>();

const emit = defineEmits<{
    close: [];
    'open-split': [];
}>();

const documentModel = defineModel<EditableDocument>({ required: true });
const { saveDocument } = useDocument();
const notification = useNotification();
interface EditorSearchApi {
    search: (text: string) => number;
    scrollTo: (index: number) => void;
    clearHighlights: () => void;
}

const editor = ref<EditorSearchApi | null>(null);
const isSaving = ref(false);
const savedSuccessfully = ref(false);
let pendingContent = documentModel.value.content || '';
let pendingName = documentModel.value.name;

const persist = async (
    data: Record<string, unknown>,
    failureMessage: string,
    updateLocalDocument = true,
) => {
    try {
        await saveDocument(String(documentModel.value.id), data);
        if (updateLocalDocument) {
            Object.assign(documentModel.value, data);
        }
        savedSuccessfully.value = true;

        setTimeout(() => {
            savedSuccessfully.value = false;
        }, 3000);
    } catch {
        notification.error(failureMessage);
    } finally {
        isSaving.value = false;
    }
};

const contentAutoSave = useAutoSave(
    () => persist(
        { content: pendingContent },
        props.variant === 'workspace'
            ? 'Failed to save workspace content'
            : 'Failed to save document content',
    ),
    1000,
);

const nameAutoSave = useAutoSave(
    () => persist({ name: pendingName }, 'Failed to save document name', false),
    1000,
);

const markPending = () => {
    isSaving.value = true;
    savedSuccessfully.value = false;
};

const handleContentChange = (content: string) => {
    if (!documentModel.value.id) return;

    pendingContent = content;
    markPending();
    contentAutoSave.trigger();
};

const handleNameChange = () => {
    if (!documentModel.value.id) return;

    const name = documentModel.value.name.trim();
    if (!name) return;

    pendingName = name;
    markPending();
    nameAutoSave.trigger();
};

defineExpose({
    search: (text: string) => editor.value?.search(text) ?? 0,
    scrollTo: (index: number) => editor.value?.scrollTo(index),
    clearHighlights: () => editor.value?.clearHighlights(),
});
</script>
