import { computed, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResourceEditor } from '../../src/composables/useResourceEditor';

const updateResource = vi.fn();
const notification = {
    success: vi.fn(),
    error: vi.fn(),
};

const createEditor = (initialResource: Record<string, unknown>) => {
    const resource = ref(initialResource);
    const editor = useResourceEditor({
        resourceId: ref('42'),
        resource,
        isPendingConfirmation: computed(() => resource.value.status === 'extracted'),
        updateResource,
        notification,
    });

    return { editor, resource };
};

describe('useResourceEditor', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        updateResource.mockReset().mockResolvedValue({});
        notification.success.mockReset();
        notification.error.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('saves an extracted-content draft and closes the edit session', async () => {
        const { editor, resource } = createEditor({ status: 'ready', content: '<p>Original</p>' });

        editor.startEdit('extracted');
        editor.handleEditContentChange('<p>Updated</p>');
        await editor.saveEdit();

        expect(updateResource).toHaveBeenCalledWith('42', { content: '<p>Updated</p>' });
        expect(resource.value.content).toBe('<p>Updated</p>');
        expect(editor.isEditMode.value).toBe(false);
        expect(editor.savedSuccessfully.value).toBe(true);
        expect(notification.success).toHaveBeenCalledWith('Content updated successfully');

        vi.advanceTimersByTime(3000);
        expect(editor.savedSuccessfully.value).toBe(false);
    });

    it('edits pending-confirmation content in place and keeps editing after save', async () => {
        const { editor, resource } = createEditor({ status: 'extracted', content: '<p>Original</p>' });

        editor.startEdit('extracted');
        editor.handleEditContentChange('<p>Reviewed</p>');
        await editor.saveEdit();

        expect(resource.value.content).toBe('<p>Reviewed</p>');
        expect(updateResource).toHaveBeenCalledWith('42', { content: '<p>Reviewed</p>' });
        expect(editor.isEditMode.value).toBe(true);
    });

    it('normalizes overview lists and synchronizes the saved resource', async () => {
        const { editor, resource } = createEditor({
            status: 'ready',
            summary: 'Original summary',
            keyPoints: ['First'],
            keywords: ['source'],
        });

        editor.startEdit('overview');
        editor.editSummary.value = 'Updated summary';
        editor.editKeyPoints.value = ['First', ' ', 'Second'];
        editor.editKeywords.value = ['', 'updated'];
        await editor.saveEdit();

        expect(updateResource).toHaveBeenCalledWith('42', {
            summary: 'Updated summary',
            keyPoints: ['First', 'Second'],
            keywords: ['updated'],
        });
        expect(resource.value).toMatchObject({
            summary: 'Updated summary',
            keyPoints: ['First', 'Second'],
            keywords: ['updated'],
        });
    });

    it('rejects empty content without persisting it', async () => {
        const { editor, resource } = createEditor({ status: 'ready', content: '<p>Original</p>' });

        editor.startEdit('extracted');
        editor.handleEditContentChange('   ');
        await editor.saveEdit();

        expect(updateResource).not.toHaveBeenCalled();
        expect(resource.value.content).toBe('<p>Original</p>');
        expect(editor.isSaving.value).toBe(false);
        expect(notification.error).toHaveBeenCalledWith('Content cannot be empty');
    });

    it('does not change local content when persistence fails', async () => {
        updateResource.mockRejectedValue(new Error('failed'));
        const { editor, resource } = createEditor({ status: 'ready', content: '<p>Original</p>' });

        editor.startEdit('extracted');
        editor.handleEditContentChange('<p>Updated</p>');
        await editor.saveEdit();

        expect(resource.value.content).toBe('<p>Original</p>');
        expect(editor.isEditMode.value).toBe(true);
        expect(notification.error).toHaveBeenCalledWith('Failed to save content');
    });
});
