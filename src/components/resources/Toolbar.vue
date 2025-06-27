<template>
    <div class="mb-3 flex justify-between">
        <div class="flex gap-2">
            <button @click="emit('ask')"
                class="inline-flex items-center px-4 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 mr-1"
                title="Ask Assistant">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 10h.01M12 14h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" />
                </svg>
                Ask
            </button>
            <a @click="emit('download')"
                class="inline-flex items-center px-4 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </a>
            <button @click="emit('createDocument')"
                class="inline-flex items-center px-4 py-1 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                title="Create new document from this resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
            </button>
            <button v-if="!isEditMode && actualDisplayMode !== 'raw'" @click="emit('startEdit')" type="button"
                class="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </button>
        </div>
        <div class="flex items-center gap-2">
            <div v-if="!isEditMode" class="flex rounded-md shadow-sm" role="group">
                <button v-if="hasExtractedContent" @click="changeDisplayMode('extracted')" type="button"
                    class="px-4 py-1 text-sm font-medium rounded-l-lg"
                    :class="actualDisplayMode === 'extracted' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                    Extracted Content
                </button>
                <button v-if="hasTranslatedContent" @click="changeDisplayMode('translated')" type="button"
                    class="px-4 py-1 text-sm font-medium"
                    :class="actualDisplayMode === 'translated' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                    Translated
                </button>
                <button @click="changeDisplayMode('raw')" type="button"
                    class="px-4 py-1 text-sm font-medium rounded-r-lg"
                    :class="actualDisplayMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                    Original
                </button>
            </div>
            <div v-if="isEditMode" class="flex gap-2">
                <button @click="emit('saveEdit')" :disabled="isSaving" type="button"
                    class="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    <svg v-if="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    {{ isSaving ? 'Saving...' : 'Save' }}
                </button>
                <button @click="emit('cancelEdit')" :disabled="isSaving" type="button"
                    class="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">
                    Cancel
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue';
const props = defineProps({
    isEditMode: { type: Boolean },
    isSaving: { type: Boolean },
    displayMode: { type: String, values: ['extracted', 'translated', 'raw'] },
    hasExtractedContent: { type: Boolean },
    hasTranslatedContent: { type: Boolean },
});

const actualDisplayMode = ref(props.displayMode || 'extracted');

const emit = defineEmits(['download', 'startEdit', 'saveEdit', 'cancelEdit', 'changeDisplayMode', 'createDocument', 'ask']);

const changeDisplayMode = (mode: string) => {
    emit('changeDisplayMode', mode);
    actualDisplayMode.value = mode;
};
</script>