import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EditorToolbar from '../../../src/components/editor/EditorToolbar.vue';

const TABLE_COMMANDS = [
    'insertTable',
    'addRowBefore',
    'addRowAfter',
    'deleteRow',
    'addColumnBefore',
    'addColumnAfter',
    'deleteColumn',
    'mergeCells',
    'splitCell',
    'toggleHeaderRow',
    'deleteTable',
] as const;

const createFakeEditor = ({ inTable }: { inTable: boolean }) => {
    const calls: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    for (const name of TABLE_COMMANDS) {
        chain[name] = () => {
            calls.push(name);
            return chain;
        };
    }
    chain.focus = () => chain;
    chain.run = () => true;

    const editor = {
        isActive: (name: string) => name === 'table' && inTable,
        can: () => ({ mergeCells: () => inTable, splitCell: () => false }),
        chain: () => chain,
        getAttributes: () => ({}),
        state: { selection: {}, doc: { textBetween: () => '' } },
        on: vi.fn(),
        off: vi.fn(),
    };

    return { editor, calls };
};

const mountToolbar = (inTable: boolean) => {
    const { editor, calls } = createFakeEditor({ inTable });
    const wrapper = mount(EditorToolbar, { props: { editor, context: 'document' } });
    return { wrapper, calls };
};

const findButton = (wrapper: ReturnType<typeof mountToolbar>['wrapper'], title: string) =>
    wrapper.findAll('button').find((button) => button.attributes('title') === title);

describe('EditorToolbar table menu', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('inserts a table when the cursor is outside a table', async () => {
        const { wrapper, calls } = mountToolbar(false);

        await findButton(wrapper, 'Table')!.trigger('click');

        expect(calls).toContain('insertTable');
        expect(wrapper.text()).not.toContain('Insert row above');
    });

    it('opens the table menu when the cursor is inside a table', async () => {
        const { wrapper, calls } = mountToolbar(true);

        await findButton(wrapper, 'Table')!.trigger('click');

        expect(calls).not.toContain('insertTable');
        expect(wrapper.text()).toContain('Insert row above');
        expect(wrapper.text()).toContain('Delete table');
    });

    it('runs the selected table command and closes the menu', async () => {
        const { wrapper, calls } = mountToolbar(true);

        await findButton(wrapper, 'Table')!.trigger('click');
        const rowAbove = wrapper.findAll('button').find((button) => button.text() === 'Insert row above');
        await rowAbove!.trigger('click');

        expect(calls).toContain('addRowBefore');
        expect(wrapper.text()).not.toContain('Insert row above');
    });

    it('disables split cell when the current cell is not merged', async () => {
        const { wrapper } = mountToolbar(true);

        await findButton(wrapper, 'Table')!.trigger('click');
        const splitCell = wrapper.findAll('button').find((button) => button.text() === 'Split cell');

        expect(splitCell!.attributes('disabled')).toBeDefined();
    });
});
