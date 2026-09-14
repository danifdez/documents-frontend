export type ReleaseComponent = 'node' | 'backend' | 'postgres' | 'models';
export type ModelsVariant = 'cpu' | 'cuda' | 'metal';

export interface ReleaseArtifact {
  version: string;
  file: string;
  size: number;
  sha256: string;
  runtime?: Record<string, unknown>;
  requires?: Record<string, unknown>;
}

export interface ReleaseTarget {
  node?: ReleaseArtifact;
  backend?: ReleaseArtifact;
  postgres?: ReleaseArtifact;
  models?: Partial<Record<ModelsVariant, ReleaseArtifact>>;
  frontend?: ReleaseArtifact;
}

export interface ReleaseManifest {
  schemaVersion: 1;
  release: string;
  targets: Record<string, ReleaseTarget>;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const TARGET_PATTERN = /^(linux|darwin|win32)-(x64|arm64)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateArtifact(value: unknown, label: string): asserts value is ReleaseArtifact {
  if (!isRecord(value)) throw new Error(`Invalid release artifact: ${label}`);
  if (typeof value.version !== 'string' || value.version.length === 0) {
    throw new Error(`Invalid artifact version: ${label}`);
  }
  if (typeof value.file !== 'string' || !isSafeRelativePath(value.file)) {
    throw new Error(`Invalid artifact path: ${label}`);
  }
  if (!Number.isSafeInteger(value.size) || (value.size as number) <= 0) {
    throw new Error(`Invalid artifact size: ${label}`);
  }
  if (typeof value.sha256 !== 'string' || !SHA256_PATTERN.test(value.sha256)) {
    throw new Error(`Invalid artifact checksum: ${label}`);
  }
}

export function isSafeRelativePath(value: string): boolean {
  if (!value || value.includes('\\') || value.startsWith('/') || /^[a-zA-Z]:/.test(value)) return false;
  const segments = value.split('/');
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export function validateReleaseManifest(value: unknown): ReleaseManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.release !== 'string' || !value.release) {
    throw new Error('Invalid release manifest header');
  }
  if (!isRecord(value.targets) || Object.keys(value.targets).length === 0) {
    throw new Error('Release manifest has no targets');
  }

  for (const [targetName, targetValue] of Object.entries(value.targets)) {
    if (!TARGET_PATTERN.test(targetName) || !isRecord(targetValue)) {
      throw new Error(`Invalid release target: ${targetName}`);
    }
    for (const component of ['node', 'backend', 'postgres', 'frontend'] as const) {
      if (targetValue[component] !== undefined) validateArtifact(targetValue[component], `${targetName}.${component}`);
    }
    if (targetValue.models !== undefined) {
      if (!isRecord(targetValue.models)) throw new Error(`Invalid models variants: ${targetName}`);
      for (const [variant, artifact] of Object.entries(targetValue.models)) {
        if (!['cpu', 'cuda', 'metal'].includes(variant)) throw new Error(`Invalid Models variant: ${variant}`);
        validateArtifact(artifact, `${targetName}.models.${variant}`);
      }
    }
  }

  return value as unknown as ReleaseManifest;
}

export function selectReleaseArtifact(
  manifest: ReleaseManifest,
  targetName: string,
  componentName: string,
): { component: ReleaseComponent; variant?: ModelsVariant; artifact: ReleaseArtifact } {
  const target = manifest.targets[targetName];
  if (!target) throw new Error(`Release ${manifest.release} does not support ${targetName}`);

  if (componentName === 'models-cpu' || componentName === 'models-gpu' || componentName === 'models-metal') {
    const requestedVariant: ModelsVariant = componentName === 'models-gpu' ? 'cuda' : componentName.slice(7) as ModelsVariant;
    const variant = target.models?.[requestedVariant] ? requestedVariant : 'cpu';
    const artifact = target.models?.[variant];
    if (!artifact) throw new Error(`Release ${manifest.release} has no Models ${requestedVariant} or CPU artifact for ${targetName}`);
    return { component: 'models', variant, artifact };
  }

  if (!['node', 'backend', 'postgres'].includes(componentName)) {
    throw new Error(`Unknown standalone component: ${componentName}`);
  }
  const component = componentName as 'node' | 'backend' | 'postgres';
  const artifact = target[component];
  if (!artifact) throw new Error(`Release ${manifest.release} has no ${component} artifact for ${targetName}`);
  return { component, artifact };
}

export function resolveArtifactUrl(manifestUrl: string, artifactFile: string): string {
  if (!isSafeRelativePath(artifactFile)) throw new Error('Artifact path must be relative to the release manifest');
  return new URL(artifactFile, manifestUrl).toString();
}
