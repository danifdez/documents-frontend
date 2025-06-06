import { computed, ComputedRef, Ref, unref } from 'vue';

interface ResourceIconResult {
    isDocumentFile: ComputedRef<boolean>;
    isPdfFile: ComputedRef<boolean>;
    isHtmlFile: ComputedRef<boolean>;
    isTextFile: ComputedRef<boolean>;
}

export function useResourceIcon(mimeType?: string | Ref<string> | ComputedRef<string>): ResourceIconResult {
    const isDocumentFile = computed(() => {
        const mime = unref(mimeType);
        if (!mime) return false;
        const docMimeTypes = [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        return docMimeTypes.includes(mime);
    });

    const isPdfFile = computed(() => {
        const mime = unref(mimeType);
        if (!mime) return false;
        return mime === 'application/pdf';
    });

    const isHtmlFile = computed(() => {
        const mime = unref(mimeType);
        if (!mime) return false;
        return mime === 'text/html';
    });

    const isTextFile = computed(() => {
        const mime = unref(mimeType);
        if (!mime) return false;
        const textMimeTypes = [
            'text/plain',
            'text/markdown'
        ];
        return textMimeTypes.includes(mime);
    });

    return {
        isDocumentFile,
        isPdfFile,
        isHtmlFile,
        isTextFile,
    };
}