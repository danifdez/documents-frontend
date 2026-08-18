import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { IpcChannel } from '../../ipc/channels';

export type IpcInvokeHandler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;

/** Declarative channel → handler map. Keys are constrained to known channels. */
export type IpcHandlerMap = Partial<Record<IpcChannel, IpcInvokeHandler>>;

/** Registers every entry in insertion order, mirroring inline `ipcMain.handle` calls. */
export function registerIpcHandlers(handlers: IpcHandlerMap): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    if (!handler) continue;
    ipcMain.handle(channel, handler);
  }
}
