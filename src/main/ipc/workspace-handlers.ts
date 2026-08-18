import type Store from 'electron-store';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

export function createWorkspaceHandlers(store: Store): IpcHandlerMap {
  return {
    [IpcChannels.workspace.list]: () => {
      return store.get('workspaces', []);
    },

    [IpcChannels.workspace.add]: (_, workspace: { id: string; name: string; url: string }) => {
      const workspaces = store.get('workspaces', []) as any[];
      workspaces.push(workspace);
      store.set('workspaces', workspaces);
      return workspace;
    },

    [IpcChannels.workspace.update]: (_, workspace: { id: string; name: string; url: string }) => {
      const workspaces = store.get('workspaces', []) as any[];
      const index = workspaces.findIndex((w: any) => w.id === workspace.id);
      if (index >= 0) {
        workspaces[index] = workspace;
        store.set('workspaces', workspaces);
      }
      return workspace;
    },

    [IpcChannels.workspace.remove]: (_, id: string) => {
      let workspaces = store.get('workspaces', []) as any[];
      workspaces = workspaces.filter((w: any) => w.id !== id);
      store.set('workspaces', workspaces);
      const activeId = store.get('activeWorkspaceId');
      if (activeId === id && workspaces.length > 0) {
        store.set('activeWorkspaceId', workspaces[0].id);
      }
      return true;
    },

    [IpcChannels.workspace.getActive]: () => {
      const activeId = store.get('activeWorkspaceId') as string;
      const workspaces = store.get('workspaces', []) as any[];
      return workspaces.find((w: any) => w.id === activeId) || workspaces[0] || null;
    },

    [IpcChannels.workspace.setActive]: (_, id: string) => {
      store.set('activeWorkspaceId', id);
      const workspaces = store.get('workspaces', []) as any[];
      return workspaces.find((w: any) => w.id === id) || null;
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
