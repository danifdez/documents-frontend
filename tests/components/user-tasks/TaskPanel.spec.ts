import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaskPanel from '@/components/user-tasks/TaskPanel.vue';
import type { UserTask } from '@/types/UserTask';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));

const iso = '2026-01-01T13:00:00.000Z';
const future = '2030-05-03T10:35';
const past = '2020-01-01T10:00';
const first: UserTask = { id: 1, title: 'Verify holdings', description: 'Check the ledger', status: 'pending', reminderAt: null, createdAt: iso, updatedAt: iso };
const second: UserTask = { ...first, id: 2, title: 'Prepare exhibits', description: null };
const complete: UserTask = { ...first, id: 3, title: 'Review index', status: 'completed' };
const otherDone: UserTask = { ...complete, id: 4, title: 'Submit summary' };
const button = (name: string) => screen.getByRole('button', { name });
const newTask = () => screen.getByRole('textbox', { name: 'New task title' }) as HTMLInputElement;
const title = (expected: string) => screen.getByDisplayValue(expected) as HTMLInputElement;
const reminder = (owner: Element) => within(owner.parentElement!.parentElement!).getByLabelText('Remind me at') as HTMLInputElement;
let tasks: UserTask[];

async function openTasks(initial = [first, second, complete]) {
  tasks = structuredClone(initial);
  const view = render(TaskPanel, { props: { modelValue: false } });
  await view.rerender({ modelValue: true });
  await waitFor(() => expect(title(first.title)).toBeTruthy());
  return view;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(iso));
  api.get.mockImplementation(async (url: string) => {
    if (url === '/user-tasks') return { data: structuredClone(tasks) };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockImplementation(async (_url: string, payload: Partial<UserTask>) => {
    const created: UserTask = { ...first, id: 8, ...payload };
    tasks = [...tasks, created];
    return { data: created };
  });
  api.patch.mockImplementation(async (url: string, payload: Partial<UserTask>) => {
    const id = Number(url.split('/').at(-1));
    tasks = tasks.map((task) => task.id === id ? { ...task, ...payload } : task);
    return { data: tasks.find((task) => task.id === id) };
  });
  api.delete.mockImplementation(async (url: string) => {
    tasks = tasks.filter((task) => url !== `/user-tasks/${task.id}`);
    return { data: {} };
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('task list interactions', () => {
  it('validates a new reminder against the current time and persists a trimmed title in the local time zone', async () => {
    await openTasks();
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/user-tasks');
    const input = newTask();
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(api.post).not.toHaveBeenCalled();
    await fireEvent.update(input, '  Collect records  ');
    const date = screen.getByLabelText('Remind me at');
    await fireEvent.update(date, past);
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('Reminder must be in the future.')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();

    await fireEvent.update(date, future);
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/user-tasks', {
      title: 'Collect records', reminderAt: new Date(future).toISOString(),
    });
    expect(await screen.findByDisplayValue('Collect records')).toBeTruthy();
    expect(input.value).toBe('');
    expect(screen.queryByText('Reminder must be in the future.')).toBeNull();
  });

  it('navigates tasks by keyboard, saves edited titles on Enter and returns focus to the new task', async () => {
    await openTasks();
    await waitFor(() => expect(document.activeElement).toBe(newTask()));
    await fireEvent.keyDown(newTask(), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(title(second.title));
    await fireEvent.keyDown(title(second.title), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(title(first.title));
    await fireEvent.keyDown(title(first.title), { key: 'ArrowDown' });
    const input = title(second.title);
    expect(document.activeElement).toBe(input);
    await fireEvent.update(input, '  Prepare revised exhibits  ');
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/user-tasks/2', { title: 'Prepare revised exhibits' });
    expect(document.activeElement).toBe(newTask());
    expect(await screen.findByDisplayValue('Prepare revised exhibits')).toBeTruthy();
  });

  it('updates and clears the description and reminder on an existing task', async () => {
    await openTasks();
    const input = title(first.title);
    await fireEvent.focus(input);
    const note = screen.getByRole('textbox', { name: 'Task note' });
    await fireEvent.update(note, '  Check again with the archivist  ');
    await fireEvent.blur(note);
    expect(api.patch).toHaveBeenCalledWith('/user-tasks/1', { description: 'Check again with the archivist' });
    await fireEvent.change(reminder(input), { target: { value: past } });
    expect(screen.getByText('Reminder must be in the future.')).toBeTruthy();
    await fireEvent.change(reminder(input), { target: { value: future } });
    expect(api.patch).toHaveBeenCalledWith('/user-tasks/1', { reminderAt: new Date(future).toISOString() });
    const icon = await screen.findByTitle(/^Reminder · /);
    await fireEvent.click(icon);
    expect(reminder(input).value).toBe(future);

    await fireEvent.click(within(input.parentElement!.parentElement!).getByRole('button', { name: 'clear' }));
    expect(api.patch).toHaveBeenLastCalledWith('/user-tasks/1', { reminderAt: null });
    await waitFor(() => expect(screen.queryByTitle(/^Reminder · /)).toBeNull());
    await fireEvent.update(note, '');
    await fireEvent.blur(note);
    expect(api.patch).toHaveBeenLastCalledWith('/user-tasks/1', { description: null });
  });

  it('moves tasks between the pending and completed lists and clears completed tasks only', async () => {
    await openTasks([first, second, complete, otherDone]);
    const input = title(first.title);
    await fireEvent.click(input.parentElement!.querySelector('button')!);
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/user-tasks/1', { status: 'completed' });
    await fireEvent.click(await screen.findByRole('button', { name: 'Completed (3)' }));
    const reopened = within(screen.getByText(first.title).parentElement!).getByRole('button', { name: 'Mark task as incomplete' });
    await fireEvent.click(reopened);
    expect(api.patch).toHaveBeenLastCalledWith('/user-tasks/1', { status: 'pending' });
    await screen.findByDisplayValue(first.title);
    await fireEvent.click(button('Clear all'));
    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(2));
    expect(api.delete.mock.calls.map(([path]) => path)).toEqual(['/user-tasks/3', '/user-tasks/4']);
    expect(title(second.title)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Completed/ })).toBeNull());
  });

  it('deletes an empty draft with Backspace, deletes another task with the row action, and closes on request', async () => {
    const view = await openTasks();
    const input = title(second.title);
    await fireEvent.update(input, '');
    await fireEvent.keyDown(input, { key: 'Backspace' });
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/user-tasks/2');
    await waitFor(() => expect(document.activeElement).toBe(title(first.title)));
    await fireEvent.click(within(title(first.title).parentElement!).getByRole('button', { name: 'Delete task' }));
    expect(api.delete).toHaveBeenLastCalledWith('/user-tasks/1');
    await fireEvent.click(button('Close tasks'));
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
  });
});
