import { describe, expect, it, vi } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import type Store from 'electron-store';
import { IpcChannels } from '@/ipc/channels';
import { createWorkspaceHandlers } from '@/main/ipc/workspace-handlers';
import type { StoredWorkspace } from '@/types/Workspace';

const local: StoredWorkspace = { id: 'local', type: 'local', name: 'Archive', url: 'http://localhost:3000' };
const remote: StoredWorkspace = { id: 'remote', type: 'remote', name: 'Catalog', url: 'https://workspace.example' };
const channel = IpcChannels.workspace;

function setup() {
  const disk = new Map<string, unknown>();
  const store = {
    get: vi.fn((key: string, fallback?: unknown) => structuredClone(disk.get(key) ?? fallback)),
    set: vi.fn((key: string, value: unknown) => disk.set(key, structuredClone(value))),
  };
  const handlers = createWorkspaceHandlers(store as unknown as Store);
  const invoke = (name: keyof typeof channel, ...args: unknown[]) => handlers[channel[name]]!({} as IpcMainInvokeEvent, ...args);
  return { invoke, store };
}

describe('desktop workspace IPC', () => {
  it('persists workspace changes and keeps the active workspace independent of the default', () => {
    const { invoke } = setup();
    expect(invoke('list')).toEqual([]);
    expect(invoke('getActive')).toBeNull();
    expect(invoke('getDefault')).toBeNull();

    expect(invoke('add', local)).toEqual(local);
    expect(invoke('add', remote)).toEqual(remote);
    const updated = { ...remote, name: 'Research catalog' };
    expect(invoke('update', updated)).toEqual(updated);
    expect(invoke('list')).toEqual([local, updated]);
    expect(invoke('getActive')).toEqual(local);
    expect(invoke('setActive', 'remote')).toEqual(updated);
    expect(invoke('setDefault', 'local')).toBe(true);
    expect(invoke('getDefault')).toBe('local');
    expect(invoke('getActive')).toEqual(updated);

    expect(invoke('remove', 'remote')).toBe(true);
    expect(invoke('list')).toEqual([local]);
    expect(invoke('getActive')).toEqual(local);
  });

  it('leaves the active workspace unchanged when removing a different workspace and tolerates stale IDs', () => {
    const { invoke, store } = setup();
    invoke('add', local);
    invoke('add', remote);
    invoke('setActive', 'remote');
    invoke('update', { ...local, id: 'unknown' });
    expect(invoke('list')).toEqual([local, remote]);
    store.set.mockClear();
    expect(invoke('remove', 'local')).toBe(true);
    expect(store.set).toHaveBeenCalledExactlyOnceWith('workspaces', [remote]);
    store.set.mockClear();
    expect(invoke('setActive', 'deleted')).toBeNull();
    expect(store.set).not.toHaveBeenCalled();
    expect(invoke('getActive')).toEqual(remote);
    expect(() => invoke('add', { ...remote, name: 'Duplicate' })).toThrow('already exists');
    expect(invoke('list')).toEqual([remote]);
    invoke('setDefault', null);
    expect(invoke('getDefault')).toBeNull();
    invoke('remove', 'remote');
    expect(invoke('getActive')).toBeNull();
  });
});
