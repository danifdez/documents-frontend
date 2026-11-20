import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import GlobalSearchModal from '@/components/GlobalSearchModal.vue';
import { useFeatureStore } from '@/store/featureStore';
import { useProjectStore } from '@/store/projectStore';
import type { SearchResult } from '@/services/search/useSearch';
import type { Project } from '@/types/Project';

const { api } = vi.hoisted(() => ({ api: { post: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const project: Project = { id: 9, name: 'Archives', status: 'active', description: null, createdAt: '', updatedAt: '' };

const entries: [string, number, string, string][] = [
  ['docs', 1, 'Draft', '/document/1'],
  ['resources', 2, 'Ledger', '/resource/2'],
  ['canvases', 3, 'Exhibit', '/canvas/3'],
  ['notes', 4, 'Research note', '/notes/4'],
  ['events', 5, 'Review meeting', '/calendar'],
  ['knowledge', 6, 'Provenance', '/knowledge-base/6'],
  ['entities', 7, 'Collector', '/relationships'],
  ['datasets', 8, 'Holdings', '/datasets/8'],
  ['miscellaneous', 9, 'Other', '#'],
];
const hits = entries.map(([collection, id, name], index): SearchResult => ({
  collection, id, name, score: 1,
  ...(index % 2 ? { highlightedTitle: '<mark>' + name + '</mark>' } : { highlightedName: name }),
  ...(collection === 'docs' ? { highlightedContent: 'Look up the <mark>index</mark>.' } : {}),
}));
const box = () => screen.getByRole('textbox', { name: 'Search documents and resources' }) as HTMLInputElement;

async function openSearch(assigned: Project | null = project, features: Record<string, boolean> = {}) {
  const pinia = createPinia();
  useProjectStore(pinia).setCurrentProject(assigned);
  useFeatureStore(pinia).setBackendFeatures(features);
  const destination = { template: '<div>Destination</div>' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', ...entries.map((entry) => entry[3]).filter((path) => path !== '#')]
      .map((path) => ({ path, component: destination })),
  });
  await router.push('/');
  const view = render(GlobalSearchModal, { props: { show: false }, global: { plugins: [pinia, router] } });
  await view.rerender({ show: true });
  return { view, router };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  api.post.mockResolvedValue({ data: hits });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('global and project search', () => {
  it('debounces input and groups highlighted results with a project-specific destination', async () => {
    const { router, view } = await openSearch();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.activeElement).toBe(box());
    expect(box().placeholder).toBe('Search in Archives...');
    await fireEvent.update(box(), 'Ind');
    await vi.advanceTimersByTimeAsync(200);
    await fireEvent.update(box(), 'Index');
    expect(api.post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/search', { term: 'Index', projectId: 9 });
    expect(screen.getByText('9 results')).toBeTruthy();
    for (const [, , name, url] of entries) {
      const link = screen.getByRole('link', { name: new RegExp(name) });
      if (url !== '#') expect(link.getAttribute('href')).toBe(url);
    }
    expect(screen.getByText('index', { selector: 'mark' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('link', { name: /Draft/ }));
    await vi.advanceTimersByTimeAsync(0);
    expect(router.currentRoute.value.path).toBe('/document/1');
    expect(view.emitted().close).toEqual([[]]);
  });

  it('omits disabled feature collections and sends a global query without a project identifier', async () => {
    await openSearch(null, { canvas: false, relationships: false, knowledge_base: false, datasets: false });
    expect(box().placeholder).toBe('Search notes, events...');
    await fireEvent.update(box(), 'holdings');
    await vi.advanceTimersByTimeAsync(300);
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/search', { term: 'holdings' });
    for (const name of ['Exhibit', 'Collector', 'Provenance', 'Holdings']) {
      expect(screen.queryByRole('link', { name })).toBeNull();
    }
    expect(screen.getByRole('link', { name: 'Research note' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Review meeting' })).toBeTruthy();
  });

  it('clears old results on an unavailable request and resets the query when reopened', async () => {
    const { view } = await openSearch(null);
    expect(box().placeholder).toContain('knowledge base');
    await fireEvent.update(box(), 'draft');
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByRole('link', { name: /Draft/ })).toBeTruthy();

    api.post.mockRejectedValueOnce(new Error('Search temporarily unavailable'));
    await fireEvent.update(box(), 'another query');
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.queryByRole('link', { name: /Draft/ })).toBeNull();
    expect(screen.getByText('another query', { selector: 'strong' })).toBeTruthy();
    await view.rerender({ show: false });
    await view.rerender({ show: true });
    expect(box().value).toBe('');
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
  });
});
