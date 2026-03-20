# Documents Frontend

The **documents-frontend** is an Electron desktop application built with Vue 3 that provides a rich interface for document management, knowledge extraction, and AI-powered content processing. It features a TipTap-based rich text editor, real-time WebSocket notifications, embedded browser for web content extraction, and an entity management system with multi-language support.

## Tech Stack

- **Desktop:** Electron 38 (Electron Forge)
- **Framework:** Vue 3.5 (Composition API)
- **Language:** TypeScript 5.9
- **Build Tool:** Vite 7
- **State Management:** Pinia 3
- **Routing:** Vue Router 4
- **Rich Text Editor:** TipTap 3.4 (ProseMirror-based)
- **HTTP Client:** Axios 1.12
- **Real-time:** Socket.io-client 4.8
- **Styling:** Tailwind CSS v4
- **Unit Testing:** Vitest 3.2 + Vue Test Utils 2.4
- **E2E Testing:** Playwright 1.55
- **Linting:** ESLint 9 + @typescript-eslint
- **License:** Apache 2.0

## Quick Start

```bash
# With Docker (recommended)
docker compose up frontend

# Without Docker
cd frontend
npm install
npm start
```

See [Getting Started](./getting-started.md) for full setup instructions.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Installation, setup, scripts, and debugging |
| [Architecture](./architecture.md) | Electron process model, Vue app structure, and data flow |
| [Electron Integration](./electron-integration.md) | IPC channels, preload bridge, and embedded browser |
