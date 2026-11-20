export interface Workspace {
  id: string;
  name: string;
  url: string;
  type: 'local' | 'remote';
}

export type StoredWorkspace = Omit<Workspace, 'type'> & { type?: Workspace['type'] };
