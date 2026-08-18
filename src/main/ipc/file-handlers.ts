import { BrowserWindow, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.html': 'text/html', '.htm': 'text/html',
  '.txt': 'text/plain', '.md': 'text/plain', '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp', '.tiff': 'image/tiff', '.tif': 'image/tiff',
  '.json': 'application/json', '.xml': 'application/xml',
  '.eml': 'message/rfc822',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma', '.opus': 'audio/opus',
  '.aiff': 'audio/aiff', '.aif': 'audio/aiff',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.webm': 'video/webm', '.wmv': 'video/x-ms-wmv',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

interface FileHandlerDeps {
  getApiUrl: () => string;
  getMainWindow: () => BrowserWindow | null;
}

export function createFileHandlers({ getApiUrl, getMainWindow }: FileHandlerDeps): IpcHandlerMap {
  return {
    [IpcChannels.document.upload]: async (_, idProject, filePath) => {
      try {
        if (!filePath) {
          return { error: "No file path provided" };
        }

        // Create a form data object for the file
        const formData = new FormData();
        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);
        const mimeType = getMimeType(filePath);

        formData.append('file', fileStream, { filename: fileName, contentType: mimeType });
        formData.append('name', fileName);
        if (idProject) {
          formData.append('projectId', idProject);
        }

        const uploadResponse = await axios.post(`${getApiUrl()}/resources/upload`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        });

        return {
          resourceId: uploadResponse.data.resourceId,
        };
      } catch (error) {
        return { error: `Failed to process document: ${error.message}` };
      }
    },

    [IpcChannels.shell.openPath]: async (_event, targetPath: string) => {
      if (!targetPath || typeof targetPath !== 'string') {
        return { ok: false, error: 'invalid_path' };
      }
      try {
        const err = await shell.openPath(targetPath);
        if (err) return { ok: false, error: err };
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message ?? 'open_path_failed' };
      }
    },

    [IpcChannels.shell.showItemInFolder]: (_event, targetPath: string) => {
      if (!targetPath || typeof targetPath !== 'string') {
        return { ok: false };
      }
      try {
        shell.showItemInFolder(targetPath);
        return { ok: true };
      } catch {
        return { ok: false };
      }
    },

    [IpcChannels.folderScope.pick]: async (_event, opts?: { title?: string }) => {
      const win = BrowserWindow.getFocusedWindow() ?? getMainWindow() ?? undefined;
      console.log('[folder-scope] picker opened');
      const result = win
        ? await dialog.showOpenDialog(win, {
          properties: ['openDirectory', 'createDirectory'],
          title: opts?.title ?? 'Pick the working folder',
        })
        : await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: opts?.title ?? 'Pick the working folder',
        });

      if (result.canceled || result.filePaths.length === 0) {
        console.log('[folder-scope] picker cancelled');
        return null;
      }

      console.log('[folder-scope] picker confirmed');
      return result.filePaths[0];
    },

    [IpcChannels.document.openMultipleFileDialog]: async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'All Supported Files', extensions: ['pdf', 'doc', 'docx', 'odt', 'txt', 'htm', 'html', 'eml', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'] },
          { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'odt', 'txt', 'htm', 'html', 'eml'] },
          { name: 'Video', extensions: ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'wmv'] },
          { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return [];
      }

      return result.filePaths.map(filePath => ({
        path: filePath,
        name: path.basename(filePath)
      }));
    },
  };
}
