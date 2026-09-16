#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const packageDir = path.resolve(process.argv[2] ?? '');
const expectedVersion = process.argv[3];
if (!process.argv[2] || !expectedVersion) {
  throw new Error('Usage: smoke-package.mjs <package-directory> <version>');
}

const resources = path.join(packageDir, 'resources');
await access(resources, constants.R_OK);
const asarPath = path.join(resources, 'app.asar');
await access(asarPath, constants.R_OK);
const require = createRequire(import.meta.url);
const { extractFile } = require('@electron/asar');
const packagedMetadata = JSON.parse(extractFile(asarPath, 'package.json').toString('utf8'));
if (packagedMetadata.version !== expectedVersion) {
  throw new Error(`Packaged Frontend version is ${packagedMetadata.version}; expected ${expectedVersion}`);
}
if (packagedMetadata.productName !== 'Documents') {
  throw new Error(`Unexpected packaged product name: ${packagedMetadata.productName}`);
}
const executableCandidates = ['documents-frontend', 'documents-frontend.exe'];
let found = false;
for (const name of executableCandidates) {
  try {
    await access(path.join(packageDir, name), constants.X_OK);
    found = true;
  } catch {
    // Try the next platform-specific name.
  }
}
if (!found && process.platform !== 'darwin') throw new Error('Packaged Electron executable not found');
console.log(`Verified packaged Frontend ${expectedVersion}`);
