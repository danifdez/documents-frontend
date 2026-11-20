import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import ReadingPointsLayer from '@/components/readingPoints/ReadingPointsLayer.vue';
import { useReadingPointsController } from '@/components/readingPoints/useReadingPointsController';
import { useTocWithReadingPoints } from '@/components/readingPoints/useTocWithReadingPoints';
import type { ReadingPoint } from '@/services/readingPoints/useReadingPoints';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));

const reading: ReadingPoint = {
  id: 31, kind: 'reading', label: null, fragmentId: null, exact: null,
  prefix: null, suffix: null, position: 0, ratio: 0.6,
};
const bookmark: ReadingPoint = {
  ...reading, id: 32, kind: 'section', label: 'References', fragmentId: 'references',
  exact: 'Reference text', position: 14, ratio: 0.25,
};
let records: ReadingPoint[];
let shell: HTMLElement;
let root: HTMLElement;
let scroll: ReturnType<typeof vi.fn>;
let view: VueWrapper<InstanceType<typeof ReadingPointsLayer>> | undefined;
const button = (name: string) => screen.getByRole('button', { name });
const input = () => screen.getByRole('textbox', { name: 'Nombre' }) as HTMLInputElement;

async function openLayer() {
  const controller = useReadingPointsController(() => '5', 'resource');
  view = mount(ReadingPointsLayer, { props: { controller, target: root, enabled: true } });
  await waitFor(() => expect(controller.points.value).toHaveLength(records.length));
  await screen.findByRole('link', { name: 'References' });
  return { controller, layer: view };
}

beforeEach(() => {
  vi.resetAllMocks();
  records = [reading, bookmark];
  shell = document.createElement('main');
  shell.style.overflowY = 'auto';
  root = document.createElement('article');
  root.innerHTML = '<p id="references">Reference text and its provenance.</p>';
  shell.append(root);
  document.body.append(shell);
  Object.defineProperty(shell, 'scrollHeight', { value: 950, configurable: true });
  Object.defineProperty(shell, 'clientHeight', { value: 350, configurable: true });
  shell.scrollTop = 180;
  scroll = vi.spyOn(shell, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(shell, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 340, 350));
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(15, 0, 320, 600));
  const line = root.firstElementChild!;
  const rect = new DOMRect(15, 100, 320, 24);
  vi.spyOn(line, 'getBoundingClientRect').mockReturnValue(rect);
  vi.spyOn(line, 'getClientRects').mockReturnValue([rect] as unknown as DOMRectList);
  vi.spyOn(Range.prototype, 'getBoundingClientRect').mockReturnValue(rect);
  api.get.mockImplementation(async () => ({ data: structuredClone(records) }));
  api.post.mockImplementation(async (_url: string, payload: Partial<ReadingPoint>) => {
    const created: ReadingPoint = { ...reading, id: 33, ...payload };
    records = [...records.filter((point) => created.kind !== 'reading' || point.kind !== 'reading'), created];
    return { data: created };
  });
  api.patch.mockImplementation(async (_url: string, patch: Partial<ReadingPoint>) => {
    const updated = { ...bookmark, ...patch };
    records = records.map((point) => point.id === updated.id ? updated : point);
    return { data: updated };
  });
  api.delete.mockImplementation(async (url: string) => {
    records = records.filter((point) => !url.endsWith('/' + point.id));
  });
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  shell.remove();
  vi.restoreAllMocks();
});

