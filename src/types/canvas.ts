import type { CSSProperties } from 'vue';

export interface CanvasRecord {
  id: number;
  name: string;
  canvasData: CanvasData | null;
  thread?: number | { id: number } | null;
  updatedAt: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: CanvasNodeData;
  style?: { width?: number; height?: number; color?: string };
}

export type CanvasNodeType = 'text' | 'shape' | 'bubble' | 'card' | 'image' | 'docRef' | 'resourceRef'
  | 'chart' | 'timeline' | 'entityGraph';

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
  data?: CanvasEdgeData;
}

export interface CanvasNodeData {
  text?: string;
  title?: string;
  subtitle?: string;
  label?: string;
  color?: string;
  accent?: string;
  textColor?: string;
  borderColor?: string;
  strokeColor?: string;
  borderRadius?: number;
  borderStyle?: string;
  borderWidth?: number;
  bold?: boolean;
  fontSize?: string;
  align?: CSSProperties['textAlign'];
  valign?: string;
  shape?: string;
  src?: string;
  alt?: string;
  sourceName?: string;
  docId?: number;
  resourceId?: number;
  chartId?: number;
  chartName?: string;
  datasetId?: number;
  datasetName?: string;
  timelineId?: number;
  timelineName?: string;
  filterMode?: string;
  epochId?: string;
  dateFrom?: string;
  dateTo?: string;
  entityId?: number;
  entityName?: string;
  entityType?: string;
  projectId?: number;
  [key: string]: unknown;
}

export interface CanvasEdgeData {
  color?: string;
  arrow?: boolean;
  dashed?: boolean;
}
