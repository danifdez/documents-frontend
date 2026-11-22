import type { DocumentRecord } from '../services/documents/useDocument';
import type { Ref } from 'vue';
import { useDragDrop } from './useDragDrop';
import { useNotification } from './useNotification';
import { useResource, type Resource } from '../services/resources/useResource';

interface ResourceSplitDropOptions {
    resourceId: Ref<string>;
    splitDocument: Ref<DocumentRecord | null>;
    splitResource: Ref<Resource | null>;
    splitViewActive: Ref<boolean>;
    loadDocument: (id: string) => Promise<DocumentRecord>;
}

// Drop handling for opening a dragged document or resource in the split view
export function useResourceSplitDrop({
    resourceId,
    splitDocument,
    splitResource,
    splitViewActive,
    loadDocument,
}: ResourceSplitDropOptions) {
    const notification = useNotification();
    const {
        isDragOver,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop
    } = useDragDrop();

    async function openDocument(id: string) {
        try {
            const document = await loadDocument(id);
            splitResource.value = null;
            splitDocument.value = document;
            splitViewActive.value = true;
        } catch {
            notification.error('Failed to load document');
        }
    }

    async function openResource(id: string) {
        try {
            const { loadResource } = useResource();
            const resource = await loadResource(id);
            splitDocument.value = null;
            splitResource.value = resource;
            splitViewActive.value = true;
        } catch {
            notification.error('Failed to load resource');
        }
    }

    const onDrop = async (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const droppedData = handleDrop(event);
        if (droppedData?.type === 'document') {
            if (droppedData.document?.id) await openDocument(droppedData.document.id);
            return;
        }
        if (droppedData?.type === 'resource') {
            const resource = droppedData.resource as { id?: string | number } | undefined;
            if (resource?.id && String(resource.id) !== resourceId.value) await openResource(String(resource.id));
            return;
        }
        const transfer = event.dataTransfer;
        if (!transfer || transfer.files?.length > 0) return;
        const url = transfer.getData('text/uri-list') || transfer.getData('text/plain');
        if (url) notification.info(`Link dropped: ${url}`);
    };

    const onDragOver = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        handleDragOver(event);
    };

    const onDragEnter = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        handleDragEnter(event);
    };

    const onDragLeave = (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        handleDragLeave(event);
    };

    return {
        isDragOver,
        onDrop,
        onDragOver,
        onDragEnter,
        onDragLeave,
    };
}
