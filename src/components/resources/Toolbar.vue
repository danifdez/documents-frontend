<template>
    <div class="mb-3 flex justify-between">
        <div class="mb-2.5 flex gap-2">
            <Button v-if="!hasSummary" @click="emit('ask')" size="small" title="Ask Assistant">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 10h.01M12 14h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                </svg>
            </Button>
            <Button @click="emit('summarize')" size="small" title="Summarize Resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
            </Button>
            <Button @click="emit('translate')" size="small" title="Translate Resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </Button>
            <Button @click="emit('download')" size="small" title="Download Resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </Button>
            <Button @click="emit('createDocument')" size="small" title="Create new document from this resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
            </Button>
            <Button v-if="!isEditMode && actualDisplayMode !== 'raw'" size="small" @click="emit('startEdit')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </Button>
        </div>
        <div class="mb-2.5 flex items-center gap-2">
            <ButtonGroup v-if="!isEditMode">
                <Button v-if="hasExtractedContent" size="small" variant="secondary"
                    :active="actualDisplayMode === 'extracted'" @click="changeDisplayMode('extracted')" type="button">
                    Content
                </Button>
                <Button v-if="hasTranslatedContent" size="small" variant="secondary"
                    :active="actualDisplayMode === 'translated'" @click="changeDisplayMode('translated')" type="button">
                    Translated
                </Button>
                <Button v-if="hasSummary" size="small" variant="secondary" :active="actualDisplayMode === 'summary'"
                    @click="changeDisplayMode('summary')" type="button">
                    Summary
                </Button>
                <Button size="small" variant="secondary" :active="actualDisplayMode === 'raw'"
                    @click="changeDisplayMode('raw')">
                    Original
                </Button>
            </ButtonGroup>
            <div v-if="isEditMode" class="flex gap-2">
                <Button @click="emit('saveEdit')" size="small" :disabled="isSaving">
                    <svg v-if="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    {{ isSaving ? 'Saving...' : 'Save' }}
                </Button>
                <Button @click="emit('cancelEdit')" size="small" :disabled="isSaving">
                    Cancel
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue';
import Button from '../ui/Button.vue';
import ButtonGroup from '../ui/ButtonGroup.vue';
const props = defineProps({
    isEditMode: { type: Boolean },
    isSaving: { type: Boolean },
    displayMode: { type: String, values: ['extracted', 'translated', 'raw'] },
    hasExtractedContent: { type: Boolean },
    hasTranslatedContent: { type: Boolean },
    hasSummary: { type: Boolean, default: false },
});

const actualDisplayMode = ref(props.displayMode || 'extracted');

const emit = defineEmits(['download', 'startEdit', 'saveEdit', 'cancelEdit', 'changeDisplayMode', 'createDocument', 'ask', 'summarize', 'translate']);

const changeDisplayMode = (mode: string) => {
    emit('changeDisplayMode', mode);
    actualDisplayMode.value = mode;
};
</script>