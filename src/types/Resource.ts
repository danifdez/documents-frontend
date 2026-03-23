export interface Resource {
  id: number;
  name: string;
  hash: string | null;
  type: string | null;
  mimeType: string | null;
  originalName: string | null;
  uploadDate: string | null;
  fileSize: number | null;
  pages: number | null;
  path: string | null;
  url: string | null;
  title: string | null;
  publicationDate: string | null;
  content: string | null;
  translatedContent: string | null;
  workingContent: string | null;
  summary: string | null;
  keyPoints: string[] | null;
  keywords: string[] | null;
  language: string | null;
  license: string | null;
  status: string;
  project: { id: number; name: string } | null;
  authors: Array<{ id: number; name: string }>;
  entities: Array<{ id: number; name: string; entityType?: { id: number; name: string } }>;
  createdAt: string;
  updatedAt: string;
}
