export type DatePrecision = 'day' | 'month' | 'year';

export interface ResourceDate {
  id: number;
  resourceId: number;
  date: string | null;
  endDate: string | null;
  rawExpression: string;
  precision: DatePrecision | null;
  charOffset: number | null;
  contextSnippet: string | null;
  unresolvedReason: string | null;
  createdAt: string;
}
