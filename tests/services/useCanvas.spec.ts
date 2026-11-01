import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, patch, remove } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  default: { get, post, patch, delete: remove },
}));

import { useCanvas } from '../../src/services/canvas/useCanvas';

describe('useCanvas', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
    remove.mockReset();
  });

  it('loads a single canvas by id', async () => {
    get.mockResolvedValue({ data: { id: 3 } });

    const canvas = useCanvas();

    await expect(canvas.loadCanvas('3')).resolves.toEqual({ id: 3 });
    expect(get).toHaveBeenCalledWith('/canvases/3');
  });

  it('creates, saves and removes canvases through the REST endpoints', async () => {
    post.mockResolvedValue({ data: { id: 1 } });
    patch.mockResolvedValue({ data: { id: 1, name: 'Updated' } });
    remove.mockResolvedValue({ data: { deleted: true } });

    const canvas = useCanvas();

    await expect(canvas.createCanvas({ name: 'New' })).resolves.toEqual({ id: 1 });
    expect(post).toHaveBeenCalledWith('/canvases', { name: 'New' });

    await expect(canvas.saveCanvas('1', { name: 'Updated' })).resolves.toEqual({ id: 1, name: 'Updated' });
    expect(patch).toHaveBeenCalledWith('/canvases/1', { name: 'Updated' });

    await expect(canvas.removeCanvas('1')).resolves.toEqual({ deleted: true });
    expect(remove).toHaveBeenCalledWith('/canvases/1');
  });

  it('loads canvases by thread and by project into the shared ref', async () => {
    const canvas = useCanvas();

    get.mockResolvedValue({ data: [{ id: 10 }] });
    await expect(canvas.loadCanvasesByThread(4)).resolves.toEqual([{ id: 10 }]);
    expect(get).toHaveBeenCalledWith('/canvases/thread/4');
    expect(canvas.canvases.value).toEqual([{ id: 10 }]);

    get.mockResolvedValue({ data: [{ id: 11 }] });
    await expect(canvas.loadCanvasesByProject(7)).resolves.toEqual([{ id: 11 }]);
    expect(get).toHaveBeenCalledWith('/canvases/project/7');
    expect(canvas.canvases.value).toEqual([{ id: 11 }]);
  });

  it('fetches the directory with an optional project filter', async () => {
    const canvas = useCanvas();

    get.mockResolvedValue({ data: [{ id: 1 }] });
    await expect(canvas.fetchCanvases()).resolves.toEqual([{ id: 1 }]);
    expect(get).toHaveBeenCalledWith('/canvases');

    get.mockResolvedValue({ data: [{ id: 2 }] });
    await expect(canvas.fetchCanvases(9)).resolves.toEqual([{ id: 2 }]);
    expect(get).toHaveBeenCalledWith('/canvases/project/9');
  });

  it('exposes the API error message and resets loading on failure', async () => {
    get.mockRejectedValue({ response: { data: { message: 'Canvas not found' } } });

    const canvas = useCanvas();

    await expect(canvas.loadCanvas('404')).rejects.toBeTruthy();
    expect(canvas.error.value).toBe('Canvas not found');
    expect(canvas.isLoading.value).toBe(false);
  });
});
