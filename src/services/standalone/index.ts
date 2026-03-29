export { EmbeddedPostgresService, findFreePort } from './embedded-postgres';
export { EmbeddedQdrantService } from './embedded-qdrant';
export { EmbeddedNeo4jService } from './embedded-neo4j';
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
