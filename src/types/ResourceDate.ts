export type DatePrecision = 'day' | 'month' | 'year';
export type DateResolver = 'dateparser' | 'llm' | 'unresolved';

export interface ResourceDate {
  id: number;
  resourceId: number;
  date: string | null;
  endDate: string | null;
  rawExpression: string;
  precision: DatePrecision | null;
  charOffset: number | null;
  contextSnippet: string | null;
  resolver: DateResolver;
  isRelative: boolean;
  unresolvedReason: string | null;
  anchorDateUsed: string | null;
  createdAt: string;
}
