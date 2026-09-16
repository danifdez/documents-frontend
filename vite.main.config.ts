import { defineConfig, type Plugin } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Copy the tray icon assets next to the main process bundle. Vite does not
 * include arbitrary files in a Node target build by default. The tray icons
 * are loaded at runtime via `path.join(__dirname, 'assets', 'tray', ...)`,
 * which means they must live in `<outDir>/assets/tray/` both in dev
 * (`.vite/build/`) and in packaged builds.
 */
function copyRuntimeIcons(): Plugin {
  const traySrcDir = path.resolve(__dirname, 'src/assets/tray');
  const appIconSrc = path.resolve(__dirname, 'src/assets/app-icon.png');
  return {
    name: 'copy-runtime-icons',
    apply: () => true,
    closeBundle() {
      // `this.environment` is available in Vite 6+; fall back to default outDir layout.
      // The Forge Vite plugin builds main to `.vite/build/`.
      const outDir = path.resolve(__dirname, '.vite/build/assets/tray');
      if (fs.existsSync(traySrcDir)) {
        fs.mkdirSync(outDir, { recursive: true });
        for (const file of fs.readdirSync(traySrcDir)) {
          if (!file.endsWith('.png')) continue;
          fs.copyFileSync(path.join(traySrcDir, file), path.join(outDir, file));
        }
      }
      if (fs.existsSync(appIconSrc)) {
        const appIconOutDir = path.resolve(__dirname, '.vite/build/assets');
        fs.mkdirSync(appIconOutDir, { recursive: true });
        fs.copyFileSync(appIconSrc, path.join(appIconOutDir, 'app-icon.png'));
      }
    },
  };
}

// https://vitejs.dev/config
export default defineConfig({
  plugins: [copyRuntimeIcons()],
});
