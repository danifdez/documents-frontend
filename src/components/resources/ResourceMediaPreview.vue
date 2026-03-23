<template>
    <div class="h-full">
        <iframe v-if="isHtml" class="w-full h-full border-0"
            :srcdoc="content" sandbox="allow-same-origin" title="HTML Preview" />
        <iframe v-else-if="isPdf" class="w-full h-full border-0"
            :src="`${baseUrl}/resources/${resourceId}/view#toolbar=0&navpanes=0&scrollbar=0&sidebar=0`"
            type="application/pdf" :title="originalName || 'PDF Preview'" />
        <img v-else-if="isImage" class="w-full object-contain max-h-full"
            :src="`${baseUrl}/resources/${resourceId}/view`"
            :alt="originalName || 'Image Preview'" />
        <video v-else-if="isVideo" class="w-full max-h-full"
            controls :src="`${baseUrl}/resources/${resourceId}/view`" />
        <audio v-else-if="isAudio" class="w-full mt-4"
            controls :src="`${baseUrl}/resources/${resourceId}/view`" />
        <div v-else class="flex items-center justify-center h-full text-text-muted text-sm">
            Preview not available for this file type
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    resourceId: string | number;
    mimeType?: string | null;
    originalName?: string | null;
    content?: string | null;
    baseUrl: string;
    isHtml: boolean;
    isPdf: boolean;
    isImage: boolean;
    isVideo: boolean;
    isAudio: boolean;
}>();
</script>
