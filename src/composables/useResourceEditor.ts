import { ref, type ComputedRef, type Ref } from 'vue';
import { useListEditor } from './useListEditor';
import type { ResourceDisplayMode } from '../types/ResourceDisplayMode';

type ResourceEditType = 'content' | 'translatedContent' | 'summary' | 'overview';

interface EditableResource {
    content?: string | null;
    translatedContent?: string | null;
    summary?: string | null;
    keyPoints?: string[] | null;
    keywords?: string[] | null;
    [key: string]: unknown;
}

interface ResourceEditorNotification {
    success(message: string): unknown;
    error(message: string): unknown;
}

interface UseResourceEditorOptions {
    resourceId: Ref<string>;
    resource: Ref<EditableResource>;
    isPendingConfirmation: ComputedRef<boolean>;
    updateResource(id: string, data: Record<string, unknown>): Promise<unknown>;
    notification: ResourceEditorNotification;
}

export function useResourceEditor({
    resourceId,
    resource,
    isPendingConfirmation,
    updateResource,
    notification,
}: UseResourceEditorOptions) {
    const isEditMode = ref(false);
    const editContent = ref('');
    const editType = ref<ResourceEditType>('content');
    const isSaving = ref(false);
    const savedSuccessfully = ref(false);
    const editSummary = ref('');
    const keyPointsEditor = useListEditor();
    const keywordsEditor = useListEditor();
    const editKeyPoints = keyPointsEditor.items;
    const editKeywords = keywordsEditor.items;

    const startEdit = (displayMode: ResourceDisplayMode) => {
        if (displayMode === 'extracted' && resource.value.content) {
            editType.value = 'content';
            editContent.value = resource.value.content;
        } else if (displayMode === 'translated' && resource.value.translatedContent) {
            editType.value = 'translatedContent';
            editContent.value = resource.value.translatedContent;
        } else if (displayMode === 'overview') {
            editType.value = 'overview';
            editSummary.value = resource.value.summary || '';
            keyPointsEditor.setItems(resource.value.keyPoints || []);
            keywordsEditor.setItems(resource.value.keywords || []);
        }

        isEditMode.value = true;
        savedSuccessfully.value = false;
    };

    const handleEditContentChange = (content: string) => {
        if (isPendingConfirmation.value) {
            resource.value.content = content;
        } else {
            editContent.value = content;
        }
    };

    const saveEdit = async () => {
        isSaving.value = true;
        savedSuccessfully.value = false;

        try {
            const updateData: Record<string, unknown> = {};

            if (editType.value === 'overview') {
                const filteredKeyPoints = editKeyPoints.value.filter((item) => item.trim().length > 0);
                const filteredKeywords = editKeywords.value.filter((item) => item.trim().length > 0);

                updateData.summary = editSummary.value;
                updateData.keyPoints = filteredKeyPoints;
                updateData.keywords = filteredKeywords;

                await updateResource(resourceId.value, updateData);

                resource.value.summary = editSummary.value;
                resource.value.keyPoints = filteredKeyPoints;
                resource.value.keywords = filteredKeywords;
            } else {
                const contentToSave = isPendingConfirmation.value
                    ? resource.value.content
                    : editContent.value;

                if (!contentToSave || !contentToSave.trim()) {
                    notification.error('Content cannot be empty');
                    return;
                }

                updateData[editType.value] = contentToSave;
                await updateResource(resourceId.value, updateData);
                resource.value[editType.value] = contentToSave;
            }

            savedSuccessfully.value = true;

            if (!isPendingConfirmation.value) {
                isEditMode.value = false;
            }

            notification.success('Content updated successfully');
            setTimeout(() => {
                savedSuccessfully.value = false;
            }, 3000);
        } catch {
            notification.error('Failed to save content');
        } finally {
            isSaving.value = false;
        }
    };

    const cancelEdit = () => {
        isEditMode.value = false;
        editContent.value = '';
        editSummary.value = '';
        keyPointsEditor.setItems([]);
        keywordsEditor.setItems([]);
        savedSuccessfully.value = false;
    };

    return {
        isEditMode,
        editContent,
        editType,
        isSaving,
        savedSuccessfully,
        editSummary,
        editKeyPoints,
        editKeywords,
        startEdit,
        handleEditContentChange,
        saveEdit,
        cancelEdit,
        addKeyPoint: keyPointsEditor.addItem,
        removeKeyPoint: keyPointsEditor.removeItem,
        moveKeyPointUp: keyPointsEditor.moveUp,
        moveKeyPointDown: keyPointsEditor.moveDown,
        addKeyword: keywordsEditor.addItem,
        removeKeyword: keywordsEditor.removeItem,
    };
}
