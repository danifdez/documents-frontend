import axios from 'axios';
import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import SelectionLookup from '@/components/knowledge/SelectionLookup.vue';
import { useFeatureStore } from '@/store/featureStore';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

async function openLookup(path = '/document/44', knowledgeBase = true) {
  const component = { template: '<div />' };
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/document/:id', component }, { path: '/resource/:id', component }, { path: '/knowledge-base/:id', component },
  ] });
  await router.push(path);
  const pinia = createPinia();
  if (!knowledgeBase) {
    const featureStore = useFeatureStore(pinia);
    vi.spyOn(featureStore, 'isEnabled').mockImplementation((key) => key !== 'knowledge_base');
  }
  const view = render(SelectionLookup, { global: { plugins: [pinia, router] } });
  return { router, view };
}

async function select(text: string) {
  const selection = window.getSelection()!;
  vi.spyOn(selection, 'toString').mockReturnValue(text);
  const event = new MouseEvent('contextmenu', { clientX: 10000, clientY: 42, bubbles: true, cancelable: true });
  await fireEvent(document.body, event);
  return event;
}

const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: [] });
});

afterEach(() => vi.restoreAllMocks());

describe('look up a selected document term', () => {
  it('limits the lookup to document routes with meaningful selections and removes the listener on unmount', async () => {
    const { router, view } = await openLookup('/resource/44');
    expect((await select('Archive')).defaultPrevented).toBe(false);
    expect(screen.queryByRole('button', { name: 'Wikipedia' })).toBeNull();
    await router.push('/document/44');
    expect((await select('  x  ')).defaultPrevented).toBe(false);
    expect(screen.queryByRole('button', { name: 'Wikipedia' })).toBeNull();

    const term = 'Archive '.repeat(12).trim();
    expect((await select(term)).defaultPrevented).toBe(true);
    const popup = screen.getByText(`"${term.slice(0, 80)}…"`).closest<HTMLElement>('div[style]')!;
    expect(popup.style.left).toBe(`${Math.max(8, window.innerWidth - 328)}px`);
    expect(popup.style.top).toBe('50px');
    view.unmount();
    expect((await select('Archive')).defaultPrevented).toBe(false);
  });

  it('searches the knowledge base and navigates to the selected entry', async () => {
    const { router } = await openLookup();
    api.get.mockResolvedValueOnce({ data: [{ id: 42, title: 'Accession Records', summary: 'Inventory of donations' }] });
    await select('  accession record  ');
    await fireEvent.click(button('Search in KB'));
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/knowledge-entries', { params: { q: 'accession record' } });
    expect(await screen.findByText('Inventory of donations')).toBeTruthy();
    await fireEvent.click(screen.getByText('Accession Records'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base/42'));
    expect(screen.queryByRole('button', { name: 'Wikipedia' })).toBeNull();
  });

  it('offers to create a knowledge entry when the search returns no matches', async () => {
    const { router } = await openLookup();
    api.post.mockResolvedValueOnce({ data: { id: 99 } });
    await select('Provenance');
    await fireEvent.click(button('Search in KB'));
    expect(await screen.findByText('No Knowledge Base entries found')).toBeTruthy();
    await fireEvent.click(button('Create new entry with this term'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/knowledge-entries', { title: 'Provenance' });
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base/99'));
  });

  it('shows Wikipedia results with the feature off and closes when clicking outside', async () => {
    await openLookup('/document/44', false);
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: {
      title: 'Sala de lectura', extract: 'Una sala para investigadores.',
      thumbnail: { source: '/test-image.png' }, content_urls: { desktop: { page: 'https://es.wikipedia.org/wiki/Sala_de_lectura' } },
    } });
    await select('Sala de lectura');
    expect(screen.queryByRole('button', { name: 'Search in KB' })).toBeNull();
    await fireEvent.click(button('Wikipedia'));
    expect(get).toHaveBeenCalledExactlyOnceWith('https://es.wikipedia.org/api/rest_v1/page/summary/Sala%20de%20lectura', { timeout: 8000 });
    expect(await screen.findByText('Una sala para investigadores.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View on Wikipedia' }).getAttribute('href'))
      .toBe('https://es.wikipedia.org/wiki/Sala_de_lectura');
    await fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('link', { name: 'View on Wikipedia' })).toBeNull();
  });

  it('clears a Wikipedia error on a new lookup and constructs a URL when the API omits one', async () => {
    await openLookup();
    vi.spyOn(axios, 'get')
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { title: 'Archivos', extract: 'Documentos históricos.' } });
    await select('Unknown collection');
    await fireEvent.click(button('Wikipedia'));
    expect(await screen.findByText('Article not found on Wikipedia')).toBeTruthy();
    await select('Archivos');
    expect(screen.queryByText('Article not found on Wikipedia')).toBeNull();
    await fireEvent.click(button('Wikipedia'));
    expect((await screen.findByRole('link', { name: 'View on Wikipedia' })).getAttribute('href'))
      .toBe('https://es.wikipedia.org/wiki/Archivos');
  });
});
