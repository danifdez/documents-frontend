export interface OfflineEntity {
  id: number;
  project?: { id: number };
  [key: string]: unknown;
}

export interface OfflineItem {
  workspaceId: string;
  entityType: string;
  entityId: number;
  data: OfflineEntity;
  syncedAt: string;
  parentType?: string;
  parentId?: number;
}

export interface OfflinePendingChange {
  workspaceId: string;
  entityType: string;
  entityId: number;
  method: string;
  payload: unknown;
  timestamp: string;
}
