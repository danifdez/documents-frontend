import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

interface QuickAssistantHandlerDeps {
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

/**
 * Renderer-invoked controls for the floating quick assistant window. The
 * window itself lives in `main.ts`; these handlers just expose its lifecycle
 * so the renderer can close it (Esc / close button) without Node access.
 */
export function createQuickAssistantHandlers({
  show,
  hide,
  toggle,
}: QuickAssistantHandlerDeps): IpcHandlerMap {
  return {
    [IpcChannels.quickAssistant.show]: () => {
      show();
      return { ok: true };
    },
    [IpcChannels.quickAssistant.hide]: () => {
      hide();
      return { ok: true };
    },
    [IpcChannels.quickAssistant.toggle]: () => {
      toggle();
      return { ok: true };
    },
  };
}
