import apiClient from '../api';

export type WorkingFolderOwnerType = 'assistant' | 'agent';

export interface IndexedFile {
    id: number;
    filename: string;
    filePath: string;
    mimeType: string;
    size: number;
    mtime: string;
    createdAt: string;
    updatedAt: string;
    hasExtractedText: boolean | null;
}

export interface ReconcileResult {
    status: 'no_folder' | 'folder_missing' | 'done';
    added?: number;
    updated?: number;
    removed?: number;
    folderScope?: string;
}

function ownerBase(ownerType: WorkingFolderOwnerType, ownerId: number): string {
    const collection = ownerType === 'assistant' ? 'assistants' : 'agents';
    return `/${collection}/${ownerId}/indexed-files`;
}

export function useIndexedFiles() {
    const list = async (
        ownerType: WorkingFolderOwnerType,
        ownerId: number,
    ): Promise<IndexedFile[]> => {
        const { data } = await apiClient.get<IndexedFile[]>(ownerBase(ownerType, ownerId));
        return data;
    };

    const upload = async (
        ownerType: WorkingFolderOwnerType,
        ownerId: number,
        file: File,
    ): Promise<IndexedFile> => {
        const form = new FormData();
        form.append('file', file, file.name);
        form.append('filename', file.name);
        const { data } = await apiClient.post<IndexedFile>(
            `${ownerBase(ownerType, ownerId)}/upload`,
            form,
        );
        return data;
    };

    const remove = async (
        ownerType: WorkingFolderOwnerType,
        ownerId: number,
        id: number,
    ): Promise<void> => {
        await apiClient.delete(`${ownerBase(ownerType, ownerId)}/${id}`);
    };

    const reconcile = async (
        ownerType: WorkingFolderOwnerType,
        ownerId: number,
    ): Promise<ReconcileResult> => {
        const { data } = await apiClient.post<ReconcileResult>(
            `${ownerBase(ownerType, ownerId)}/reconcile`,
        );
        return data;
    };

    return { list, upload, remove, reconcile };
}
