// @vitest-environment node
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannels, IpcEvents } from '@/ipc/channels';
import type { LocalVoiceStartOptions } from '@/types/voice';
import type {
  CalendarAlarmsBridge, ElectronAPI, FolderScopeBridge, QuickAssistantBridge, ShellOpsBridge, TaskRemindersBridge, VoiceLocalBridge,
} from '@/types/electron';

const ipc = vi.hoisted(() => ({ invoke: vi.fn(), expose: vi.fn() }));
const events = new EventEmitter();
vi.mock('electron', () => ({ contextBridge: { exposeInMainWorld: ipc.expose }, ipcRenderer: {
  invoke: ipc.invoke, on: events.on.bind(events), off: events.off.bind(events),
} }));

interface Bridges {
  electronAPI: ElectronAPI;
  voice: VoiceLocalBridge;
  calendarAlarms: CalendarAlarmsBridge;
  taskReminders: TaskRemindersBridge;
  quickAssistant: QuickAssistantBridge;
  folderScope: FolderScopeBridge;
  shellOps: ShellOpsBridge;
}

async function load() {
  await import('@/preload');
  expect(ipc.expose.mock.calls.map(([name]) => name).sort()).toEqual([
    'calendarAlarms', 'electronAPI', 'folderScope', 'quickAssistant', 'shellOps', 'taskReminders', 'voice',
  ]);
  return Object.fromEntries(ipc.expose.mock.calls) as Bridges;
}

async function assertInvokes(contract: [call: () => unknown, channel: string, ...args: unknown[]][]) {
  for (const [call, channel, ...args] of contract) {
    ipc.invoke.mockClear();
    await call();
    expect(ipc.invoke).toHaveBeenCalledExactlyOnceWith(channel, ...args);
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  events.removeAllListeners();
  ipc.invoke.mockResolvedValue({ ok: true });
});

