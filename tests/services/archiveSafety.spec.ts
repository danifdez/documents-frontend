import { assertSafeArchiveEntry } from '../../src/services/standalone/archive-safety';

describe('Standalone archive safety', () => {
  it('accepts regular entries and internal relative symlinks', () => {
    expect(() => assertSafeArchiveEntry('bin/node', 'File')).not.toThrow();
    expect(() => assertSafeArchiveEntry('bin/npm', 'SymbolicLink', '../lib/node_modules/npm/bin/npm-cli.js')).not.toThrow();
  });

  it('rejects traversal and absolute archive entries', () => {
    for (const entry of ['../../outside', '/etc/passwd', 'C:\\outside\\file']) {
      expect(() => assertSafeArchiveEntry(entry, 'File')).toThrow('Unsafe archive entry');
    }
  });

  it('rejects links whose target escapes the extraction root', () => {
    expect(() => assertSafeArchiveEntry('bin/tool', 'SymbolicLink', '../../outside')).toThrow('Unsafe archive link target');
    expect(() => assertSafeArchiveEntry('bin/tool', 'Link', '../outside')).toThrow('Unsafe archive link target');
  });
});
