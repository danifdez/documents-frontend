import { ref } from 'vue';

interface Document {
    _id: string;
    name: string;
    content?: string;
    [key: string]: unknown;
}

interface DragData {
    type: string;
    document?: Document;
    [key: string]: unknown;
}

export function useDragDrop() {
    const isDragOver = ref(false);
    const draggedData = ref<DragData | null>(null);

    const handleDragStart = (event: DragEvent, data: DragData) => {
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/json', JSON.stringify(data));
            event.dataTransfer.effectAllowed = 'copy';
            draggedData.value = data;
        }
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
        isDragOver.value = true;
    };

    const handleDragEnter = (event: DragEvent) => {
        event.preventDefault();
        isDragOver.value = true;
    };

    const handleDragLeave = (event: DragEvent) => {
        event.preventDefault();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            isDragOver.value = false;
        }
    };

    const handleDrop = (event: DragEvent): DragData | null => {
        event.preventDefault();
        isDragOver.value = false;

        try {
            const dataStr = event.dataTransfer?.getData('application/json');
            if (dataStr) {
                return JSON.parse(dataStr) as DragData;
            }
        } catch (error) {
            console.error('Error parsing dropped data:', error);
        }

        return null;
    };

    const resetDrag = () => {
        isDragOver.value = false;
        draggedData.value = null;
    };

    return {
        isDragOver,
        draggedData,
        handleDragStart,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop,
        resetDrag
    };
}