describe('Electron renderer bridge contract', () => {
  it('forwards document, workspace and application preferences to the corresponding IPC handlers', async () => {
    const { electronAPI: api, folderScope, shellOps } = await load();
    const workspace = { id: 'archive', name: 'Archive', type: 'remote' as const, url: 'https://archive.example' };
    const preferences = { fontSize: 16, theme: 'light' as const };
    const path = '/test/source.pdf';
    await assertInvokes([
      [() => api.uploadDocument('7', path), IpcChannels.document.upload, '7', path],
      [api.openMultipleFileDialog, IpcChannels.document.openMultipleFileDialog],
      [api.getSettings, IpcChannels.settings.get],
      [() => api.setSettings(preferences), IpcChannels.settings.set, preferences],
      [api.getTrayAvailable, IpcChannels.app.trayAvailable],
      [api.getPlatform, IpcChannels.app.getPlatform],
      [api.getWorkspaces, IpcChannels.workspace.list],
      [() => api.addWorkspace(workspace), IpcChannels.workspace.add, workspace],
      [() => api.updateWorkspace(workspace), IpcChannels.workspace.update, workspace],
      [() => api.removeWorkspace('archive'), IpcChannels.workspace.remove, 'archive'],
      [api.getActiveWorkspace, IpcChannels.workspace.getActive],
      [() => api.setActiveWorkspace('archive'), IpcChannels.workspace.setActive, 'archive'],
      [() => api.setDefaultWorkspace(null), IpcChannels.workspace.setDefault, null],
      [api.getDefaultWorkspace, IpcChannels.workspace.getDefault],
      [() => folderScope.pick({ title: 'Working folder' }), IpcChannels.folderScope.pick, { title: 'Working folder' }],
      [() => shellOps.openPath(path), IpcChannels.shell.openPath, path],
      [() => shellOps.showItemInFolder(path), IpcChannels.shell.showItemInFolder, path],
    ]);
  });

  it('routes local server lifecycle and progress messages through the bridge', async () => {
    const { electronAPI: api } = await load();
    const profile = { key: 'cpu', components: ['postgres', 'backend'], features: [] as string[] };
    const features = { datasets: true };
    await assertInvokes([
      [api.standaloneCheckInstalled, IpcChannels.standalone.checkInstalled],
      [api.standaloneIsReady, IpcChannels.standalone.isReady],
      [api.standaloneDetectGpu, IpcChannels.standalone.detectGpu],
      [api.standaloneHardwareReport, IpcChannels.standalone.hardwareReport],
      [api.standaloneDownloadAll, IpcChannels.standalone.downloadAll],
      [api.standaloneUpdateServices, IpcChannels.standalone.updateServices],
      [() => api.standaloneInstallProfile(profile), IpcChannels.standalone.installProfile, profile],
      [() => api.standaloneDownloadComponent('backend'), IpcChannels.standalone.downloadComponent, 'backend'],
      [() => api.standaloneInstallModels('models-cpu'), IpcChannels.standalone.installModels, 'models-cpu'],
      [api.standaloneUninstallServices, IpcChannels.standalone.uninstallServices],
      [api.standaloneUninstallModels, IpcChannels.standalone.uninstallModels],
      [api.standaloneStart, IpcChannels.standalone.start],
      [api.standaloneStop, IpcChannels.standalone.stop],
      [() => api.splashAction('retry'), IpcChannels.app.splashAction, 'retry'],
      [api.standaloneStatus, IpcChannels.standalone.status],
      [api.standaloneGetUrl, IpcChannels.standalone.getUrl],
      [api.standaloneGetPort, IpcChannels.standalone.getPort],
      [() => api.standaloneSetPort(32119), IpcChannels.standalone.setPort, 32119],
      [api.standaloneGetFeatures, IpcChannels.standalone.getFeatures],
      [() => api.standaloneSetFeatures(features), IpcChannels.standalone.setFeatures, features],
    ]);
    const progress = vi.fn();
    api.onStandaloneDownloadProgress(progress);
    const payload = { component: 'backend', downloaded: 5, total: 10, percent: 50 };
    events.emit(IpcEvents.standalone.downloadProgress, { sender: 'private event' }, payload);
    expect(progress).toHaveBeenCalledExactlyOnceWith(payload);
  });

  it('keeps offline reads and writes scoped to the requested workspace and entity', async () => {
    const { electronAPI: api } = await load();
    const record = { id: 7, name: 'Source notes' };
    const stamp = '2026-02-01T09:00:00Z';
    await assertInvokes([
      [() => api.offlinePutItem('ws', 'doc', 7, record, stamp, 'project', 10), IpcChannels.offline.putItem, {
        workspaceId: 'ws', entityType: 'doc', entityId: 7, data: record, syncedAt: stamp, parentType: 'project', parentId: 10,
      }],
      [() => api.offlineGetItem('ws', 'doc', 7), IpcChannels.offline.getItem, 'ws', 'doc', 7],
      [() => api.offlineDeleteItem('ws', 'doc', 7), IpcChannels.offline.deleteItem, 'ws', 'doc', 7],
      [() => api.offlineGetAllItemsByWorkspace('ws'), IpcChannels.offline.getAllItemsByWorkspace, 'ws'],
      [() => api.offlinePutFile('ws', 8, 'YQ==', 'text/plain', 'txt'), IpcChannels.offline.putFile, 'ws', 8, 'YQ==', 'text/plain', 'txt'],
      [() => api.offlineGetFilePath('ws', 8), IpcChannels.offline.getFilePath, 'ws', 8],
      [() => api.offlineDeleteFile('ws', 8), IpcChannels.offline.deleteFile, 'ws', 8],
      [() => api.offlineAddPendingChange('ws', 'doc', 7, 'PATCH', record), IpcChannels.offline.addPendingChange, 'ws', 'doc', 7, 'PATCH', record],
      [() => api.offlineGetPendingChanges('ws'), IpcChannels.offline.getPendingChanges, 'ws'],
      [() => api.offlineCountPendingChanges('ws'), IpcChannels.offline.countPendingChanges, 'ws'],
      [() => api.offlineClearPendingChanges('ws'), IpcChannels.offline.clearPendingChanges, 'ws'],
      [() => api.offlineGetManifest('ws'), IpcChannels.offline.getManifest, 'ws'],
      [() => api.offlineUpdateManifest('ws', ['doc:7'], stamp), IpcChannels.offline.updateManifest, 'ws', ['doc:7'], stamp],
      [() => api.offlineClearAll('ws'), IpcChannels.offline.clearAll, 'ws'],
    ]);
  });

  it('caches voice availability and scopes voice operations by session', async () => {
    ipc.invoke.mockResolvedValueOnce(true);
    const { voice } = await load();
    expect(voice.isLocalAvailable()).toBe(true);
    ipc.invoke.mockRejectedValueOnce(new Error('Engine unavailable'));
    await expect(voice.refreshAvailability()).resolves.toBe(false);
    expect(voice.isLocalAvailable()).toBe(false);

    const body = new Uint8Array([1, 2, 3]).buffer;
    const options: LocalVoiceStartOptions = { capture: {
      requestId: '4d271901-a958-409d-9b2a-a0db25e4abd0', consent: 'granted', purpose: 'evaluation', mediaType: 'audio/wav',
    } };
    await assertInvokes([
      [voice.hasModel, IpcChannels.voice.hasModel],
      [voice.preloadLocal, IpcChannels.voice.preload],
      [() => voice.startLocal(options), IpcChannels.voice.start, options],
      [() => voice.getStatusLocal('audio-7'), IpcChannels.voice.status, 'audio-7'],
      [() => voice.getCaptureLocal('audio-7'), IpcChannels.voice.capture, 'audio-7', false],
      [() => voice.pushChunkLocal('audio-7', body, 2), IpcChannels.voice.chunk, 'audio-7', body, 2],
      [() => voice.stopLocal('audio-7'), IpcChannels.voice.stop, 'audio-7'],
      [() => voice.cancelLocal('audio-7'), IpcChannels.voice.cancel, 'audio-7'],
    ]);
  });

  it('delivers event payloads without exposing the private IPC event and unsubscribes each listener', async () => {
    const { calendarAlarms, taskReminders, quickAssistant, voice } = await load();
    const payload = { sessionId: 'audio-7', text: 'Partial reading', isFinal: false };
    const callbacks = [
      [IpcEvents.calendar.navigate, calendarAlarms.onNavigateToEvent, [81]],
      [IpcEvents.calendar.navigateMissedPanel, calendarAlarms.onNavigateMissedPanel, []],
      [IpcEvents.task.navigate, taskReminders.onNavigateToTask, [42]],
      [IpcEvents.task.navigateMissedPanel, taskReminders.onNavigateMissedTasksPanel, []],
      [IpcEvents.quickAssistant.shown, quickAssistant.onShown, []],
      [IpcEvents.voice.partial, voice.onPartialLocal, [payload]],
      [IpcEvents.voice.error, voice.onErrorLocal, [{ sessionId: 'audio-7', message: 'Device disconnected' }]],
      [IpcEvents.voice.loadingProgress, voice.onLoadingProgress, [{ downloaded: 3, total: 5, percent: 60 }]],
    ] as const;
    for (const [channel, subscribe, args] of callbacks) {
      const callback = vi.fn();
      const off = subscribe(callback);
      events.emit(channel, { sender: 'private event' }, ...args);
      expect(callback).toHaveBeenCalledExactlyOnceWith(...args);
      off();
      events.emit(channel, {}, ...args);
      expect(callback).toHaveBeenCalledTimes(1);
    }
    const alarm = { eventId: 81, occurrenceStart: '2026-01-01', title: 'Library visit', alarmLabel: null as string | null, trackCompletion: true };
    const reminder = { taskId: 42, title: 'Organize notes', reminderAt: '2026-01-01' };
    await assertInvokes([
      [quickAssistant.show, IpcChannels.quickAssistant.show],
      [quickAssistant.hide, IpcChannels.quickAssistant.hide],
      [quickAssistant.toggle, IpcChannels.quickAssistant.toggle],
      [() => calendarAlarms.showAlarmNotification(alarm), IpcChannels.calendar.showAlarm, alarm],
      [() => calendarAlarms.showMissedAggregate({ items: [alarm] }), IpcChannels.calendar.showMissedAggregate, { items: [alarm] }],
      [() => taskReminders.showReminderNotification(reminder), IpcChannels.task.showReminder, reminder],
      [() => taskReminders.showMissedAggregate({ items: [reminder] }), IpcChannels.task.showMissedAggregate, { items: [reminder] }],
    ]);
  });
});
