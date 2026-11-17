import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: 'localVoice.e2e.spec.ts', workers: 1, timeout: 30000,
  reporter: 'list', outputDir: process.env.VOICE_SAFETY_OUTPUT, use: { trace: 'off', video: 'off', screenshot: 'off' } });
