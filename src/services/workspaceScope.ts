// Single source of truth for workspace-scoped storage. Every token and state
// key persisted by the renderer is namespaced by the active workspace, so the
// same machine can hold independent sessions for several servers.
const ACTIVE_WORKSPACE_ID_KEY = 'activeWorkspaceId';
const FALLBACK_WORKSPACE_ID = 'default';

export function getActiveWorkspaceId(): string {
  return localStorage.getItem(ACTIVE_WORKSPACE_ID_KEY) || FALLBACK_WORKSPACE_ID;
}

export function workspaceKey(key: string): string {
  return `${key}_${getActiveWorkspaceId()}`;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(workspaceKey('accessToken'));
}
