import { describe, it, expect } from 'vitest';
import { useResourceIcon, getResourceIconType } from '@/composables/useResourceIcon';
import { ref } from 'vue';

describe('useResourceIcon', () => {
    it('detects PDF files correctly', () => {
        const resource = ref({
            mimeType: 'application/pdf'
        });

        const { isPdfFile, resourceIconType } = useResourceIcon(resource);

        expect(isPdfFile.value).toBe(true);
        expect(resourceIconType.value).toBe('pdf');
    });

    it('detects document files correctly', () => {
        const resource = ref({
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        const { isDocumentFile, resourceIconType } = useResourceIcon(resource);

        expect(isDocumentFile.value).toBe(true);
        expect(resourceIconType.value).toBe('document');
    });

    it('detects HTML files correctly', () => {
        const resource = ref({
            mimeType: 'text/html'
        });

        const { isHtmlFile, resourceIconType } = useResourceIcon(resource);

        expect(isHtmlFile.value).toBe(true);
        expect(resourceIconType.value).toBe('html');
    });

    it('detects text files correctly', () => {
        const resource = ref({
            mimeType: 'text/plain'
        });

        const { isTextFile, resourceIconType } = useResourceIcon(resource);

        expect(isTextFile.value).toBe(true);
        expect(resourceIconType.value).toBe('text');
    });

    it('returns generic for unknown file types', () => {
        const resource = ref({
            value: {
                mimeType: 'application/unknown'
            }
        });

        const { resourceIconType } = useResourceIcon(resource);

        expect(resourceIconType.value).toBe('generic');
    });
});

describe('getResourceIconType', () => {
    it('detects PDF files correctly', () => {
        const resource = { mimeType: 'application/pdf' };
        expect(getResourceIconType(resource)).toBe('pdf');
    });

    it('detects document files correctly', () => {
        const resource = { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        expect(getResourceIconType(resource)).toBe('document');
    });

    it('detects HTML files correctly', () => {
        const resource = { mimeType: 'text/html' };
        expect(getResourceIconType(resource)).toBe('html');
    });

    it('detects text files correctly', () => {
        const resource = { mimeType: 'text/plain' };
        expect(getResourceIconType(resource)).toBe('text');
    });

    it('returns generic for unknown file types', () => {
        const resource = { mimeType: 'application/unknown' };
        expect(getResourceIconType(resource)).toBe('generic');
    });

    it('returns generic for null or undefined resource', () => {
        expect(getResourceIconType(null)).toBe('generic');
        expect(getResourceIconType(undefined)).toBe('generic');
    });
});
