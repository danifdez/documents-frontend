import { computed, ComputedRef } from 'vue';

interface ResourceIconResult {
    isDocumentFile: ComputedRef<boolean>;
    isPdfFile: ComputedRef<boolean>;
    isHtmlFile: ComputedRef<boolean>;
    isTextFile: ComputedRef<boolean>;
    resourceIconType: ComputedRef<string>;
}

export function useResourceIcon(resource: any): ResourceIconResult {
    const isDocumentFile = computed(() => {
        if (!resource?.value.mimeType) return false;
        const docMimeTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        return docMimeTypes.includes(resource.value.mimeType);
    });

    const isPdfFile = computed(() => {
        if (!resource?.value.mimeType) return false;
        return resource.value.mimeType === 'application/pdf';
    });

    const isHtmlFile = computed(() => {
        if (!resource?.value.mimeType) return false;
        return resource.value.mimeType === 'text/html';
    });

    const isTextFile = computed(() => {
        if (!resource?.value.mimeType) return false;
        const textMimeTypes = [
            'text/plain',
            'text/markdown'
        ];
        return textMimeTypes.includes(resource.value.mimeType);
    });

    const resourceIconType = computed(() => {
        if (isPdfFile.value) return 'pdf';
        if (isDocumentFile.value) return 'document';
        if (isHtmlFile.value) return 'html';
        if (isTextFile.value) return 'text';
        return 'generic';
    });

    return {
        isDocumentFile,
        isPdfFile,
        isHtmlFile,
        isTextFile,
        resourceIconType
    };
}

export function getResourceIconType(resource: any): string {
    if (!resource) {
        return 'generic';
    }

    if (resource.mimeType === 'application/pdf') {
        return 'pdf';
    }

    const docMimeTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (docMimeTypes.includes(resource.mimeType)) {
        return 'document';
    }

    if (resource.mimeType === 'text/html') {
        return 'html';
    }

    const textMimeTypes = [
        'text/plain',
        'text/markdown'
    ];
    if (textMimeTypes.includes(resource.mimeType)) {
        return 'text';
    }

    return 'generic';
}