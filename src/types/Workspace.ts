export interface Workspace {
  id: string;
  name: string;
  url: string;
  type: 'local' | 'remote';
}
