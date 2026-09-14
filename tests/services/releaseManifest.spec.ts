import {
  resolveArtifactUrl,
  selectReleaseArtifact,
  validateReleaseManifest,
} from '../../src/services/standalone/release-manifest';

const checksum = 'a'.repeat(64);

interface MutableManifest {
  schemaVersion: number;
  release: string;
  targets: Record<string, {
    node: Record<string, unknown>;
    backend: Record<string, unknown>;
    models: Record<string, Record<string, unknown>>;
  }>;
}

function manifestValue(): MutableManifest {
  return {
    schemaVersion: 1,
    release: '1.2.3',
    targets: {
      'linux-x64': {
        node: { version: '22.23.1', file: 'components/node.tar.gz', size: 10, sha256: checksum },
        backend: { version: '1.2.3', file: 'components/backend.tar.gz', size: 20, sha256: checksum },
        models: {
          cpu: { version: '1.2.3', file: 'components/models-cpu.tar.gz', size: 30, sha256: checksum },
        },
      },
    },
  };
}

describe('Standalone release manifest', () => {
  it('selects the artifact for the current target and maps models-gpu to cuda', () => {
    const value = manifestValue();
    value.targets['linux-x64'].models.cuda = {
      version: '1.2.3', file: 'components/models-cuda.tar.gz', size: 40, sha256: checksum,
    };
    const manifest = validateReleaseManifest(value);

    expect(selectReleaseArtifact(manifest, 'linux-x64', 'backend').artifact.file).toBe('components/backend.tar.gz');
    expect(selectReleaseArtifact(manifest, 'linux-x64', 'models-gpu')).toMatchObject({
      component: 'models', variant: 'cuda', artifact: { file: 'components/models-cuda.tar.gz' },
    });
  });

  it('rejects absolute and traversal artifact paths before resolving a URL', () => {
    for (const unsafePath of ['../backend.tar.gz', '/tmp/backend.tar.gz', 'C:\\temp\\backend.zip']) {
      const value = manifestValue();
      value.targets['linux-x64'].backend.file = unsafePath;
      expect(() => validateReleaseManifest(value)).toThrow('Invalid artifact path');
    }
  });

  it('rejects malformed sizes and checksums', () => {
    const value = manifestValue();
    value.targets['linux-x64'].backend.size = -1;
    value.targets['linux-x64'].backend.sha256 = 'not-a-checksum';
    expect(() => validateReleaseManifest(value)).toThrow('Invalid artifact size');
  });

  it('resolves artifacts relative to the directory containing release.json', () => {
    expect(resolveArtifactUrl(
      'http://127.0.0.1:8000/release.json',
      'components/backend.tar.gz',
    )).toBe('http://127.0.0.1:8000/components/backend.tar.gz');
  });

  it('reports a missing target or variant as unsupported', () => {
    const manifest = validateReleaseManifest(manifestValue());
    expect(() => selectReleaseArtifact(manifest, 'darwin-arm64', 'backend')).toThrow('does not support');
    expect(() => selectReleaseArtifact(manifest, 'linux-x64', 'models-gpu')).toThrow('no Models cuda artifact');
  });
});
