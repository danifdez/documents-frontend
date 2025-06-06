import { describe, it, expect } from 'vitest';
import { useResourceIcon } from '@/composables/useResourceIcon';

describe('useResourceIcon', () => {
    it('detects PDF files correctly', () => {
        const mimeType = 'application/pdf';
        const { isPdfFile } = useResourceIcon(mimeType);

        expect(isPdfFile.value).toBe(true);
    });
});

it('detects document files correctly', () => {
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const { isDocumentFile } = useResourceIcon(mimeType);

    expect(isDocumentFile.value).toBe(true);
});

it('detects HTML files correctly', () => {
    const mimeType = 'text/html';

    const { isHtmlFile } = useResourceIcon(mimeType);

    expect(isHtmlFile.value).toBe(true);
});

it('detects text files correctly', () => {
    const mimeType = 'text/plain';

    const { isTextFile } = useResourceIcon(mimeType);

    expect(isTextFile.value).toBe(true);
});

it('returns generic for unknown file types', () => {
    const mimeType = 'application/unknown';

    const { isPdfFile, isDocumentFile, isHtmlFile, isTextFile } = useResourceIcon(mimeType);

    expect(isPdfFile.value).toBe(false);
    expect(isDocumentFile.value).toBe(false);
    expect(isHtmlFile.value).toBe(false);
    expect(isTextFile.value).toBe(false);
});
