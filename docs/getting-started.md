# Getting Started

## Prerequisites

- **Node.js** 22+ and npm
- **Docker** and Docker Compose (for running the backend)
- Backend API running on `http://localhost:3000` (see [backend docs](../../backend/docs/getting-started.md))

## Setup with Docker (Recommended)

```bash
docker compose up frontend
```

This builds and runs the Electron application inside a container with all dependencies pre-installed.

## Setup Without Docker

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy the sample environment file and adjust if needed:

```bash
cp .env.sample .env
```

### 3. Start Development

```bash
npm start
```

This runs `electron-forge start`, which launches Vite dev servers for the main process, preload script, and renderer, then opens the Electron window.

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `electron-forge start` | Start development with hot-reload |
| `package` | `electron-forge package` | Package the application |
| `make` | `electron-forge make` | Build distribution packages |
| `lint` | `eslint --ext .ts,.tsx .` | Run ESLint |
| `test` | `vitest run` | Run unit tests once |
| `test:watch` | `vitest` | Run unit tests in watch mode |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |
| `test:e2e` | `playwright test e2e/` | Run Playwright end-to-end tests |

## Build Configuration

### Electron Forge

The build is configured in `forge.config.ts` with three Vite build targets:

| Target | Entry | Config File | Description |
|--------|-------|-------------|-------------|
| main | `src/main.ts` | `vite.main.config.ts` | Electron main process |
| preload | `src/preload.ts` | `vite.preload.config.ts` | Preload script (IPC bridge) |
| renderer | — | `vite.renderer.config.ts` | Vue application (renderer process) |

### Distribution Makers

| Maker | Platform |
|-------|----------|
| Squirrel | Windows |
| ZIP | macOS |
| RPM | Linux (Red Hat) |
| DEB | Linux (Debian) |

### Security Fuses

Electron fuses are configured at package time in `forge.config.ts`:

- `RunAsNode` — disabled
- `EnableCookieEncryption` — enabled
- `EnableNodeOptionsEnvironmentVariable` — disabled
- `EnableNodeCliInspectArguments` — disabled
- `EnableEmbeddedAsarIntegrityValidation` — enabled
- `OnlyLoadAppFromAsar` — enabled

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | Backend API base URL |

Environment variables prefixed with `VITE_` are exposed to the renderer process via `import.meta.env`.

## Debugging

### DevTools

- **Renderer process:** Press `Ctrl+Shift+I` to open Chrome DevTools in the application window.
- **Main process:** Uncomment `mainWindow.webContents.openDevTools()` in `src/main.ts` (line 42).
- **Browser view:** Uncomment `browserView.webContents.openDevTools()` in `src/main.ts` (line 87).

### Common Issues

- **Blank screen on start:** Ensure the backend is running on the configured `VITE_API_URL`.
- **IPC errors:** Check that the preload script is loaded correctly (verify the `preload` path in `createWindow`).
- **Build failures:** Run `npm install` to ensure all dependencies are up to date.
