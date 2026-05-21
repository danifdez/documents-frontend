import apiClient from './api';

/**
 * Registry of confirm-action handlers indexed by `tool.kind` for
 * `pending_confirmation` events. Each handler returns the final summary
 * the card should display once the action is successful.
 */
export interface ConfirmContext {
  assistantId: number;
  payload: Record<string, any>;
}

export interface ConfirmHandler {
  /** Action to execute when the user clicks Confirm. */
  execute: (ctx: ConfirmContext) => Promise<string>;
  /** Summary to display after a successful execution. */
  successSummary?: (ctx: ConfirmContext) => string;
  /** Summary to display after the user cancels. */
  cancelSummary?: (ctx: ConfirmContext) => string;
}

const handlers: Record<string, ConfirmHandler> = {
  folder_delete: {
    async execute({ assistantId, payload }) {
      const id = Number(payload?.indexedFileId);
      if (!id) throw new Error('Missing indexedFileId in payload');
      await apiClient.delete(`/assistants/${assistantId}/indexed-files/${id}`);
      const filename = payload?.filename ? `: ${payload.filename}` : '';
      return `Deleted${filename}`;
    },
    cancelSummary({ payload }) {
      const filename = payload?.filename ? ` ${payload.filename}` : '';
      return `Delete cancelled${filename}`;
    },
  },
  folder_overwrite: {
    async execute({ assistantId, payload }) {
      const filename = String(payload?.filename || '');
      if (!filename) throw new Error('Missing filename in payload');
      const body: Record<string, any> = { filename, overwrite: true };
      // Binary categories (pdf/docx/odt/xlsx) carry contentBase64 because
      // the worker already converted markdown/CSV to bytes. Text files use
      // the plain `content` field.
      if (typeof payload?.contentBase64 === 'string') {
        body.contentBase64 = payload.contentBase64;
      } else {
        body.content = String(payload?.content ?? '');
      }
      await apiClient.post(`/assistants/${assistantId}/indexed-files`, body);
      return `Overwritten: ${filename}`;
    },
    cancelSummary({ payload }) {
      const filename = payload?.filename ? ` ${payload.filename}` : '';
      return `Overwrite cancelled${filename}`;
    },
  },
  task_delete: {
    async execute({ payload }) {
      const id = Number(payload?.taskId);
      if (!id) throw new Error('Missing taskId in payload');
      await apiClient.delete(`/user-tasks/${id}`);
      const title = payload?.title ? `: ${payload.title}` : '';
      return `Deleted${title}`;
    },
    cancelSummary({ payload }) {
      const title = payload?.title ? ` ${payload.title}` : '';
      return `Delete cancelled${title}`;
    },
  },
};

export function getConfirmHandler(kind: string): ConfirmHandler | undefined {
  return handlers[kind];
}
