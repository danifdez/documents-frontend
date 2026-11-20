import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectEditModal from '@/components/projects/ProjectEditModal.vue';

const api = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const project = { id: 9, name: 'Archive', description: 'Original donor notes' };
const button = (name: string) => screen.getByRole('button', { name });
const name = () => screen.getByPlaceholderText('Enter project name') as HTMLInputElement;

async function openProject() {
  const view = render(ProjectEditModal, { props: { modelValue: false, projectId: '9' } });
  await view.rerender({ modelValue: true });
  return view;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: project });
  api.patch.mockResolvedValue({ data: project });
});

afterEach(() => vi.restoreAllMocks());

describe('editing project metadata', () => {
  it('loads the selected project, validates a missing name and reports the saved project ID', async () => {
    const { emitted } = await openProject();
    await waitFor(() => expect(name().value).toBe('Archive'));
    expect(api.get).toHaveBeenCalledWith('/projects/9');

    await fireEvent.update(name(), '  ');
    await fireEvent.click(button('Save Changes'));
    expect(api.patch).not.toHaveBeenCalled();
    await fireEvent.update(name(), 'New archive');
    await fireEvent.update(screen.getByPlaceholderText('Enter project description'), 'Updated donor notes');
    await fireEvent.click(button('Save Changes'));

    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/projects/9', {
      name: 'New archive', description: 'Updated donor notes',
    });
    expect(emitted('project:updated')).toEqual([['9']]);
    expect(emitted('update:modelValue')).toContainEqual([false]);
  });

  it('leaves unsaved changes available after a failed save and can cancel the edit', async () => {
    const failure = new Error('Project update unavailable');
    api.patch.mockRejectedValueOnce(failure);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emitted } = await openProject();
    await waitFor(() => expect(name().value).toBe('Archive'));
    await fireEvent.update(name(), 'Edited archive');
    await fireEvent.click(button('Save Changes'));

    expect(error).toHaveBeenCalledWith('Error updating project:', failure);
    expect(name().value).toBe('Edited archive');
    expect(((await screen.findByRole('button', { name: 'Save Changes' })) as HTMLButtonElement).disabled).toBe(false);
    expect(emitted('project:updated')).toBeUndefined();
    await fireEvent.click(button('Cancel'));
    expect(emitted('update:modelValue')).toContainEqual([false]);
  });

  it('allows dismissing the editor when the project could not be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Project unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { emitted } = await openProject();
    expect(name().value).toBe('');
    await fireEvent.click(button('Cancel'));
    expect(emitted('update:modelValue')).toContainEqual([false]);
    expect(api.patch).not.toHaveBeenCalled();
  });
});
