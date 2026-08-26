import type { Page, Route } from '@playwright/test';
import { expect, test } from './fixtures/electron-app';

const NOW = '2026-08-26T12:00:00.000Z';

interface FolderScenario {
  assistantFolder: string | null;
  agentFolder: string | null;
  assistantFiles?: ReturnType<typeof indexedFile>[];
  agentFiles?: ReturnType<typeof indexedFile>[];
  assistantMemory?: unknown[];
  fileContents?: Record<number, string>;
}

function indexedFile(
  id: number,
  filename: string,
  folder: string,
  mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
) {
  return {
    id,
    filename,
    filePath: `${folder}/${filename}`,
    mimeType,
    size: 12_288,
    mtime: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    hasExtractedText: true,
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installFolderApi(page: Page, scenario: FolderScenario) {
  const requests = {
    assistantFiles: 0,
    agentFiles: 0,
    writes: [] as Array<{ pathname: string; body: Record<string, unknown> }>,
  };

  await page.route('**/*', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/status') {
      return fulfillJson(route, { authEnabled: false, features: {} });
    }
    if (request.method() === 'GET' && pathname === '/assistants') {
      return fulfillJson(route, [{
        id: 1,
        name: 'Assistant',
        folderScope: scenario.assistantFolder,
        icon: '◇',
        sub: 'Personal assistant',
        lastSeenAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }]);
    }
    if (request.method() === 'GET' && pathname === '/agents') {
      return fulfillJson(route, [{
        id: 2,
        name: 'Research Agent',
        systemPrompt: 'Research the selected workspace.',
        folderScope: scenario.agentFolder,
        icon: '◆',
        sub: 'Research specialist',
        pinned: true,
        lastSeenAt: null,
        expiresAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }]);
    }
    if (request.method() === 'GET' && pathname === '/assistants/1/messages') {
      return fulfillJson(route, { messages: [], hasMore: false });
    }
    if (request.method() === 'GET' && pathname === '/assistants/1/memory') {
      return fulfillJson(route, scenario.assistantMemory ?? []);
    }
    if (request.method() === 'GET' && pathname === '/agents/2/messages') {
      return fulfillJson(route, { messages: [], hasMore: false });
    }
    if (request.method() === 'GET' && pathname === '/assistants/1/indexed-files') {
      requests.assistantFiles += 1;
      return fulfillJson(route, scenario.assistantFiles ?? []);
    }
    if (request.method() === 'GET' && pathname === '/agents/2/indexed-files') {
      requests.agentFiles += 1;
      return fulfillJson(route, scenario.agentFiles ?? []);
    }

    const contentMatch = pathname.match(
      /^\/(?:assistants\/1|agents\/2)\/indexed-files\/(\d+)\/content$/,
    );
    if (request.method() === 'GET' && contentMatch) {
      const id = Number(contentMatch[1]);
      const file = [...(scenario.assistantFiles ?? []), ...(scenario.agentFiles ?? [])]
        .find((candidate) => candidate.id === id);
      return fulfillJson(route, {
        ok: true,
        indexedFileId: id,
        filename: file?.filename ?? 'unknown.txt',
        content: scenario.fileContents?.[id] ?? '',
        mimeType: file?.mimeType ?? 'text/plain',
        size: scenario.fileContents?.[id]?.length ?? 0,
        mtime: NOW,
      });
    }
    if (
      request.method() === 'POST'
      && (pathname === '/assistants/1/indexed-files' || pathname === '/agents/2/indexed-files')
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      requests.writes.push({ pathname, body });
      return fulfillJson(route, indexedFile(
        100 + requests.writes.length,
        String(body.filename),
        scenario.assistantFolder ?? scenario.agentFolder ?? '/tmp/workspace',
        'text/plain',
      ));
    }

    await route.continue();
  });

  return requests;
}

async function prepareWindow(page: Page) {
  await page.waitForLoadState('domcontentloaded');

  const workspaceModal = page.locator('h2:has-text("Add Workspace")');
  if (await workspaceModal.isVisible().catch(() => false)) {
    await page.fill('input#field-name', 'Folder E2E Workspace');
    await page.fill('input#field-server-url', 'http://localhost:3000');
    await page.click('button[type="submit"]:has-text("Add")');
    await workspaceModal.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByTitle('Assistant (Ctrl+J)')).toBeVisible();
}

async function openAssistant(page: Page) {
  await page.getByTitle('Assistant (Ctrl+J)').click();
  await expect(page.getByRole('heading', { name: 'Assistant', exact: true })).toBeVisible();
}

