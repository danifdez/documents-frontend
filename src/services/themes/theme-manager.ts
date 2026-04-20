import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import {
  ThemeManifest,
  validateManifest,
  validateCustomCss,
} from './theme-schema';
import defaultThemeManifest from '../../themes/default/theme.json';

const DEFAULT_THEME_ID = 'default';
const FONT_EXT_WHITELIST = new Set(['.woff', '.woff2', '.ttf', '.otf']);

export interface InstalledTheme {
  manifest: ThemeManifest;
  path: string;
  builtIn: boolean;
}

function themesRoot(): string {
  return path.join(app.getPath('userData'), 'themes');
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

export function bootstrapBuiltInThemes(): void {
  ensureDir(themesRoot());
  const targetDir = path.join(themesRoot(), DEFAULT_THEME_ID);
  const targetManifest = path.join(targetDir, 'theme.json');
  try {
    const src = defaultThemeManifest as { version?: string };
    if (fs.existsSync(targetManifest)) {
      const tgt = readJson(targetManifest) as { version?: string };
      if ((tgt.version || '') === (src.version || '')) return;
    }
    ensureDir(targetDir);
    fs.writeFileSync(
      targetManifest,
      JSON.stringify(defaultThemeManifest, null, 2),
      'utf8',
    );
  } catch (err) {
    console.error('[theme-manager] bootstrap failed:', err);
  }
}

function rmDir(p: string) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

export function listThemes(): InstalledTheme[] {
  ensureDir(themesRoot());
  const root = themesRoot();
  const out: InstalledTheme[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const manifestPath = path.join(dir, 'theme.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const result = validateManifest(readJson(manifestPath));
      if (!result.valid || !result.sanitized) continue;
      out.push({
        manifest: result.sanitized,
        path: dir,
        builtIn: result.sanitized.id === DEFAULT_THEME_ID,
      });
    } catch (err) {
      console.warn(`[theme-manager] skipping invalid theme at ${dir}:`, err);
    }
  }
  return out;
}

export async function installFromDialog(): Promise<
  { success: true; theme: InstalledTheme } | { success: false; error: string }
> {
  const result = await dialog.showOpenDialog({
    title: 'Install theme',
    properties: ['openFile'],
    filters: [{ name: 'Theme', extensions: ['json', 'zip'] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'cancelled' };
  }
  return installFromFile(result.filePaths[0]);
}

export function installFromFile(
  filePath: string,
): { success: true; theme: InstalledTheme } | { success: false; error: string } {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.json') return installFromJson(filePath);
    if (ext === '.zip') return installFromZip(filePath);
    return { success: false, error: `Unsupported extension: ${ext}` };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

function installFromJson(filePath: string) {
  const raw = readJson(filePath);
  const validation = validateManifest(raw);
  if (!validation.valid || !validation.sanitized) {
    return { success: false as const, error: validation.errors.join('; ') };
  }
  const manifest = validation.sanitized;
  if (manifest.id === DEFAULT_THEME_ID) {
    return { success: false as const, error: 'Cannot overwrite the built-in "default" theme' };
  }
  if (manifest.customCss && manifest.customCss.endsWith('.css')) {
    return { success: false as const, error: 'customCss refers to a file, but no .zip was provided' };
  }
  if (manifest.typography?.fontFaces?.length) {
    return { success: false as const, error: 'Themes with custom fonts must be packaged as .zip' };
  }
  if (manifest.customCss && !validateCustomCss(manifest.customCss).valid) {
    return { success: false as const, error: validateCustomCss(manifest.customCss).error! };
  }

  const targetDir = path.join(themesRoot(), manifest.id);
  rmDir(targetDir);
  ensureDir(targetDir);
  fs.writeFileSync(path.join(targetDir, 'theme.json'), JSON.stringify(manifest, null, 2), 'utf8');

  return {
    success: true as const,
    theme: { manifest, path: targetDir, builtIn: false },
  };
}

function installFromZip(filePath: string) {
  const zip = new AdmZip(filePath);
  const manifestEntry = zip.getEntry('theme.json');
  if (!manifestEntry) {
    return { success: false as const, error: 'theme.json not found at the zip root' };
  }
  const raw = JSON.parse(manifestEntry.getData().toString('utf8'));
  const validation = validateManifest(raw);
  if (!validation.valid || !validation.sanitized) {
    return { success: false as const, error: validation.errors.join('; ') };
  }
  const manifest = validation.sanitized;
  if (manifest.id === DEFAULT_THEME_ID) {
    return { success: false as const, error: 'Cannot overwrite the built-in "default" theme' };
  }

  const targetDir = path.join(themesRoot(), manifest.id);
  rmDir(targetDir);
  ensureDir(targetDir);

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const rel = entry.entryName.replace(/\\/g, '/');
    if (rel.includes('..') || path.isAbsolute(rel)) continue;
    const outPath = path.join(targetDir, rel);
    if (!outPath.startsWith(targetDir + path.sep) && outPath !== targetDir) continue;
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, entry.getData());
  }

  if (manifest.customCss) {
    const cssPath = path.join(targetDir, manifest.customCss);
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf8');
      const v = validateCustomCss(css);
      if (!v.valid) {
        rmDir(targetDir);
        return { success: false as const, error: v.error! };
      }
    }
  }

  fs.writeFileSync(path.join(targetDir, 'theme.json'), JSON.stringify(manifest, null, 2), 'utf8');

  return {
    success: true as const,
    theme: { manifest, path: targetDir, builtIn: false },
  };
}

export function uninstall(id: string): { success: boolean; error?: string } {
  if (id === DEFAULT_THEME_ID) {
    return { success: false, error: 'The default theme cannot be uninstalled' };
  }
  const dir = path.join(themesRoot(), id);
  if (!fs.existsSync(dir)) {
    return { success: false, error: 'Theme not found' };
  }
  rmDir(dir);
  return { success: true };
}

export interface ThemeAssets {
  manifest: ThemeManifest;
  customCss: string;
  fonts: { family: string; weight?: number | string; style?: string; dataUrl: string }[];
}

export function readThemeAssets(id: string): ThemeAssets | null {
  const dir = path.join(themesRoot(), id);
  const manifestPath = path.join(dir, 'theme.json');
  if (!fs.existsSync(manifestPath)) return null;
  const validation = validateManifest(readJson(manifestPath));
  if (!validation.valid || !validation.sanitized) return null;
  const manifest = validation.sanitized;

  let customCss = '';
  if (manifest.customCss) {
    const maybePath = path.join(dir, manifest.customCss);
    if (manifest.customCss.endsWith('.css') && fs.existsSync(maybePath)) {
      customCss = fs.readFileSync(maybePath, 'utf8');
    } else if (!manifest.customCss.endsWith('.css')) {
      customCss = manifest.customCss;
    }
    if (customCss) {
      const v = validateCustomCss(customCss);
      if (!v.valid) customCss = '';
    }
  }

  const fonts: ThemeAssets['fonts'] = [];
  for (const face of manifest.typography?.fontFaces || []) {
    const fontPath = path.join(dir, face.src);
    const ext = path.extname(face.src).toLowerCase();
    if (!FONT_EXT_WHITELIST.has(ext)) continue;
    if (!fontPath.startsWith(dir + path.sep)) continue;
    if (!fs.existsSync(fontPath)) continue;
    const data = fs.readFileSync(fontPath);
    const mime =
      ext === '.woff2' ? 'font/woff2' :
      ext === '.woff' ? 'font/woff' :
      ext === '.ttf' ? 'font/ttf' : 'font/otf';
    fonts.push({
      family: face.family,
      weight: face.weight,
      style: face.style,
      dataUrl: `data:${mime};base64,${data.toString('base64')}`,
    });
  }

  return { manifest, customCss, fonts };
}
