export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
  style?: { width?: number; height?: number; color?: string };
}

export type CanvasNodeType = 'text' | 'sticky' | 'shape' | 'image' | 'docRef' | 'resourceRef';

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
  data?: Record<string, any>;
}

export interface CanvasRecord {
  id: number;
  name: string;
  canvasData: CanvasData | null;
  content: string | null;
  thread: number | null;
  project: number | null;
  createdAt: string;
  updatedAt: string;
}
