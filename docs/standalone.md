# Standalone mode

## Overview

Standalone mode runs a complete private Documents workspace on the user's computer. It does not require a separately managed server or a cloud account.

On first launch, Documents downloads the required components, stores them in the application's data area, and starts them in the background. First-time setup downloads approximately 350 MB; the required core components account for about 250 MB.

## First-time setup

When no workspace is configured, choose **Standalone**. Documents then:

1. checks whether the local components are already installed;
2. downloads any missing required components;
3. starts the local workspace;
4. registers it in the workspace switcher.

The application displays **Starting local server…** while this happens.

## Local data

Projects, application state, relationships, search information, and uploaded files are stored on the current machine. The components that run the local workspace are kept separately from the user's project data.

Because this data is local, the user is responsible for the computer's backups, available disk space, and access security.

## Optional AI features

AI processing is not installed by default because it requires a larger download. It adds transcription, summarization, translation, and semantic search.

Two variants are available:

| Variant | Approximate size | Suitability |
|---|---:|---|
| **CPU** | 2 GB | Works on any supported computer. |
| **GPU** | 5 GB | Requires a compatible NVIDIA graphics card and is faster for heavier work. |

Documents checks the computer and suggests the appropriate variant.

Optional features (Canvas, Datasets, Timelines, Knowledge Base, Bibliography, and Relationships) run on the base installation and are off after the first setup. They can be enabled or disabled individually from **Settings → Features**. Changing one restarts the local backend and models service so the new capability takes effect; PostgreSQL keeps running and no project data is affected.

## Starting and stopping

The local workspace starts automatically when it is opened. Required data services start before Documents makes the workspace available.

All local services stop automatically when the application closes. They can also be started or stopped from **Settings → Local Server**.

## Local Server settings

The settings panel provides:

| Control | Meaning |
|---|---|
| Component status | Green means installed; grey means not installed. |
| Download progress | Shows installation progress. |
| Install Local Server | Downloads the required core components. |
| Install AI Features | Downloads the selected CPU or GPU AI package. |
| Uninstall | Removes installed components to recover disk space. |

## Using other workspaces

A standalone workspace behaves like a remote workspace in the rest of the application. It supports the same project features and can coexist with several remote workspaces. Its internal address is managed automatically and does not need to be entered by the user.
