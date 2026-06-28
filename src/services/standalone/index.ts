export { EmbeddedPostgresService, findFreePort } from './embedded-postgres';
export { EmbeddedBackendService } from './embedded-backend';
export type { BackendConfig } from './embedded-backend';
export { standaloneManager } from './standalone-manager';
export type { LocalServiceStatus } from './standalone-manager';
export {
  checkInstalled,
  isStandaloneReady,
  detectGpu,
  downloadComponent,
  downloadAll,
  installModels,
  setupModels,
  uninstallServices,
  uninstallModels,
} from './download-manager';
export type { ComponentStatus, DownloadProgress, GpuInfo } from './download-manager';
