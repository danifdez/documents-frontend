# Documents Frontend

> **WARNING:** This project is in ALPHA — features are experimental and may change without notice. Use at your own risk.

## What Is This?

**Documents Frontend** is an Electron desktop application for researchers, writers, and knowledge workers who need to collect, process, and connect large amounts of documents and information. It provides a single workspace where you can import documents from disk or the web, run AI-powered processing jobs (extraction, summarization, translation), and organize everything into projects, knowledge entries, threads, timelines, and canvases.

Under the hood, the app talks to a [NestJS backend](../backend/README.md) (document storage, jobs, users) and a [Python models service](../models/README.md) (NLP, embeddings, AI processing). All three services are run together through Docker Compose.

## Key Features

### Document & Resource Management

- Import documents from disk (PDF, Word, TXT, HTML, audio, video, images) or extract directly from web pages using the built-in browser
- View, annotate, and organize documents across multiple projects
- Add comments and marks to specific parts of a document
- Full-text and semantic search across all your content

### AI Processing Jobs

- **Extraction** — extract structured entities, topics, and references from a document
- **Transcription** — automatically transcribe speech from audio and video files using Whisper AI
- **Summarization** — generate concise summaries of long documents
- **Translation** — translate document content to other languages
- **Image generation** — create and edit images from text prompts using local AI models, directly from the canvas
- Real-time job status notifications via WebSocket

### Knowledge & Research Tools

- **Knowledge Base** — curate and link knowledge entries backed by source documents
- **Entities** — review, merge, and confirm extracted entities (two-phase workflow)
- **Bibliography** — manage and export bibliographic references
- **Threads** — discussion threads linked to documents or projects
- **Timeline** — plot events and milestones from extracted data
- **Canvas** — free-form visual workspace for arranging and connecting ideas, with AI-powered image generation and editing using local Stable Diffusion models
- **Datasets** — create and manage structured datasets from your documents

### Workspace & Collaboration

- Multi-project workspace with a collapsible sidebar
- User management and role-based access control
- Configurable editor settings (font, spacing, language) stored locally via `electron-store`
- Offline mode with sync indicator

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 38 (Electron Forge) |
| UI Framework | Vue 3.5 (Composition API) + TypeScript 5.9 |
| Build tool | Vite 7 |
| State management | Pinia 3 |
| Routing | Vue Router 4 |
| Rich text editor | TipTap 3.4 (ProseMirror) |
| HTTP client | Axios 1.12 |
| Real-time | Socket.io-client 4.8 |
| Styling | Tailwind CSS v4 |
| Unit tests | Vitest 3.2 + Vue Test Utils 2.4 |
| E2E tests | Playwright 1.55 |

## Quick Start

```bash
cd frontend
npm install
npm start
```

See [Getting Started](docs/getting-started.md) for full setup, environment variables, and debugging tips.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, setup, available scripts, build configuration, and debugging |
| [Features](docs/features.md) | Detailed walkthrough of all application features and pages |
| [Architecture](docs/architecture.md) | Electron process model, Vue app structure, and key design patterns |
| [Electron Integration](docs/electron-integration.md) | IPC channels, preload bridge, file upload flow, and security configuration |

## Building Distributables

### Linux

Produces `.deb` and `.rpm` packages.

**Prerequisites:**

```bash
sudo apt-get install -y rpm   # required for RPM builds
```

**Build:**

```bash
npm run make
```

Output is placed in `out/make/`.

### Windows

Uses `@electron-forge/maker-squirrel` to produce a `.exe` installer. **Cross-compilation from Linux is not supported** — build on Windows or use CI/CD.

```powershell
npm install
npm run make
```

### macOS

Uses `@electron-forge/maker-zip` to produce a `.zip` archive. **Cross-compilation from Linux is not supported** — build on macOS or use CI/CD.

```bash
npm install
npm run make
```

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
