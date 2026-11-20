import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DatasetSourcesPanel from '@/components/datasets/DatasetSourcesPanel.vue';
import type { Dataset } from '@/services/datasets/useDatasets';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const dataset: Dataset = {
  id: 15, name: 'Field catalogue', description: null, schema: [], sourceMode: 'manual', sourceConfig: {},
  project: { id: 9, name: 'Archives' }, extractionConfig: null, createdAt: '', updatedAt: '',
};
const resources = [
  { id: 1, title: 'Register of loans', name: 'register.pdf', mimeType: 'application/pdf' },
  { id: 2, name: 'Transcribed letter', mimeType: 'text/markdown' },
  { id: 3, title: 'Interview', mimeType: 'audio/wav' },
  { id: 4, title: 'Unclassified' },
];
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const radio = (name: RegExp) => screen.getByRole('radio', { name }) as HTMLInputElement;
const save = () => button('Save sources') as HTMLButtonElement;

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: resources });
  api.patch.mockResolvedValue({ data: {} });
});
afterEach(cleanup);

describe('dataset resource source settings', () => {
  it('requires a project for project-wide extraction', () => {
    render(DatasetSourcesPanel, { props: { dataset: { ...dataset, project: null } } });
    expect(radio(/^All resources/).disabled).toBe(true);
    expect(radio(/^Manual/).checked).toBe(true);
    expect(save().disabled).toBe(true);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('estimates rows for exact and prefix MIME filters and persists the selected source', async () => {
    const view = render(DatasetSourcesPanel, { props: { dataset } });
    await fireEvent.click(radio(/^All resources/));
    expect(await screen.findByText('This will create 4 rows when extraction runs.')).toBeTruthy();
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/resources/project/9');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'PDF' }));
    expect(screen.getByText('This will create 1 row when extraction runs.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Text / Markdown' }));
    expect(screen.getByText('This will create 2 rows when extraction runs.')).toBeTruthy();
    await fireEvent.click(save());
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/datasets/15', {
      sourceMode: 'project_resources', sourceConfig: { resourceTypeFilter: ['application/pdf', 'text/'] },
    });
    await waitFor(() => expect(view.emitted().save).toEqual([[]]));
  });

  it('searches, deduplicates and removes selected resources and persists their identifiers', async () => {
    const view = render(DatasetSourcesPanel, { props: { dataset: {
      ...dataset, sourceMode: 'resource_selection', sourceConfig: { resourceIds: [1, 55] },
    } } });
    expect(screen.getByText('Resource 55')).toBeTruthy();
    expect(save().disabled).toBe(true);
    const opening = button(/Add resources/);
    await fireEvent.click(opening);
    const chooser = within(screen.getByRole('heading', { name: 'Select resources' }).parentElement!.parentElement!);
    const search = chooser.getByRole('textbox', { name: 'Search source resources by title' });
    await fireEvent.update(search, 'unavailable');
    expect(chooser.getByText('No resources match.')).toBeTruthy();
    await fireEvent.update(search, '  REGISTER  ');
    expect(chooser.queryByText('Interview')).toBeNull();
    await fireEvent.click(chooser.getByRole('checkbox', { name: /Register of loans/ }));
    await fireEvent.update(search, 'letter');
    await fireEvent.click(chooser.getByRole('checkbox', { name: /Transcribed letter/ }));
    await fireEvent.click(chooser.getByRole('button', { name: 'Add selected' }));
    expect(screen.getByText('Selected resources (3)')).toBeTruthy();

    const missing = screen.getByText('Resource 55');
    await fireEvent.click(within(missing).getByRole('button', { name: 'Remove source resource' }));
    expect(screen.getByText('Selected resources (2)')).toBeTruthy();
    await fireEvent.click(save());
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/datasets/15', {
      sourceMode: 'resource_selection', sourceConfig: { resourceIds: [1, 2] },
    });
    await view.rerender({ dataset: { ...dataset, sourceMode: 'resource_selection', sourceConfig: { resourceIds: [1, 2] } } });
    await waitFor(() => expect(view.emitted().save).toEqual([[]]));
    expect(save().disabled).toBe(true);
  });

  it('warns when sources change after extraction and resets settings for manual entry', async () => {
    render(DatasetSourcesPanel, { props: { dataset: {
      ...dataset, sourceMode: 'project_resources', sourceConfig: { resourceTypeFilter: ['application/pdf'] },
      extractionConfig: { model: 'test-model', promptVersion: '1', lastRunAt: '2026-01-01' },
    } } });
    expect(save().disabled).toBe(true);
    await fireEvent.click(radio(/^Manual/));
    expect(screen.getByText(/Changing sources will affect future extractions/)).toBeTruthy();
    await fireEvent.click(save());
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/datasets/15', { sourceMode: 'manual', sourceConfig: {} });
  });
});
