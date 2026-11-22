import type { StoredWorkspace } from '../../types/Workspace';
import type Store from 'electron-store';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

function validateWorkspace(workspace: StoredWorkspace): void {
  if (!workspace || typeof workspace.id !== 'string' || !workspace.id.trim() ||
      typeof workspace.name !== 'string' || !workspace.name.trim() ||
      typeof workspace.url !== 'string' ||
      (workspace.type !== undefined && workspace.type !== 'local' && workspace.type !== 'remote')) {
    throw new TypeError('Invalid workspace');
  }
}

export function createWorkspaceHandlers(store: Store): IpcHandlerMap {
  const readWorkspaces = () => store.get('workspaces', []) as StoredWorkspace[];
  return {
    [IpcChannels.workspace.list]: () => {
      return store.get('workspaces', []);
    },

    [IpcChannels.workspace.add]: (_, workspace: StoredWorkspace) => {
      validateWorkspace(workspace);
      const workspaces = readWorkspaces();
      if (workspaces.some(item => item.id === workspace.id)) {
        throw new Error('A workspace with this ID already exists');
      }
      store.set('workspaces', [...workspaces, workspace]);
      return workspace;
    },

    [IpcChannels.workspace.update]: (_, workspace: StoredWorkspace) => {
      validateWorkspace(workspace);
      const workspaces = readWorkspaces();
      if (workspaces.some(item => item.id === workspace.id)) {
        store.set('workspaces', workspaces.map(item => item.id === workspace.id ? { ...item, ...workspace } : item));
      }
      return workspace;
    },

    [IpcChannels.workspace.remove]: (_, id: string) => {
      const workspaces = readWorkspaces().filter(w => w.id !== id);
      store.set('workspaces', workspaces);
      const activeId = store.get('activeWorkspaceId');
      if (activeId === id && workspaces.length > 0) {
        store.set('activeWorkspaceId', workspaces[0].id);
      }
      return true;
    },

    [IpcChannels.workspace.getActive]: () => {
      const activeId = store.get('activeWorkspaceId') as string;
      const workspaces = store.get('workspaces', []) as StoredWorkspace[];
      return workspaces.find(w => w.id === activeId) || workspaces[0] || null;
    },

    [IpcChannels.workspace.setActive]: (_, id: string) => {
      const workspace = readWorkspaces().find(item => item.id === id);
      if (!workspace) return null;
      store.set('activeWorkspaceId', workspace.id);
      return workspace;
    },

    [IpcChannels.workspace.setDefault]: (_, id: string | null) => {
      store.set('defaultWorkspaceId', id);
      return true;
    },

    [IpcChannels.workspace.getDefault]: () => {
      return store.get('defaultWorkspaceId', null);
    },
  };
}
