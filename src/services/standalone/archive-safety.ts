import path from 'path';

export function assertSafeArchiveEntry(entryPath: string, type: string, linkPath?: string): void {
  assertRelativeArchivePath(entryPath, 'archive entry');
  if (type !== 'SymbolicLink' && type !== 'Link') return;
  if (!linkPath) throw new Error('Archive link has no target');

  const resolvedTarget = type === 'SymbolicLink'
    ? path.posix.normalize(path.posix.join(path.posix.dirname(entryPath), linkPath))
    : path.posix.normalize(linkPath);
  assertRelativeArchivePath(resolvedTarget, 'archive link target');
}

function assertRelativeArchivePath(value: string, label: string): void {
  if (!value || value.includes('\\') || path.posix.isAbsolute(value) || /^[a-zA-Z]:/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  const normalized = path.posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../')) throw new Error(`Unsafe ${label}: ${value}`);
}
