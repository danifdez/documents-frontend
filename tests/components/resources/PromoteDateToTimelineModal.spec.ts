import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PromoteDateToTimelineModal from '@/components/resources/PromoteDateToTimelineModal.vue';
import type { ResourceDate } from '@/types/ResourceDate';
import type { TimelineEvent } from '@/types/timeline';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const date: ResourceDate = {
  id: 9, resourceId: 12, date: '1925-12-20', endDate: '1925-12-22', rawExpression: '20–22 December',
  charOffset: 8, precision: 'day', contextSnippet: 'The inventory was checked.', unresolvedReason: null, createdAt: '',
};
const earlier: TimelineEvent = { id: 'first', title: 'Opening', date: '1924-01-01', color: '#ab12ab' };
const record = { id: 8, name: 'Collections history', timelineData: [earlier] };
const button = (name: string) => screen.getByRole('button', { name });
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

async function openModal(projectId: number | null = 5, selection = date) {
  const view = render(PromoteDateToTimelineModal, {
    props: { modelValue: false, resourceId: 12, projectId, date: selection },
  });
  await view.rerender({ modelValue: true });
  return view;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (url: string) => {
    if (url === '/timelines/project/5') return { data: [record] };
    if (url === '/timelines/8') return { data: record };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({ data: { id: 10 } });
  api.patch.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

describe('promoting a source date to a timeline', () => {
  it('preserves event provenance and existing events when adding to a project timeline', async () => {
    const view = await openModal();
    const target = await screen.findByRole('radio', { name: /Collections history/ }) as HTMLInputElement;
    expect(target.checked).toBe(true);
    expect(field('Title').value).toBe(date.rawExpression);
    expect(field('Description').value).toBe(date.contextSnippet);
    await fireEvent.update(field('Title'), '  Inventory check  ');
    await fireEvent.update(field('Color'), '#204060');
    await fireEvent.click(button('Add to timeline'));
    expect(api.get).toHaveBeenCalledWith('/timelines/8');
    await waitFor(() => expect(api.patch).toHaveBeenCalledExactlyOnceWith('/timelines/8', { timelineData: [
      earlier, expect.objectContaining({
        id: expect.any(String), title: 'Inventory check', description: date.contextSnippet,
        date: date.date, endDate: date.endDate, color: '#204060', resourceId: 12,
      }),
    ] }));
    await waitFor(() => expect(view.emitted().promoted).toEqual([[{ timelineId: 8, event: expect.any(Object) }]]));
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
  });

  it('requires a nonblank timeline name and creates one with the initial event', async () => {
    const view = await openModal(5, { ...date, endDate: null, contextSnippet: null });
    await fireEvent.click(await screen.findByRole('radio', { name: 'Create new timeline…' }));
    expect(field('New timeline name').value).toBe('Dates from resource #12');
    await fireEvent.update(field('New timeline name'), '   ');
    expect((button('Add to timeline') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(field('New timeline name'), '  Selected dates  ');
    await fireEvent.click(button('Add to timeline'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/timelines', {
      name: 'Selected dates', projectId: 5,
      timelineData: [expect.objectContaining({ title: date.rawExpression, date: date.date, endDate: undefined, description: undefined })],
    });
    await waitFor(() => expect(view.emitted().promoted).toEqual([[{ timelineId: 10, event: expect.any(Object) }]]));
  });

  it('reports a missing project without creating a timeline, and cancel closes the form', async () => {
    const view = await openModal(null);
    expect(api.get).not.toHaveBeenCalled();
    await fireEvent.click(button('Add to timeline'));
    expect(await screen.findByText('Resource has no project')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
    await fireEvent.click(button('Cancel'));
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
  });

  it('retains an existing target after a server failure and allows a retry', async () => {
    const view = await openModal();
    await screen.findByRole('radio', { name: /Collections history/ });
    api.patch.mockRejectedValueOnce({ response: { data: { message: 'Timeline changed, try again' } } });
    await fireEvent.click(button('Add to timeline'));
    expect(await screen.findByText('Timeline changed, try again')).toBeTruthy();
    expect(view.emitted().promoted).toBeUndefined();
    await fireEvent.click(button('Add to timeline'));
    await waitFor(() => expect(view.emitted().promoted).toBeTruthy());
    expect(api.patch).toHaveBeenCalledTimes(2);
  });
});
