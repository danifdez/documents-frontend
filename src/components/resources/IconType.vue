<template>
    <span v-if="mimeType" class="bg-blue-500 text-white p-1 rounded-md mr-2 flex items-center justify-center">
        <svg v-if="isPdfFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
            fill="currentColor">
            <path fill-rule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clip-rule="evenodd" />
        </svg>

        <svg v-else-if="isDocumentFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
            fill="currentColor">
            <path fill-rule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clip-rule="evenodd" />
        </svg>

        <svg v-else-if="isHtmlFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
            fill="currentColor">
            <path fill-rule="evenodd"
                d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                clip-rule="evenodd" />
        </svg>

        <svg v-else-if="isTextFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
            fill="currentColor">
            <path fill-rule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clip-rule="evenodd" />
        </svg>

        <svg v-else-if="isImageFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
            fill="currentColor">
            <path fill-rule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5zm2 2a1 1 0 110 2 1 1 0 010-2zm8 6l-2.5-3-3.5 4.5h10l-4-5.5z"
                clip-rule="evenodd" />
        </svg>

        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clip-rule="evenodd" />
        </svg>
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useResourceIcon } from './../../composables/useResourceIcon';

const props = defineProps({
    mimeType: {
        type: String,
    }
});
const { isPdfFile, isDocumentFile, isHtmlFile, isTextFile, isImageFile } = useResourceIcon(computed(() => props.mimeType));
</script>
