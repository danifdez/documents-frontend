# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron Application                     │
│                                                                 │
│  ┌──────────────────┐    IPC     ┌────────────────────────────┐ │
│  │   Main Process   │◄─────────►│     Renderer Process       │ │
│  │   (src/main.ts)  │  Preload   │     (Vue 3 Application)    │ │
│  │                  │  Bridge    │                            │ │
│  │  - Window mgmt   │           │  - Pages & Components      │ │
│  │  - File dialogs  │           │  - TipTap Editor           │ │
│  │  - Settings store│           │  - State Management        │ │
│  │  - Browser views │           │  - Service Composables     │ │
│  └──────────────────┘           └─────────┬──────────────────┘ │
│                                           │                     │
└───────────────────────────────────────────┼─────────────────────┘
                                            │
                              HTTP (Axios)   │  WebSocket (Socket.io)
                                            │
                                 ┌──────────▼──────────┐
                                 │    Backend API       │
                                 │  (NestJS on :3000)   │
                                 └─────────────────────┘
```

## Electron Process Model

### Main Process (`src/main.ts`)

The main process handles system-level operations:

- **Window creation** — Full-screen `BrowserWindow` using primary display dimensions
- **IPC handlers** — Registers handlers for file dialogs, settings, browser management, and file uploads
- **Browser window** — Creates per-project embedded browser with `WebContentsView` (toolbar + browser content)
- **Settings persistence** — Uses `electron-store` for user preferences (font, spacing, language)

### Preload Script (`src/preload.ts`)

The preload script bridges main and renderer processes via `contextBridge.exposeInMainWorld`:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
    openExternalBrowser: (projectId) => ipcRenderer.invoke('open-external-browser', projectId),
    navigateTo: (url) => ipcRenderer.invoke('navigate-to', url),
    extractContent: (idProject) => ipcRenderer.invoke('extract-content', idProject),
    uploadDocument: (idProject, filePath) => ipcRenderer.invoke('upload-document', idProject, filePath),
    openMultipleFileDialog: () => ipcRenderer.invoke('open-multiple-file-dialog'),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
    // Event listeners
    onUrlChange: (callback) => ipcRenderer.on('url-changed', (_event, url) => callback(url)),
    onProjectIdChange: (callback) => ipcRenderer.on('project-id', (_event, projectId) => callback(projectId)),
});
```

## Key Design Patterns

### Composable-Based Services

Each backend domain has a dedicated composable (e.g., `useProject`, `useDocument`) that encapsulates API calls and returns reactive `isLoading`, `error`, and data refs. This isolates HTTP logic from components.

### Auto-Save with Debounce

The document editor uses a 1-second debounce for auto-saving. Visual indicators (`isSaving`, `savedSuccessfully`) provide feedback without interrupting the editing flow.

### Two-Phase Entity Workflow

Entity extraction follows a two-phase pattern:
1. **Pending phase** — Backend extracts entities; `PendingEntitiesValidator` displays them for human review
2. **Confirmation phase** — User reviews, edits, merges duplicates, then bulk-confirms entities

### Collapsible Sidebar

The sidebar collapses to icon-only mode. `ResourceSidebar` and `DocumentSidebar` update reactively based on the `currentProject` in the Pinia store.

### Modal-Driven Interactions

Most create/edit operations use modal dialogs (e.g., `ProjectAddModal`, `CommentModal`, `ImportDocumentModal`) that emit events on completion, keeping page components focused on display logic.
