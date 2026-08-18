// Single source of truth for every IPC channel name. Imported by both the
// main and preload bundles, so it must stay dependency-free: no Electron or
// Node imports, or the preload bundle would drag them in.

/** Channels the renderer invokes and the main process handles. */
export const IpcChannels = {
  voice: {
    isAvailable: 'voice:local:isAvailable',
    hasModel: 'voice:local:hasModel',
    preload: 'voice:local:preload',
    start: 'voice:local:start',
    chunk: 'voice:local:chunk',
    stop: 'voice:local:stop',
    cancel: 'voice:local:cancel',
  },
  calendar: {
    showAlarm: 'calendar:show-alarm',
    showMissedAggregate: 'calendar:show-missed-aggregate',
  },
  task: {
    showReminder: 'task:show-reminder',
    showMissedAggregate: 'task:show-missed-aggregate',
  },
  document: {
    upload: 'upload-document',
    openMultipleFileDialog: 'open-multiple-file-dialog',
  },
  shell: {
    openPath: 'shell:open-path',
    showItemInFolder: 'shell:show-item-in-folder',
  },
  folderScope: {
    pick: 'folder-scope:pick',
  },
  settings: {
    get: 'settings:get',
    set: 'settings:set',
  },
  debug: {
    resetTrayHint: 'debug:reset-tray-hint',
  },
  app: {
    trayAvailable: 'app:tray-available',
    getPlatform: 'app:get-platform',
  },
  workspace: {
    list: 'workspace:list',
    add: 'workspace:add',
    update: 'workspace:update',
    remove: 'workspace:remove',
    getActive: 'workspace:get-active',
    setActive: 'workspace:set-active',
    setDefault: 'workspace:set-default',
    getDefault: 'workspace:get-default',
  },
  standalone: {
    checkInstalled: 'standalone:check-installed',
    isReady: 'standalone:is-ready',
    detectGpu: 'standalone:detect-gpu',
    hardwareReport: 'standalone:hardware-report',
    downloadAll: 'standalone:download-all',
    installProfile: 'standalone:install-profile',
    downloadComponent: 'standalone:download-component',
    installModels: 'standalone:install-models',
    uninstallServices: 'standalone:uninstall-services',
    uninstallModels: 'standalone:uninstall-models',
    start: 'standalone:start',
    stop: 'standalone:stop',
    status: 'standalone:status',
    getUrl: 'standalone:get-url',
  },
  offline: {
    putItem: 'offline:put-item',
    getItem: 'offline:get-item',
    deleteItem: 'offline:delete-item',
    getAllItemsByWorkspace: 'offline:get-all-items-by-workspace',
    putFile: 'offline:put-file',
    getFilePath: 'offline:get-file-path',
    deleteFile: 'offline:delete-file',
    addPendingChange: 'offline:add-pending-change',
    getPendingChanges: 'offline:get-pending-changes',
    countPendingChanges: 'offline:count-pending-changes',
    clearPendingChanges: 'offline:clear-pending-changes',
    getManifest: 'offline:get-manifest',
    updateManifest: 'offline:update-manifest',
    clearAll: 'offline:clear-all',
  },
} as const;

/** Channels the main process pushes to the renderer (`webContents.send`). */
export const IpcEvents = {
  voice: {
    partial: 'voice:local:partial',
    error: 'voice:local:error',
    loadingProgress: 'voice:local:loading-progress',
  },
  calendar: {
    navigate: 'calendar:navigate',
    navigateMissedPanel: 'calendar:navigate-missed-panel',
  },
  task: {
    navigate: 'task:navigate',
    navigateMissedPanel: 'task:navigate-missed-panel',
  },
  standalone: {
    downloadProgress: 'standalone:download-progress',
  },
} as const;

type ChannelValues<T> = T extends string ? T : { [K in keyof T]: ChannelValues<T[K]> }[keyof T];

export type IpcChannel = ChannelValues<typeof IpcChannels>;
export type IpcEventChannel = ChannelValues<typeof IpcEvents>;
