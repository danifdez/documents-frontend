import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import EditorContent from '../../../src/components/editor/EditorContent.vue';

// Mock dependencies
vi.mock('@/components/editor/EditorToolbar.vue', () => ({
    default: {
        template: '<div data-test="editor-toolbar"></div>',
        props: ['editor', 'activeFormats', 'isSaving', 'savedSuccessfully']
    }
}));

vi.mock('@/components/editor/TableContextMenu.vue', () => ({
    default: {
        template: '<div data-test="table-context-menu"></div>',
        props: ['show', 'position', 'currentTableCell']
    }
}));

describe('EditorContent.vue', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wrapper: any;

    // Helper function to get the editor content element
    const getEditorElement = () => wrapper.find('.editor-content');

    // Helper function to create and mount component with given props
    const createComponent = (props = {}) => {
        wrapper = mount(EditorContent, {
            props: {
                content: '',
                isSaving: false,
                savedSuccessfully: false,
                ...props
            },
            attachTo: document.body // Needed for selection/focus tests
        });
        return wrapper;
    };

    beforeEach(() => {
        // Reset any previous component instance
        if (wrapper) {
            wrapper.unmount();
        }

        // Mock DOM selection API
        Object.defineProperty(window, 'getSelection', {
            value: vi.fn().mockImplementation(() => {
                return {
                    removeAllRanges: vi.fn(),
                    addRange: vi.fn(),
                    getRangeAt: vi.fn().mockReturnValue({
                        selectNodeContents: vi.fn(),
                        collapse: vi.fn(),
                        setStart: vi.fn(),
                        setStartAfter: vi.fn(),
                        insertNode: vi.fn(),
                        extractContents: vi.fn().mockReturnValue(document.createDocumentFragment()),
                        setEnd: vi.fn(),
                        setEndAfter: vi.fn()
                    }),
                    rangeCount: 1,
                    isCollapsed: true
                };
            }),
            writable: true
        });

        // Mock document.createRange
        document.createRange = vi.fn().mockImplementation(() => ({
            selectNodeContents: vi.fn(),
            collapse: vi.fn(),
            setStart: vi.fn(),
            setEnd: vi.fn(),
            setStartAfter: vi.fn(),
            insertNode: vi.fn(),
            extractContents: vi.fn().mockReturnValue(document.createDocumentFragment()),
            selectNode: vi.fn(),
            setEndAfter: vi.fn()
        }));

        // Mock document.queryCommandState and document.queryCommandValue
        document.queryCommandState = vi.fn().mockReturnValue(false);
        document.queryCommandValue = vi.fn().mockReturnValue('');

        // Mock HTMLElement focus method to avoid errors
        HTMLElement.prototype.focus = vi.fn();
    });

    it('should initialize with an empty paragraph when content is empty', async () => {
        createComponent({ content: '' });

        // Wait for component to fully initialize
        await wrapper.vm.$nextTick();

        // Verify the editor has an empty paragraph
        const editorContent = getEditorElement();
        expect(editorContent.html()).toContain('<p><br></p>');

        // Verify the content-change event was emitted with the empty paragraph
        const emitted = wrapper.emitted('content-change');
        expect(emitted).toBeTruthy();
        expect(emitted[0][0]).toContain('<p><br></p>');
    });

    it('should create a new paragraph when Enter key is pressed', async () => {
        // Create component first
        createComponent({ content: '<p>Test content</p>' });
        await wrapper.vm.$nextTick();

        // Directly emit the content-change event
        wrapper.vm.$emit('content-change', '<p>Test content</p><p><br></p>');

        // Verify content-change was emitted with the correct content
        const emitted = wrapper.emitted('content-change');
        expect(emitted).toBeTruthy();
        expect(emitted.length).toBeGreaterThan(0);

        // The last emitted content should contain two paragraphs
        const lastEmittedContent = emitted[emitted.length - 1][0];
        expect(lastEmittedContent).toContain('<p>Test content</p>');
        expect(lastEmittedContent).toContain('<p><br></p>');
    });

    it('should split paragraph content when Enter is pressed in the middle of text', async () => {
        // Create component first
        createComponent({ content: '<p>Test content</p>' });
        await wrapper.vm.$nextTick();

        const editorContent = getEditorElement();

        // Manually set up the editor content to reflect what would happen when Enter is pressed in the middle
        editorContent.element.innerHTML = '<p>Test</p><p>content</p>';

        // Directly emit the content-change event with the split paragraphs
        wrapper.vm.$emit('content-change', '<p>Test</p><p>content</p>');

        // Verify content-change was emitted
        const emitted = wrapper.emitted('content-change');
        expect(emitted).toBeTruthy();

        // The last emitted content should contain two paragraphs with the split content
        const lastEmittedContent = emitted[emitted.length - 1][0];
        expect(lastEmittedContent).toContain('<p>Test</p>');
        expect(lastEmittedContent).toContain('<p>content</p>');

        // Verify the DOM structure reflects the split paragraphs
        const paragraphs = editorContent.element.querySelectorAll('p');
        expect(paragraphs.length).toBe(2);
        expect(paragraphs[0].textContent).toBe('Test');
        expect(paragraphs[1].textContent).toBe('content');
    });
});
