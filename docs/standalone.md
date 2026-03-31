# Standalone Mode

## Overview

Standalone mode lets the application run a complete local server directly on the
user's machine — no Docker, no external server, and no cloud account required.
On first launch the app downloads the necessary services automatically (~350 MB),
stores them in the user-data directory, and starts them transparently in the
background.

## First-Launch Setup

When the application starts with no workspace configured, a screen asks how the
user wants to run the app:

- **Standalone** — all services run locally on the machine.
- **Connect to server** — the app connects to an existing Documents server on
  the network.

Selecting **Standalone** immediately:

1. Checks whether the required services are already installed.
2. Downloads them if not (PostgreSQL, Qdrant, Neo4j, and the backend).
3. Starts all services and registers the local workspace automatically.

The setup runs in the background; the app shows a *Starting local server…*
message while it progresses.

## Services and Storage

### Core services (~350 MB, required)

| Service | Role |
|---------|------|
| Backend API | REST API and job orchestration |
| PostgreSQL | Stores documents, projects, and application state |
| Qdrant | Vector index for semantic search |
| Neo4j | Graph database for knowledge relationships |

All binaries are saved under the `standalone-services/` folder inside the
Electron user-data directory. Application data (documents, uploads) is stored in
a separate `local-server/` folder.

### AI features (optional, ~2–5 GB)

The models service provides transcription, summarisation, translation, and
semantic search. It is not installed by default because of its size. Two variants
are available:

- **CPU** (~2 GB) — works on any machine.
- **GPU** (~5 GB) — requires an NVIDIA card; much faster for heavy workloads.

The application checks for a compatible GPU and suggests the right variant
automatically.

## Start-up and Shutdown

Services start in sequence when a local workspace is opened:

1. PostgreSQL starts first (required; the app will not proceed without it).
2. Qdrant and Neo4j start next if they are installed.
3. The backend starts last, once the databases are ready.

All services stop automatically when the application is closed. They can also be
started and stopped manually from **Settings → Local Server**.

## Settings Panel

The **Local Server** section in Settings provides:

| Action | Description |
|--------|-------------|
| Component status | Green dot = installed, grey dot = not installed |
| Download progress | Real-time progress bar during installation |
| Install Local Server | Downloads core services if not yet installed |
| Install AI Features | Downloads the models service (CPU or GPU variant) |
| Uninstall | Removes the services to recover disk space |

## Relationship to the Workspace System

A local workspace created in standalone mode behaves the same as a remote
workspace in every other respect. It appears in the workspace switcher, supports
all features (projects, resources, documents, entities, knowledge base, etc.),
and can be used alongside remote workspaces at the same time.

The local server URL is managed internally by the application and does not need
to be configured manually.
