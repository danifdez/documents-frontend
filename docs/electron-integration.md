# Electron Integration

## Process Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Main Process                        │
│                   (src/main.ts)                        │
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ Main Window │  │ Browser Win │  │ electron-store│  │
│  │ (Vue App)   │  │ (per project)│  │ (settings)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────────┘  │
│         │                │                             │
│         │      ┌─────────┴─────────┐                   │
│         │      │                   │                   │
│         │  ┌───┴────┐  ┌──────────┴──┐                 │
│         │  │Toolbar │  │ Browser     │                 │
│         │  │View    │  │ View        │                 │
│         │  │(70px)  │  │ (remaining) │                 │
│         │  └────────┘  └─────────────┘                 │
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

### Browser Window

Created per project via `createBrowserWindow(projectId)`:

- **Isolation:** Each project gets a dedicated partition (`persist:browser-{projectId}`) that isolates cookies, storage, and cache
- **Toolbar view:** 70px height at top, loads the `/browser-toolbar` route from the Vue app
- **Browser view:** Remaining height, initially loads `https://github.com/electron/electron`
- **URL forwarding:** `did-navigate` events on the browser view are forwarded to the toolbar view via IPC

Both the toolbar and browser views share the same partition within a project for session consistency.

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
    openExternalBrowser(projectId: string): Promise<void>;
    navigateTo(url: string): Promise<boolean>;
    extractContent(idProject: string): Promise<{ resourceId: string } | { error: string }>;
    uploadDocument(idProject: string, filePath: string): Promise<{ resourceId: string } | { error: string }>;
    openMultipleFileDialog(): Promise<Array<{ path: string; name: string }>>;
    getSettings(): Promise<Settings>;
    setSettings(settings: Settings): Promise<boolean>;
    onUrlChange(callback: (url: string) => void): void;
    onProjectIdChange(callback: (projectId: string) => void): void;
}
```

## IPC Channel Reference

### Invoke/Handle Channels (Renderer → Main, returns a value)

| Channel | Parameters | Return | Description |
|---------|-----------|--------|-------------|
| `open-external-browser` | `projectId: string` | `void` | Opens the embedded browser window for a project |
| `navigate-to` | `url: string` | `boolean` | Navigates the active browser view to a URL |
| `extract-content` | `idProject: string` | `{ resourceId }` or `{ error }` | Extracts current webpage HTML and uploads to backend |
| `upload-document` | `idProject: string, filePath: string` | `{ resourceId }` or `{ error }` | Uploads a file from disk to the backend |
| `open-multiple-file-dialog` | — | `Array<{ path, name }>` | Opens native file picker (multi-select) |
| `settings:get` | — | `Settings` | Reads persisted settings from electron-store |
| `settings:set` | `settings: Settings` | `boolean` | Saves settings to electron-store |

### Event Channels (Main → Renderer, no return)

| Channel | Data | Description |
|---------|------|-------------|
| `url-changed` | `url: string` | Sent to toolbar view when browser navigates to a new URL |
| `project-id` | `projectId: string` | Sent to toolbar view with the current project context |

## Content Extraction Flow

When a user clicks "Extract" in the browser toolbar:

1. `BrowserToolbar` calls `electronAPI.extractContent(projectId)`
2. Main process executes JavaScript in the browser view:
   - `document.documentElement.outerHTML` → full page HTML
   - `document.title` → page title
   - `window.location.href` → page URL
3. Writes HTML to a temporary file in `os.tmpdir()/document-manager/`
4. Creates `FormData` with: `file`, `name` (title), `projectId`, `type` ('webpage'), `url`
5. POSTs to `{API_URL}/resources/upload`
6. Deletes the temporary file
7. Returns `{ resourceId }` to the renderer

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

### Browser Partitions

Each project's embedded browser uses an isolated partition (`persist:browser-{projectId}`). This ensures that:
- Cookies and sessions are not shared between projects
- Local storage is project-scoped
- Cache is separated per project
