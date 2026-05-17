import apiClient from '../api';

export interface IndexedFile {
    id: number;
    filename: string;
    filePath: string;
    mimeType: string;
    size: number;
    mtime: string;
    createdAt: string;
    updatedAt: string;
    // null until extraction finishes; false when the file is not extractable.
    hasExtractedText: boolean | null;
}

export interface ReconcileResult {
    status: 'no_folder' | 'folder_missing' | 'done';
    added?: number;
    updated?: number;
    removed?: number;
    folderScope?: string;
}

export function useIndexedFiles() {
    const list = async (assistantId: number): Promise<IndexedFile[]> => {
        const { data } = await apiClient.get<IndexedFile[]>(
            `/assistants/${assistantId}/indexed-files`,
        );
        return data;
    };

    const upload = async (
        assistantId: number,
        file: File,
    ): Promise<IndexedFile> => {
        const form = new FormData();
        form.append('file', file, file.name);
        form.append('filename', file.name);
        const { data } = await apiClient.post<IndexedFile>(
            `/assistants/${assistantId}/indexed-files/upload`,
            form,
        );
        return data;
    };

    const remove = async (assistantId: number, id: number): Promise<void> => {
        await apiClient.delete(`/assistants/${assistantId}/indexed-files/${id}`);
    };

    const reconcile = async (assistantId: number): Promise<ReconcileResult> => {
        const { data } = await apiClient.post<ReconcileResult>(
            `/assistants/${assistantId}/indexed-files/reconcile`,
        );
        return data;
    };

    return { list, upload, remove, reconcile };
}
