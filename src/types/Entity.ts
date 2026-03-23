export interface Entity {
  id: number;
  name: string;
  description: string | null;
  global: boolean;
  translations: Record<string, string>;
  aliases: string[];
  entityType: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
