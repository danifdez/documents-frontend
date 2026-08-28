export type ResourceDisplayMode =
  | 'extracted'
  | 'raw'
  | 'translated'
  | 'overview'
  | 'workspace'
  | 'relationships';

export type ResourceContentMode =
  | 'extracted'
  | 'raw'
  | 'translated'
  | 'summary';

export function toResourceContentMode(mode: ResourceDisplayMode): ResourceContentMode {
  if (mode === 'translated' || mode === 'raw') return mode;
  if (mode === 'overview') return 'summary';
  return 'extracted';
}
