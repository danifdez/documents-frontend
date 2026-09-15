import { ref, type Ref } from 'vue';
import { useDocument } from '../services/documents/useDocument';
import { useResourceDocs } from '../services/documents/useResourceDocs';

interface ResourceWorkspaceDocument {
    id?: number;
    content?: string;
    [key: string]: unknown;
}

interface WorkspaceSourceResource {
    name?: string;
    project?: { id: number } | null;
    [key: string]: unknown;
}

interface EnsureWorkspaceResult {
    document: ResourceWorkspaceDocument;
    created: boolean;
}

export function useResourceWorkspace(
    resourceId: Ref<string>,
    resource: Ref<WorkspaceSourceResource>,
) {
    const workspaceDocument = ref<ResourceWorkspaceDocument | null>(null);
    const isLoadingWorkspace = ref(false);
    const { saveDocument } = useDocument();
    const { fetchWorkspaceDocument, createDocument } = useResourceDocs();

    const loadWorkspaceDocument = async () => {
        if (!resourceId.value) return;

        isLoadingWorkspace.value = true;
        try {
            workspaceDocument.value = await fetchWorkspaceDocument(resourceId.value);
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status !== 404) {
                console.error('Error loading workspace document:', error);
            }
            workspaceDocument.value = null;
        } finally {
            isLoadingWorkspace.value = false;
        }
    };

    const ensureWorkspace = async (): Promise<EnsureWorkspaceResult> => {
        if (workspaceDocument.value) {
            return { document: workspaceDocument.value, created: false };
        }

        const document = await createDocument({
            name: `${resource.value.name} - Workspace`,
            content: '',
            resourceId: Number(resourceId.value),
            projectId: resource.value.project?.id,
        });

        workspaceDocument.value = document;
        return { document, created: true };
    };

    const appendHtmlFragment = async (fragment: string): Promise<boolean> => {
        const document = workspaceDocument.value;
        if (!document?.id) return false;

        const content = (document.content || '') + fragment;
        await saveDocument(document.id, { content });
        document.content = content;
        return true;
    };

    return {
        workspaceDocument,
        isLoadingWorkspace,
        loadWorkspaceDocument,
        ensureWorkspace,
        appendHtmlFragment,
    };
}
