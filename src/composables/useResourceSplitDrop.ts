import type { Ref } from 'vue';
import { useDragDrop } from './useDragDrop';
import { useNotification } from './useNotification';
import { useResource } from '../services/resources/useResource';

interface ResourceSplitDropOptions {
    resourceId: Ref<string>;
    splitDocument: Ref<Record<string, any> | null>;
    splitResource: Ref<Record<string, any> | null>;
    splitViewActive: Ref<boolean>;
    loadDocument: (id: string) => Promise<object>;
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

    const onDrop = async (event: DragEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const droppedData = handleDrop(event);

        if (droppedData && droppedData.type === 'document') {
            try {
                const document = droppedData.document;
                if (document && document.id) {
                    const fullDocument = await loadDocument(document.id);
                    splitResource.value = null;
                    splitDocument.value = fullDocument;
                    splitViewActive.value = true;
                }
            } catch (error) {
                notification.error('Failed to load document');
            }
        } else if (droppedData && droppedData.type === 'resource') {
            try {
                // DragData only types `document`; other payloads come through its index signature
                const droppedResource = droppedData.resource as Record<string, any> | undefined;
                if (droppedResource && droppedResource.id && String(droppedResource.id) !== String(resourceId.value)) {
                    const { loadResource: loadSplitResource } = useResource();
                    const fullResource = await loadSplitResource(String(droppedResource.id));
                    splitDocument.value = null;
                    splitResource.value = fullResource;
                    splitViewActive.value = true;
                }
            } catch (error) {
                notification.error('Failed to load resource');
            }
        } else {
            const dataTransfer = event.dataTransfer;
            const files = dataTransfer?.files;

            if (files && files.length > 0) {
                // OS file drops are intentionally ignored; the branch exists so they
                // don't fall through to the link-dropped notification below
            } else {
                const url = dataTransfer?.getData('text/uri-list') || dataTransfer?.getData('text/plain');
                if (url) {
                    notification.info(`Link dropped: ${url}`);
                }
            }
        }
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