test('supports an optional assistant folder and an independent agent folder', async ({ electronApp }) => {
  const page = await electronApp.firstWindow();
  await installFolderApi(page, {
    assistantFolder: null,
    agentFolder: '/tmp/agent-workspace',
    agentFiles: [indexedFile(21, 'agent-brief.docx', '/tmp/agent-workspace')],
  });
  await prepareWindow(page);
  await openAssistant(page);

  await page.getByTitle('Working folder files').click();
  await expect(page.getByText('No folder configured', { exact: true })).toBeVisible();

  await page.getByText('Research Agent', { exact: true }).click();
  await expect(page.getByText('/tmp/agent-workspace', { exact: true })).toBeVisible();
  await expect(page.getByText('This agent only has access to its working folder.')).toBeVisible();
  await page.getByTitle('Working folder files').click();
  await expect(page.getByText('agent-brief.docx', { exact: true })).toBeVisible();
});

test('allows the assistant and an agent to share the same physical folder', async ({ electronApp }) => {
  const page = await electronApp.firstWindow();
  const sharedFolder = '/tmp/shared-workspace';
  const sharedFiles = [indexedFile(31, 'shared-plan.docx', sharedFolder)];
  const requests = await installFolderApi(page, {
    assistantFolder: sharedFolder,
    agentFolder: sharedFolder,
    assistantFiles: sharedFiles,
    agentFiles: sharedFiles,
  });
  await prepareWindow(page);
  await openAssistant(page);

  await expect(page.getByText(sharedFolder, { exact: true })).toBeVisible();
  await page.getByTitle('Working folder files').click();
  await expect(page.getByText('shared-plan.docx', { exact: true })).toBeVisible();

  await page.getByText('Research Agent', { exact: true }).click();
  await expect(page.getByText(sharedFolder, { exact: true })).toBeVisible();
  await page.getByTitle('Working folder files').click();
  await expect(page.getByText('shared-plan.docx', { exact: true })).toBeVisible();

  expect(requests.assistantFiles).toBeGreaterThan(0);
  expect(requests.agentFiles).toBeGreaterThan(0);
});

test('creates and edits UTF-8 files in the assistant working folder', async ({ electronApp }) => {
  const page = await electronApp.firstWindow();
  const folder = '/tmp/assistant-workspace';
  const requests = await installFolderApi(page, {
    assistantFolder: folder,
    agentFolder: null,
    assistantFiles: [indexedFile(41, 'settings.json', folder, 'application/json')],
    fileContents: { 41: '{\n  "theme": "light"\n}' },
  });
  await prepareWindow(page);
  await openAssistant(page);
  await page.getByTitle('Working folder files').click();

  await page.getByTitle('Create text file').click();
  await page.getByLabel('Filename').fill('data/config.yaml');
  await page.getByLabel('Content').fill('enabled: true\n');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect.poll(() => requests.writes.length).toBe(1);
  expect(requests.writes[0]).toEqual({
    pathname: '/assistants/1/indexed-files',
    body: {
      filename: 'data/config.yaml',
      content: 'enabled: true\n',
      overwrite: false,
    },
  });

  await page.getByTitle('Edit settings.json').click();
  await expect(page.getByLabel('Content')).toHaveValue('{\n  "theme": "light"\n}');
  await page.getByLabel('Content').fill('{\n  "theme": "dark"\n}');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => requests.writes.length).toBe(2);
  expect(requests.writes[1]).toEqual({
    pathname: '/assistants/1/indexed-files',
    body: {
      filename: 'settings.json',
      content: '{\n  "theme": "dark"\n}',
      overwrite: true,
    },
  });
});

test('shows only governed memory and its consent provenance', async ({ electronApp }) => {
  const page = await electronApp.firstWindow();
  await installFolderApi(page, {
    assistantFolder: null,
    agentFolder: null,
    assistantMemory: [{
      id: '00000000-0000-4000-8000-000000000001',
      assistantId: 1,
      agentId: null,
      name: 'Response style',
      type: 'preference',
      body: 'Prefer concise answers',
      contentHash: `sha256:${'a'.repeat(64)}`,
      sourceKind: 'manual',
      consentStatus: 'granted',
      consentBasis: 'explicit_user_action',
      consentedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    }],
  });
  await prepareWindow(page);
  await openAssistant(page);

  await page.getByTitle('Assistant memory').click();
  await expect(page.getByText('1 memory · selected when relevant')).toBeVisible();
  await expect(page.getByText('Prefer concise answers', { exact: true })).toBeVisible();
  await expect(page.getByText('Added by you · consent granted', { exact: true })).toBeVisible();
});
