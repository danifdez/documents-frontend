import { test, expect } from './fixtures/electron-app';
import * as path from 'path';

test('runtime application icon is available to Electron', async ({ electronApp, window }) => {
  await expect(window.locator('header.app-topbar img').first()).toBeVisible();

  const iconPath = path.join(__dirname, '..', '..', '.vite', 'build', 'assets', 'app-icon.png');
  const icon = await electronApp.evaluate(({ nativeImage }, runtimeIconPath) => {
    const image = nativeImage.createFromPath(runtimeIconPath);
    return { empty: image.isEmpty(), size: image.getSize() };
  }, iconPath);

  expect(icon.empty).toBe(false);
  expect(icon.size.width).toBeGreaterThanOrEqual(256);
  expect(icon.size.height).toBeGreaterThanOrEqual(256);
});
