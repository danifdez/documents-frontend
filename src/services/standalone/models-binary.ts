import path from 'path';

export const MODELS_BINARY_NAME = 'documents-models';

export function getModelsBinaryPath(directory: string, platform = process.platform): string {
  const extension = platform === 'win32' ? '.exe' : '';
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  return pathApi.join(directory, `${MODELS_BINARY_NAME}${extension}`);
}
