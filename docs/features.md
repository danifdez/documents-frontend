# Features

## Projects

Everything in Documents is organized around **projects**. A project groups its resources, editable documents, threads, knowledge entries, notes, timelines, canvases, datasets, bibliography, calendar, and entities. From the dashboard, users can create, open, and delete projects.

## Resources and documents

### Importing files

Users can import one or several PDF, Word, plain-text, HTML, or image files from the Project page. The files are added to the active project and processed in the background.

### Reading and editing

Processed documents can show three views:

| View | Content |
|---|---|
| **Raw** | The original extracted text. |
| **Translated** | The machine-translated version, after translation has completed. |
| **Summary** | The AI-generated summary, after summarization has completed. |

Editable content saves automatically one second after the last change. A **Saving…** or **Saved** indicator shows its status.

The resource view brings together metadata such as type, source address, language, and creation date with related documents, highlights, comments, and extracted entities.

## AI-assisted actions

Available actions depend on the installation and the user's permissions.

| Action | Result |
|---|---|
| **Extraction** | Identifies entities such as people, places, organizations, and dates, plus structured references. |
| **Summarization** | Produces a concise summary of the document. |
| **Translation** | Translates document text to the language selected in Settings. |
| **Search** | Finds semantically similar passages across the current project's indexed content. |

These actions run in the background. Notifications in the header report completion or failure without requiring the user to leave the current page.

## Entities

Extracted entities first appear as pending candidates. Users can edit a candidate's value or type, discard it, merge duplicates, or confirm several candidates together. Accepted candidates move to the project's confirmed entity list.

## Knowledge base

The Knowledge Base is a curated collection of entries backed by project resources or external references. Users can create entries manually or from extracted content, edit their body with rich text, add tags, and link supporting sources.

## Threads

Threads are project discussion spaces with ordered messages. They are useful for preserving research questions, reasoning, and decisions alongside the supporting material.

## Bibliography

Bibliography entries use familiar citation information such as title, author, year, publisher, DOI, and URL. Users can add entries manually, and references can also be linked when a resource is imported from a URL.

## Notes

Notes are free-form project documents for annotations, summaries, and research notes. They remain independent from imported resources.

## Timeline and calendar

The Timeline places dated events on a chronological axis. The Calendar shows project events in a monthly view. Events can be entered manually or extracted from document content.

## Canvas

The Canvas is a free-form visual workspace. Users can place documents, notes, entities, text boxes, and images as cards, then draw connections between them. Images can come from a URL, a local file, or the project's resources.

## Datasets

Datasets hold structured information in named columns and rows. They can be populated manually or from extracted entities, analyzed with statistical and visualization tools, and exported for other uses.

## Search

Global search opens with **Ctrl+K** or the search icon. It searches resources, editable documents, knowledge entries, and entities in the current project. Results are grouped by type and open the relevant item directly.

## Settings and themes

Settings include font size, font family, paragraph spacing, interface language, appearance, and the active theme. The selected language is also used as the target for translation actions.

Documents includes a Default theme and supports additional themes installed from local `.json` or `.zip` files. See [Themes](./themes.md).

## User management

Administrators can view registered users, roles, and active sessions. Roles and permissions control sensitive actions such as deletion, upload, export, and AI processing.

## Offline mode

Offline mode disables requests to the connected server. The header shows whether the application is connected, providing clear feedback when the workspace is unavailable.
