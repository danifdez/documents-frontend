# How the desktop application works

The Documents desktop application is the place where users open workspaces, organize projects, read and edit material, and start searches or background processing.

## Workspaces and projects

A **workspace** is a connection to one Documents installation. It can be local to the computer or hosted on another server. Workspaces keep their own server address, sign-in session, and locally saved state. Switching workspaces also switches the projects and information available in the application.

A **project** is the main container inside a workspace. Resources, documents, notes, threads, entities, calendars, timelines, canvases, datasets, bibliography, and knowledge entries all remain associated with their project.

## Working with files

The desktop application uses the operating system's file picker to import one or several files. It sends the selected files to the current workspace, where they are stored and processed. The application never needs unrestricted access to the user's file system.

After import, the original resource and its processed content can be opened from the project. Depending on the format and available capabilities, Documents can also extract metadata, create a transcript, or prepare the content for AI-assisted actions.

## Editing and saving

Editable content saves automatically one second after the last change. A visible status indicates when saving is in progress and when it has completed.

Most create and edit actions open focused dialogs, while project navigation remains available from the collapsible sidebar.

## Review before confirmation

Extracted entities are not added directly to the confirmed project knowledge. They first appear as candidates, where users can correct the value or type, discard an item, merge duplicates, or accept several candidates together.

## Background actions

Longer actions run outside the current screen. Real-time notifications report when they complete or fail, allowing the user to continue reading, editing, or navigating in the meantime.

## Local preferences

Editor appearance, language, and other personal preferences are saved on the current computer. Workspace content remains on the local or remote Documents installation to which the application is connected.
