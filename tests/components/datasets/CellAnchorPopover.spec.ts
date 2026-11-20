import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import CellAnchorPopover from '@/components/datasets/CellAnchorPopover.vue';
import type { CellAnchor } from '@/services/datasets/useDatasets';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const anchor: CellAnchor = {
  sourceResourceId: 30,
  page: 4,
  quote: 'The library opened in May.',
  extractedAt: '2025-06-07T12:00:00Z',
  model: 'local-model',
  promptVersion: 'extract-v2',
  editedByUser: true,
};

async function openCell(overrides: Partial<InstanceType<typeof CellAnchorPopover>['$props']> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/resource/:id', name: 'Resource', component: { template: '<div />' } },
    ],
  });
  await router.push('/');
  const view = render(CellAnchorPopover, {
    props: { isOpen: true, anchor, fieldName: 'Opening', value: { month: 'May' }, anchorRect: null, ...overrides },
    global: { plugins: [router] },
  });
  return { router, ...view };
}

beforeEach(() => {
  api.get.mockReset();
  api.get.mockResolvedValue({ data: { title: 'Annual report' } });
});

describe('CellAnchorPopover', () => {
  it('displays extraction provenance and opens the resource on the cited page', async () => {
    const { router, emitted } = await openCell();
    expect(await screen.findByText('Annual report')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/resources/30');
    expect(screen.getByText('Opening')).toBeTruthy();
    expect(screen.getByText('{"month":"May"}')).toBeTruthy();
    expect(screen.getByText('"The library opened in May."')).toBeTruthy();
    expect(screen.getByText('local-model')).toBeTruthy();
    expect(screen.getByText('extract-v2')).toBeTruthy();
    expect(screen.getByText('Manually edited after extraction')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Open source' }));
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/resource/30?page=4'));
    expect(emitted('close')).toHaveLength(1);
  });

  it('positions the panel inside the viewport and re-extracts a cell even when its source was deleted', async () => {
    api.get.mockRejectedValueOnce(new Error('Resource no longer exists'));
    const { emitted } = await openCell({
      value: null,
      anchor: { ...anchor, page: null, quote: '', extractedAt: '', editedByUser: false },
      anchorRect: new DOMRect(window.innerWidth - 20, window.innerHeight - 20, 20, 20),
    });
    const unavailable = await screen.findByText('Source unavailable (deleted)');
    expect(unavailable.closest('div.fixed')?.getAttribute('style')).toContain('left: ' + Math.max(8, window.innerWidth - 328) + 'px');
    expect(screen.getByText('"(empty)"')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Open source' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Manually edited after extraction')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Re-extract this cell' }));
    expect(emitted('re-extract')).toHaveLength(1);
    expect(emitted('close')).toBeUndefined();
  });

  it('closes on Escape and outside clicks, keeping the panel open when clicked inside', async () => {
    const { emitted, rerender } = await openCell({ value: 14 });
    const value = await screen.findByText('14');
    await fireEvent.mouseDown(value);
    await fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(emitted('close')).toBeUndefined();

    await fireEvent.mouseDown(document.body);
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    await fireEvent.click(screen.getByRole('button', { name: 'Close cell details' }));
    expect(emitted('close')).toHaveLength(3);

    await rerender({ isOpen: false });
    await fireEvent.mouseDown(document.body);
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(emitted('close')).toHaveLength(3);
  });
});
