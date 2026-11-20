import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import EditorContent from '@/components/editor/EditorContent.vue';
import { useProjectStore } from '@/store/projectStore';
import type { TimelineEpoch, TimelineEvent } from '@/types/timeline';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

let view: VueWrapper<InstanceType<typeof EditorContent>> | undefined;
const button = (name: string) => screen.getByRole('button', { name });
const select = (name: string) => screen.getByRole('combobox', { name });
const body = () => view!.get('[style*="--font-size-p"]').element as HTMLElement;
const editor = () => view!.vm.editor!;

async function openEditor(content = '<p>Research notes</p>') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/document/:id', component: EditorContent }] });
  await router.push('/document/7');
  const pinia = createPinia();
  useProjectStore(pinia).setCurrentProject({ id: 47, name: 'Archive', status: 'active', description: null, createdAt: '', updatedAt: '' });
  view = mount(EditorContent, { props: { content, projectId: 47 }, global: { plugins: [router, pinia] }, attachTo: document.body });
  await waitFor(() => expect(editor()).toBeTruthy());
  return view;
}

function fromHtml(selector: string) {
  return new DOMParser().parseFromString(editor().getHTML(), 'text/html').querySelector(selector)!;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: [] });
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('research embeds and settings', () => {
  it('updates editor typography from the desktop preferences and replaces the editor body on a source change', async () => {
    const getSettings = vi.fn().mockResolvedValue({ fontSize: 22, fontFamily: 'Georgia', paragraphSpacing: 1.75 });
    vi.stubGlobal('electronAPI', { getSettings });
    const wrapper = await openEditor();
    await waitFor(() => expect(body().style.getPropertyValue('--font-size-p')).toBe('22'));
    expect(body().style.getPropertyValue('--font-family')).toBe('Georgia');
    expect(body().style.getPropertyValue('--paragraph-spacing')).toBe('1.75');
    expect(api.get).toHaveBeenCalledWith('/bibliography/project/47');

    await wrapper.setProps({ content: '<p>Revised index</p>' });
    expect(editor().getText()).toBe('Revised index');
    await wrapper.setProps({ content: '' });
    expect(editor().getHTML()).toBe('<p></p>');
  });

  it('clears chart selection as the dataset changes and serializes the chosen chart into the document', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/datasets') return { data: [{ id: 17, name: 'Inventory' }, { id: 18, name: 'Empty register' }] };
      if (path === '/datasets/17/charts') return { data: [{ id: 52, name: 'Counts by room', config: { chartType: 'bar' } }] };
      return { data: [] };
    });
    await openEditor();
    await fireEvent.click(screen.getByTitle('Insert Dataset Chart'));
    await screen.findByRole('option', { name: 'Inventory' });
    await fireEvent.update(select('Dataset *'), '17');
    await fireEvent.click(await screen.findByRole('radio', { name: /Counts by room/ }));
    expect((button('Insert') as HTMLButtonElement).disabled).toBe(false);

    await fireEvent.update(select('Dataset *'), '18');
    expect(await screen.findByText('No saved charts for this dataset')).toBeTruthy();
    expect((button('Insert') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(select('Dataset *'), '17');
    await fireEvent.click(await screen.findByRole('radio', { name: /Counts by room/ }));
    await fireEvent.click(button('Insert'));
    const embedded = fromHtml('[data-dataset-chart]');
    expect(embedded.getAttribute('data-chart-id')).toBe('52');
    expect(embedded.getAttribute('data-chart-name')).toBe('Counts by room');
    expect(embedded.getAttribute('data-dataset-id')).toBe('17');
    expect(embedded.getAttribute('data-dataset-name')).toBe('Inventory');
  });

  it('inserts a project timeline with the selected date bounds and restores those attributes from HTML', async () => {
    const timeline = { id: 29, name: 'Collection dates', epochs: [] as TimelineEpoch[], timelineData: [] as TimelineEvent[] };
    api.get.mockImplementation(async (path) => {
      if (path === '/timelines/project/47') return { data: [timeline] };
      if (path === '/timelines/29') return { data: timeline };
      return { data: [] };
    });
    await openEditor();
    await fireEvent.click(screen.getByTitle('Insert Timeline'));
    await fireEvent.click(await screen.findByRole('radio', { name: /Collection dates/ }));
    await fireEvent.update(select('Filter'), 'range');
    await fireEvent.update(screen.getByLabelText('From'), '2026-01-01');
    await fireEvent.update(screen.getByLabelText('To'), '2026-12-31');
    await fireEvent.click(button('Insert'));

    const saved = editor().getHTML();
    const embedded = fromHtml('[data-timeline-view]');
    expect(embedded.getAttribute('data-timeline-id')).toBe('29');
    expect(embedded.getAttribute('data-filter-mode')).toBe('range');
    expect(embedded.getAttribute('data-date-from')).toBe('2026-01-01');
    expect(embedded.getAttribute('data-date-to')).toBe('2026-12-31');
    editor().commands.setContent(saved);
    expect(fromHtml('[data-timeline-view]').getAttribute('data-date-to')).toBe('2026-12-31');
  });
});
