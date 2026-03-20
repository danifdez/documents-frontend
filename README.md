# documents-frontend

Electron + Vue desktop application for the intelligent document processing system. Allows uploading, viewing, annotating, and processing documents with AI capabilities.

## Tech Stack

- **Desktop**: Electron 38 (Electron Forge)
- **UI**: Vue 3.5, Vue Router, Pinia
- **Build**: Vite 7
- **Styling**: Tailwind CSS v4, PostCSS
- **Editor**: TipTap 3.4 (rich-text)
- **HTTP**: Axios
- **Real-time**: Socket.io-client
- **Local Storage**: electron-store
- **Testing**: Vitest + Playwright

## Features

### Document Management
- Upload documents in multiple formats (PDF, DOC, DOCX, TXT, HTML, images)
- View extracted, translated, and original content
- Organize documents into projects and threads
- Global search with `Ctrl+Shift+F`

### Rich-Text Editor (TipTap)
- Full formatting: headings (h1-h3), tables, links, images, alignment
- **Comments**: yellow highlights with interactive click handling
- **Marks**: orange highlights for bookmarks
- **References**: insertable nodes linking to other documents/entities
- Auto-save with visual indicator
- Auto-generated table of contents

### AI Processing
- Content extraction and normalization
- Automatic summarization
- Multi-language translation
- Language detection
- Named entity extraction (persons, organizations, locations)
- Key point and keyword extraction
- Question answering (RAG)
- Semantic search

### Embedded Browser
- Web navigation within the application
- Extract webpage content as resources
- Isolated sessions per project (`partition: persist:browser-{projectId}`)

### Real-Time Notifications
- WebSocket connection to the backend
- Interactive toasts with direct links to processed resources

### Persistent Settings
- Font size and family
- Paragraph spacing
- Interface language
- Stored in `~/.config/documents-frontend`

## Structure

```
src/
├── main.ts                    # Electron main process
├── preload.ts                 # Electron ↔ Renderer bridge
├── App.vue                    # Root component + WebSocket
├── router/                    # Application routes
├── store/                     # Pinia store (projectStore)
├── pages/                     # Main views
│   ├── Dashboard.vue          # Project listing
│   ├── Project.vue            # Project detail
│   ├── Thread.vue             # Discussion thread
│   ├── Doc.vue                # Document editor
│   ├── Resource.vue           # Resource viewer
│   └── Settings.vue           # Settings
├── components/
│   ├── ui/                    # Reusable components (Button, Card, Modal, etc.)
│   └── editor/                # TipTap editor and custom extensions
├── services/                  # API services (Vue 3 composables)
│   ├── api.ts                 # Base Axios client
│   ├── notifications/         # Socket.io + toasts
│   └── ...                    # projects, documents, comments, marks, etc.
└── composables/               # Reusable hooks (keyboard, notifications, icons)
```

### Custom TipTap Extensions

| Extension | Description |
|-----------|-------------|
| **CommentExtension** | Yellow highlights with `commentId`, click handler |
| **MarkExtension** | Orange highlights with `markId`, click handler |
| **ReferenceExtension** | Reference nodes with `referenceId`, `referenceType` |

## Installation

### With Docker (recommended)

From the repository root:

```bash
docker compose up frontend
```

### Local

```bash
cd frontend
npm install
npm start
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Development with Electron Forge |
| `npm run package` | Package application |
| `npm run make` | Build distribution (Squirrel, ZIP, RPM, DEB) |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Test coverage |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run lint` | Lint with ESLint |

## Testing

### Unit Tests (Vitest)
- Environment: happy-dom
- Automatic cleanup setup in `tests/setup.ts`
- Coverage for UI components, editor, and composables

### End-to-End Tests (Playwright)
- Full workflow: Project → Thread → Document → Editor
- Runs with `xvfb` for headless environment in Docker
- Timeout: 600 seconds
- Screenshots on failure

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | Backend API URL |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Search in document |
| `Ctrl+Shift+F` | Global search |
| `Ctrl+Shift+I` | Open DevTools |
| `Escape` | Close search modal |

## License

Apache License, Version 2.0. See the LICENSE file for details.
