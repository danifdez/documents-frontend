import { defineComponent, h } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ResourceDocumentEditor from '../../../src/components/resources/ResourceDocumentEditor.vue';

const mocks = vi.hoisted(() => ({
    saveDocument: vi.fn(),
    notificationError: vi.fn(),
    search: vi.fn(() => 2),
    scrollTo: vi.fn(),
    clearHighlights: vi.fn(),
}));

vi.mock('@/services/documents/useDocument', () => ({
    useDocument: () => ({ saveDocument: mocks.saveDocument }),
}));

vi.mock('@/composables/useNotification', () => ({
    useNotification: () => ({ error: mocks.notificationError }),
}));

const EditorContentStub = defineComponent({
    name: 'EditorContent',
    props: ['content', 'isSaving', 'savedSuccessfully', 'context'],
    emits: ['content-change'],
    setup(_props, { emit, expose }) {
        expose({
            search: mocks.search,
            scrollTo: mocks.scrollTo,
            clearHighlights: mocks.clearHighlights,
        });

        return () => h('button', {
            'data-test': 'editor',
            onClick: () => emit('content-change', '<p>Changed</p>'),
        }, 'Edit content');
    },
});

const mountEditor = (variant: 'workspace' | 'split' = 'workspace') => {
    const document = {
        id: 42,
        name: 'Original name',
        content: '<p>Original</p>',
    };

    const wrapper = mount(ResourceDocumentEditor, {
        props: {
            modelValue: document,
            variant,
        },
        global: {
            stubs: {
                EditorContent: EditorContentStub,
            },
        },
    });

    return { document, wrapper };
};

describe('ResourceDocumentEditor', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mocks.saveDocument.mockReset().mockResolvedValue({});
        mocks.notificationError.mockReset();
        mocks.search.mockClear();
        mocks.scrollTo.mockClear();
        mocks.clearHighlights.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('debounces workspace content saves and keeps the existing feedback timing', async () => {
        const { document, wrapper } = mountEditor();

        await wrapper.get('[data-test="editor"]').trigger('click');
        expect(wrapper.text()).toContain('Saving...');
        expect(mocks.saveDocument).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1000);

        expect(mocks.saveDocument).toHaveBeenCalledOnce();
        expect(mocks.saveDocument).toHaveBeenCalledWith('42', { content: '<p>Changed</p>' });
        expect(document.content).toBe('<p>Changed</p>');
        expect(wrapper.text()).toContain('Saved');

        await vi.advanceTimersByTimeAsync(3000);
        expect(wrapper.text()).not.toContain('Saved');
    });

    it('saves a trimmed split-view name without replacing the text being edited', async () => {
        const { document, wrapper } = mountEditor('split');
        const input = wrapper.get('input');

        await input.setValue('  Renamed document  ');
        await vi.advanceTimersByTimeAsync(1000);

        expect(mocks.saveDocument).toHaveBeenCalledWith('42', { name: 'Renamed document' });
        expect(document.name).toBe('  Renamed document  ');
    });

    it('keeps workspace save failures visible through the existing notification', async () => {
        mocks.saveDocument.mockRejectedValueOnce(new Error('failed'));
        const { wrapper } = mountEditor();

        await wrapper.get('[data-test="editor"]').trigger('click');
        await vi.advanceTimersByTimeAsync(1000);

        expect(mocks.notificationError).toHaveBeenCalledWith('Failed to save workspace content');
        expect(wrapper.text()).not.toContain('Saving...');
        expect(wrapper.text()).not.toContain('Saved');
    });

    it('proxies the editor search API used by FloatingSearchBox', () => {
        const { wrapper } = mountEditor('split');

        expect(wrapper.vm.search('term')).toBe(2);
        wrapper.vm.scrollTo(1);
        wrapper.vm.clearHighlights();

        expect(mocks.search).toHaveBeenCalledWith('term');
        expect(mocks.scrollTo).toHaveBeenCalledWith(1);
        expect(mocks.clearHighlights).toHaveBeenCalledOnce();
    });

    it('emits the existing workspace and split-view navigation actions', async () => {
        const { wrapper: workspace } = mountEditor();
        await workspace.get('button[title="Open in split view"]').trigger('click');
        expect(workspace.emitted('open-split')).toHaveLength(1);

        const { wrapper: split } = mountEditor('split');
        await split.get('button.ml-2').trigger('click');
        expect(split.emitted('close')).toHaveLength(1);
    });
});
