# Electron Integration

## Process Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Main Process                        │
│                   (src/main.ts)                        │
│                                                        │
│  ┌─────────────┐                   ┌───────────────┐  │
│  │ Main Window │                   │ electron-store│  │
│  │ (Vue App)   │                   │ (settings)    │  │
│  └──────┬──────┘                   └───────────────┘  │
│         │                                              │
└─────────┼──────────────────────────────────────────────┘
          │
    ┌─────┴─────┐
    │  Preload  │  contextBridge.exposeInMainWorld('electronAPI', ...)
    │  Bridge   │
    └─────┬─────┘
          │
┌─────────▼──────────────────────────────────────────────┐
│                  Renderer Process                      │
│              (Vue 3 Application)                       │
│                                                        │
│         window.electronAPI.method()                    │
└────────────────────────────────────────────────────────┘
```

## Main Process (`src/main.ts`)

### Main Window

- Created on `app.whenReady()` with full-screen dimensions (primary display)
- Loads from Vite dev server in development, compiled HTML in production
- Preload script path: `path.join(__dirname, 'preload.js')`

### Settings Store

Uses `electron-store` for persistent settings storage.

| Setting | Type | Default |
|---------|------|---------|
| `fontSize` | number | `16` |
| `fontFamily` | string | `'sans-serif'` |
| `paragraphSpacing` | number | `1.5` |
| `language` | string | `'en'` |

Storage location: OS-specific config directory (e.g., `~/.config/documents-frontend/` on Linux).

## Preload Script (`src/preload.ts`)

Exposes `window.electronAPI` via `contextBridge.exposeInMainWorld`. This is the only interface between the renderer and main processes.

```typescript
interface ElectronAPI {
    uploadDocument(idProject: string, filePath: string): Promise<{ resourceId: string } | { error: string }>;
    openMultipleFileDialog(): Promise<Array<{ path: string; name: string }>>;
    getSettings(): Promise<Settings>;
    setSettings(settings: Settings): Promise<boolean>;
}
```

## IPC Channel Reference

### Invoke/Handle Channels (Renderer → Main, returns a value)

| Channel | Parameters | Return | Description |
|---------|-----------|--------|-------------|
| `upload-document` | `idProject: string, filePath: string` | `{ resourceId }` or `{ error }` | Uploads a file from disk to the backend |
| `open-multiple-file-dialog` | — | `Array<{ path, name }>` | Opens native file picker (multi-select) |
| `settings:get` | — | `Settings` | Reads persisted settings from electron-store |
| `settings:set` | `settings: Settings` | `boolean` | Saves settings to electron-store |

## File Upload Flow

When a user imports files via the Project page:

1. `ImportDocumentModal` calls `electronAPI.openMultipleFileDialog()`
2. Main process opens native file picker with filters:
   - Allowed extensions: `pdf, doc, docx, txt, htm, html, jpg, jpeg, png, gif, bmp, svg, webp`
   - Multi-selection enabled
3. For each selected file, calls `electronAPI.uploadDocument(projectId, filePath)`
4. Main process reads the file, creates `FormData` with: `file`, `name` (filename), `projectId`
5. POSTs to `{API_URL}/resources/upload`
6. Returns `{ resourceId }` for each file

## Security Configuration

### Context Isolation

All windows and views are created with:
- `contextIsolation: true` — renderer cannot access Node.js APIs directly
- `nodeIntegration: false` — no `require()` or Node.js globals in renderer

### Electron Fuses (`forge.config.ts`)

Fuses are set at package time and cannot be changed at runtime:

| Fuse | Value | Effect |
|------|-------|--------|
| `RunAsNode` | `false` | Prevents using the app binary as a Node.js runtime |
| `EnableCookieEncryption` | `true` | Encrypts cookies on disk |
| `EnableNodeOptionsEnvironmentVariable` | `false` | Ignores `NODE_OPTIONS` env var |
| `EnableNodeCliInspectArguments` | `false` | Disables `--inspect` debugging flags |
| `EnableEmbeddedAsarIntegrityValidation` | `true` | Validates ASAR archive integrity |
| `OnlyLoadAppFromAsar` | `true` | Only loads application code from ASAR |

