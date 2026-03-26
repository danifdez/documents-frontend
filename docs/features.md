# Features

## Projects

Everything in the application is organized around **projects**. A project is a self-contained workspace that groups resources, documents, threads, knowledge entries, notes, timelines, canvases, and datasets together.

From the Dashboard you can create, open, and delete projects. Switching projects reloads the sidebar and all related data. The active project is stored in the Pinia `projectStore` and is accessible throughout the app.

## Document & Resource Management

### Importing Documents

Documents can be imported into a project in two ways:

- **From disk** — Open the `ImportDocumentModal` via the Project page, pick one or more files (PDF, Word, TXT, HTML, images). The Electron main process reads the selected files and uploads them to the backend via `POST /resources/upload`.
- **From the web** — Use the built-in browser (see [Embedded Browser](#embedded-browser)) to navigate to a page and click **Extract**. The main process captures the full page HTML, writes it to a temporary file, and uploads it as a `webpage` resource.

Supported file types: `pdf`, `doc`, `docx`, `txt`, `htm`, `html`, `jpg`, `jpeg`, `png`, `gif`, `bmp`, `svg`, `webp`.

### Viewing Documents

The `Doc` page (`/projects/:projectId/docs/:docId`) displays a resource's content using a TipTap-based rich text editor. Three content views are available:

| Tab | Description |
|-----|-------------|
| Raw | Original extracted text |
| Translated | Machine-translated version (if translation job has run) |
| Summary | AI-generated summary (if summarization job has run) |

Document content auto-saves 1 second after the last keystroke. A visual indicator shows `Saving…` / `Saved` states.

### Resource Page

The `Resource` page (`/projects/:projectId/resources/:resourceId`) shows the resource metadata (type, URL, language, creation date) alongside its linked documents, marks, comments, and extracted entities.

## AI Processing Jobs

Processing is triggered per-resource or per-project from the interface. Jobs run asynchronously in the models service and results appear via real-time WebSocket notifications.

| Job | What it does |
|-----|-------------|
| **Extraction** | Identifies entities (people, places, organisations, dates) and structured references |
| **Summarization** | Produces a concise summary stored in the document's `summary` field |
| **Translation** | Translates document text to the configured target language |
| **Search** | Runs semantic similarity search across the project's documents |

### Real-time Notifications

The `useNotification` composable connects to the backend Socket.io server. Incoming events update a notification list that appears in the header, letting users see when a job completes or fails without leaving their current page.

## Entities

The Entities page (`/projects/:projectId/entities`) shows all entities extracted from a project's documents. Entity management follows a two-phase workflow:

1. **Pending phase** — After an extraction job, newly found entities appear in the `PendingEntitiesValidator` panel. Each entity shows its type, value, and source document. You can edit the value, change the type, or discard it.
2. **Confirmation phase** — Accepted entities are promoted to the confirmed list. Duplicates can be merged. Bulk-confirm all pending entities at once with a single action.

Entity types are configurable and backed by the `resource-type.csv` seed data in the backend.

## Knowledge Base

The Knowledge Base (`/projects/:projectId/knowledge`) is a structured collection of curated entries, each backed by source documents or external references. Entries can be created manually or generated from extracted content.

The `KnowledgeEntryEdit` page provides a rich-text editor for the entry body, a references panel for linking source documents, and a tags field for categorisation.

## Threads

Threads (`/projects/:projectId/threads/:threadId`) are discussion spaces linked to a project. Each thread contains an ordered list of messages. Threads are useful for capturing the reasoning and decisions made during research.

## Bibliography

The Bibliography page (`/projects/:projectId/bibliography`) lists bibliographic references associated with the project. Entries follow standard citation fields (title, author, year, publisher, DOI, URL). References can be added manually or linked automatically when a resource is imported from a URL.

## Notes

Notes (`/projects/:projectId/notes`) are free-form Markdown documents scoped to a project. The `NoteEdit` page provides a TipTap editor. Notes are independent of resources — they are intended for personal annotations, summaries, and research notes.

## Timeline

The Timeline page (`/projects/:projectId/timeline`) plots dated events extracted from documents or added manually onto a chronological axis. This is useful for projects that deal with historical material or event sequences.

## Canvas

The Canvas (`/projects/:projectId/canvas`) is a free-form visual workspace. You can place documents, notes, entities, and free-text boxes as cards and draw connections between them. It is intended for visual thinking and mapping relationships between pieces of information.

### AI Image Generation

The canvas includes a dedicated AI Image panel (toggled via the sparkles button in the toolbar) for generating and editing images using local Stable Diffusion models. The panel has three tabs:

| Tab | Description |
|-----|-------------|
| **Generate** | Create new images from a text prompt. Configure size, inference steps, guidance scale, and seed. Generated images appear as a preview and can be added to the canvas as image nodes. |
| **Edit** | Select an existing image node on the canvas to modify it with AI. Provide an edit prompt and adjust the strength slider (how much the image changes). The result can replace the original node or be added as a new one. |
| **History** | Grid of all previously generated images for this canvas (persisted in localStorage). Click any image to add it to the canvas. |

Generated and edited images are stored as project resources (`type: image`, `mimeType: image/png`), so they appear in the project's resource list and can be reused in other canvases or documents.

The feature communicates with the backend via `POST /model/image-generate` and `POST /model/image-edit`, using WebSocket events (`imageGenerateResponse`, `imageEditResponse`) for real-time completion notifications.

## Datasets

The Datasets pages (`/projects/:projectId/datasets`) allow you to define and populate structured datasets derived from your documents. Each dataset has named columns and rows that can be populated manually or from extracted entities. Datasets can be exported for use in downstream analysis.

## Calendar

The Calendar (`/projects/:projectId/calendar`) displays events associated with the project in a monthly view. Events can be created manually or extracted from document content.

## Embedded Browser

The Browser page (`/projects/:projectId/browser`) opens an embedded Chromium window inside the Electron shell via `WebContentsView`. Each project gets its own isolated browser session (cookies, storage, and cache are partitioned by project ID).

The **toolbar** (a separate `BrowserToolbar` route running inside the browser window) shows the current URL and exposes two actions:

- **Navigate** — type a URL and press Enter to load it
- **Extract** — capture the current page HTML and upload it as a new resource in the active project (see [Importing Documents](#importing-documents))

## Search

The `GlobalSearchModal` (opened with `Ctrl+K` or the search icon) queries the backend full-text search endpoint across all resources, documents, knowledge entries, and entities in the current project. Results are grouped by type and link directly to the relevant page.

## Settings

The Settings page exposes editor preferences that are persisted locally via `electron-store`:

| Setting | Options |
|---------|---------|
| Font size | Adjustable via slider |
| Font family | `sans-serif`, `serif`, `monospace` |
| Paragraph spacing | Adjustable via slider |
| Language | Interface language (affects translation jobs) |

Settings are read and written through the `settings:get` / `settings:set` IPC channels.

## User Management

The User Management page (accessible to administrators) lists all registered users, their roles, and active sessions. Roles control access to sensitive operations such as bulk deletion and job triggering.

## Offline Mode

The `OfflineToggle` component and `offlineStore` allow the app to be placed in offline mode, disabling all API calls. The `SyncIndicator` in the header shows whether the app is connected to the backend, providing feedback when the backend is temporarily unavailable.
