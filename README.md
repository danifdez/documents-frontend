# Document frontend

## Overview

This application enables users to upload, view, and manage documents, trigger processing jobs such as extraction, summarization, translation, and search, and receive real-time notifications about job status and results. It serves as the main user interface for interacting with the document processing system, supporting workflows like document ingestion, language detection, and resource management. The app integrates with backend and processing services to provide seamless access to document-related features and updates.

## Features

- Upload and import documents in various formats
- View, organize, and manage documents, projects, and threads
- Document processing jobs: extraction, summarization, translation, and search
- Display extracted, translated, and raw document content
- Add, edit, and manage comments and marks on documents
- Real-time notifications for job status and results
- Search across documents, resources, and projects
- Manage resources and metadata

## Installation

1. Clone the repository and navigate to the `frontend` directory:

   ```bash
   git clone <repo-url>
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the application in development mode:

   ```bash
   npm start
   ```

4. To build a production package:
   ```bash
   npm run make
   ```

## License

This project is licensed under the Apache License, Version 2.0. See the LICENSE file for details.