describe('document and resource reading points', () => {
  it('keeps reading progress and bookmarks separate and clears them when the item is unsaved', async () => {
    const entity = ref('5');
    const controller = useReadingPointsController(() => entity.value, 'doc');
    await controller.load();
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/reading-points/doc/5');
    expect(controller.readingPoint.value?.id).toBe(reading.id);
    expect(controller.sections.value.map((p) => p.id)).toEqual([bookmark.id]);

    entity.value = 'new';
    await controller.load();
    expect(controller.points.value).toEqual([]);
    expect(controller.readingPoint.value).toBeNull();
    expect(await controller.addSection('Draft', { ratio: 0.4 })).toBeNull();
    expect(await controller.saveReading({ ratio: 0.4 })).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('handles a fetch failure without dropping the last loaded position', async () => {
    const controller = useReadingPointsController(() => '5', 'resource');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    await controller.load();
    const failure = new Error('Offline');
    api.get.mockRejectedValueOnce(failure);
    const request = controller.load();
    expect(controller.isLoading.value).toBe(true);
    await request;
    expect(logged).toHaveBeenCalledWith('Error loading reading points:', failure);
    expect(controller.isLoading.value).toBe(false);
    expect(controller.readingPoint.value?.id).toBe(reading.id);
  });

  it('interleaves located points, headings and fallback positions and can hide the reading layer', async () => {
    records = [{ ...reading, ratio: 0.6 }, bookmark, { ...reading, id: 34, label: ' ', kind: 'section', ratio: 0.3 }];
    const controller = useReadingPointsController(() => '5', 'doc');
    const headings = ref([
      { id: 'intro', text: 'Introduction', level: 1, position: 1 },
      { id: 'results', text: 'Results', level: 2, position: 30 },
    ]);
    const enabled = ref(true);
    const toc = useTocWithReadingPoints(headings, controller, enabled);
    await controller.load();
    expect(toc.entries.value.map((entry) => [entry.label, entry.level])).toEqual([
      ['Introduction', 1], ['References', 1], ['Results', 2], ['Punto de libro', 1], ['Marca de lectura', 0],
    ]);
    enabled.value = false;
    expect(toc.entries.value.map((entry) => entry.label)).toEqual(['Introduction', 'Results']);
    headings.value = [];
    expect(toc.hasContent.value).toBe(false);
  });

  it('renders bookmarks and resumes the last saved scroll position', async () => {
    await openLayer();
    expect(api.get).toHaveBeenCalledWith('/reading-points/resource/5');
    const mark = screen.getByRole('link', { name: 'References' }).parentElement!;
    expect(mark.style.top).toBe('100px');
    expect(mark.style.left).toBe('15px');
    await fireEvent.click(button('Continuar donde lo dejaste'));
    const margin = Math.min(160, Math.max(60, Math.round(window.innerHeight * 0.2)));
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 360 - margin, behavior: 'smooth' });
    expect(screen.queryByText('Dejaste esta página a medias.')).toBeNull();
  });

  it('dismisses the resume suggestion and persists the current reading anchor', async () => {
    const { layer, controller } = await openLayer();
    await fireEvent.click(button('Ahora no'));
    expect(scroll).not.toHaveBeenCalled();
    await layer.vm.saveReadingAt(-1, -1);
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/reading-points', {
      kind: 'reading', label: '', resource: 5,
      exact: 'Reference text and its provenance.', fragmentId: 'references', prefix: '', suffix: '', position: 0, ratio: 0.3,
    });
    expect(controller.readingPoint.value?.id).toBe(33);
    expect(screen.queryByText('Dejaste esta página a medias.')).toBeNull();
    expect(layer.emitted('changed')).toHaveLength(1);
  });

  it('validates a bookmark label and saves the trimmed name with its text anchor', async () => {
    const { layer } = await openLayer();
    await layer.vm.saveSectionAt(45, 55);
    const name = await screen.findByRole('textbox', { name: 'Nombre' });
    expect(input().value).toBe('Reference text and its provenance.');
    await fireEvent.update(name, '   ');
    await fireEvent.click(button('Guardar'));
    expect(api.post).not.toHaveBeenCalled();
    await fireEvent.update(name, '  Letter provenance  ');
    await fireEvent.keyDown(name, { key: 'Enter' });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/reading-points', expect.objectContaining({
      kind: 'section', label: 'Letter provenance', resource: 5, fragmentId: 'references',
    }));
    expect(await screen.findByRole('link', { name: 'Letter provenance' })).toBeTruthy();
  });

  it('closes a context menu on outside click and navigates to the selected bookmark', async () => {
    await openLayer();
    const mark = screen.getByRole('link', { name: 'References' });
    await fireEvent.contextMenu(mark, { clientX: 20, clientY: 45 });
    expect(button('Ir al punto').parentElement?.style.left).toBe('20px');
    await fireEvent.click(root);
    expect(screen.queryByRole('button', { name: 'Ir al punto' })).toBeNull();
    await fireEvent.contextMenu(mark);
    await fireEvent.click(button('Ir al punto'));
    expect(scroll).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Ir al punto' })).toBeNull();
  });

  it('renames and deletes a bookmark from the context menu and editor', async () => {
    const { layer } = await openLayer();
    await fireEvent.contextMenu(screen.getByRole('link', { name: 'References' }));
    await fireEvent.click(button('Renombrar…'));
    expect(input().value).toBe(bookmark.label);
    await fireEvent.update(input(), '  Sources ');
    await fireEvent.click(button('Guardar'));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/reading-points/32', { label: 'Sources' });

    await fireEvent.contextMenu(await screen.findByRole('link', { name: 'Sources' }));
    await fireEvent.click(button('Renombrar…'));
    await fireEvent.click(button('Quitar'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/reading-points/32');
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Sources' })).toBeNull());
    await waitFor(() => expect(layer.emitted('changed')).toHaveLength(2));
  });

  it('offers removal but no rename for the reading marker', async () => {
    const { controller } = await openLayer();
    await fireEvent.contextMenu(screen.getByRole('link', { name: 'Marca de lectura' }));
    expect(screen.queryByRole('button', { name: 'Renombrar…' })).toBeNull();
    await fireEvent.click(button('Quitar'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/reading-points/31');
    await waitFor(() => expect(controller.readingPoint.value).toBeNull());
    expect(screen.queryByText('Dejaste esta página a medias.')).toBeNull();
  });
});
