import path from 'path';
import { getModelsBinaryPath, MODELS_BINARY_NAME } from '../../src/services/standalone/models-binary';

describe('Models standalone binary', () => {
  it('uses the canonical binary name on Unix platforms', () => {
    expect(MODELS_BINARY_NAME).toBe('documents-models');
    expect(getModelsBinaryPath('/services/models', 'linux')).toBe(
      path.join('/services/models', 'documents-models'),
    );
  });

  it('uses the canonical executable name on Windows', () => {
    expect(getModelsBinaryPath('C:\\services\\models', 'win32')).toBe(
      path.win32.join('C:\\services\\models', 'documents-models.exe'),
    );
  });
});
