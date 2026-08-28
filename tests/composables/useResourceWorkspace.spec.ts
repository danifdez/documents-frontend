import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResourceWorkspace } from '../../src/composables/useResourceWorkspace';

const mocks = vi.hoisted(() => ({
    fetchWorkspaceDocument: vi.fn(),
    createDocument: vi.fn(),
    saveDocument: vi.fn(),
}));

vi.mock('@/services/documents/useResourceDocs', () => ({
    useResourceDocs: () => ({
        fetchWorkspaceDocument: mocks.fetchWorkspaceDocument,
        createDocument: mocks.createDocument,
    }),
}));

vi.mock('@/services/documents/useDocument', () => ({
    useDocument: () => ({ saveDocument: mocks.saveDocument }),
}));

const createWorkspace = () => useResourceWorkspace(
    ref('42'),
    ref({ name: 'Source', project: { id: 7 } }),
);

describe('useResourceWorkspace', () => {
    beforeEach(() => {
        mocks.fetchWorkspaceDocument.mockReset();
        mocks.createDocument.mockReset();
        mocks.saveDocument.mockReset();
    });

    it('loads the workspace document for the current resource', async () => {
        const document = { id: 10, content: '<p>Existing</p>' };
        mocks.fetchWorkspaceDocument.mockResolvedValue(document);
        const workspace = createWorkspace();

        await workspace.loadWorkspaceDocument();

        expect(mocks.fetchWorkspaceDocument).toHaveBeenCalledWith('42');
        expect(workspace.workspaceDocument.value).toEqual(document);
        expect(workspace.isLoadingWorkspace.value).toBe(false);
    });

    it('treats a missing workspace as an empty state', async () => {
        mocks.fetchWorkspaceDocument.mockRejectedValue({ response: { status: 404 } });
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const workspace = createWorkspace();

        await workspace.loadWorkspaceDocument();

        expect(workspace.workspaceDocument.value).toBeNull();
        expect(consoleError).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it('creates the resource workspace once with the existing payload', async () => {
        const document = { id: 11, content: '' };
        mocks.createDocument.mockResolvedValue(document);
        const workspace = createWorkspace();

        const first = await workspace.ensureWorkspace();
        const second = await workspace.ensureWorkspace();

        expect(mocks.createDocument).toHaveBeenCalledOnce();
        expect(mocks.createDocument).toHaveBeenCalledWith({
            name: 'Source - Workspace',
            content: '',
            resource: { id: 42 },
            project: { id: 7 },
        });
        expect(first).toEqual({ document, created: true });
        expect(second).toEqual({ document, created: false });
    });

    it('updates local content only after the document has been saved', async () => {
        mocks.createDocument.mockResolvedValue({ id: 11, content: '<p>Existing</p>' });
        mocks.saveDocument.mockResolvedValue({});
        const workspace = createWorkspace();
        const { document } = await workspace.ensureWorkspace();

        const appended = await workspace.appendHtmlFragment('<p>Added</p>');

        expect(mocks.saveDocument).toHaveBeenCalledWith(11, {
            content: '<p>Existing</p><p>Added</p>',
        });
        expect(document.content).toBe('<p>Existing</p><p>Added</p>');
        expect(appended).toBe(true);
    });

    it('keeps local content unchanged when saving fails', async () => {
        mocks.createDocument.mockResolvedValue({ id: 11, content: '<p>Existing</p>' });
        mocks.saveDocument.mockRejectedValue(new Error('failed'));
        const workspace = createWorkspace();
        const { document } = await workspace.ensureWorkspace();

        await expect(workspace.appendHtmlFragment('<p>Added</p>')).rejects.toThrow('failed');

        expect(document.content).toBe('<p>Existing</p>');
    });
});
