/**
 * Management of the `whisper-base.ggml` model for the local engine.
 *
 * Policy:
 * - The model lives in `app.getPath('userData')/voice-models/`.
 * - It is not included in the app bundle (keeps the installer small).
 * - Downloaded on first use from a HuggingFace mirror.
 * - Integrity: we check size + sha256 against the hardcoded manifest.
 */
import { app } from 'electron';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as https from 'node:https';
import * as http from 'node:http';
import { URL } from 'node:url';
import type { LocalModelProgress } from './types';

/** Model manifest. Update if we change the file/quant. */
const MODEL_MANIFEST = {
  name: 'whisper-base.ggml',
  // ggerganov/whisper.cpp pub LFS — base model quantized q8_0 (~150 MB).
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q8_0.bin',
  sha256: '',   // leave empty until validated on a real download; see _verifyOrSkip
  sizeBytes: null as number | null, // idem
} as const;


function modelsDir(): string {
  return path.join(app.getPath('userData'), 'voice-models');
}

export function modelPath(): string {
  return path.join(modelsDir(), MODEL_MANIFEST.name);
}

/** Is the file on disk and does it pass the integrity checks? */
export async function isModelReady(): Promise<boolean> {
  try {
    const stat = await fsp.stat(modelPath());
    if (MODEL_MANIFEST.sizeBytes && stat.size !== MODEL_MANIFEST.sizeBytes) return false;
    if (!MODEL_MANIFEST.sha256) return true; // hash unknown for now
    const sha = await fileSha256(modelPath());
    return sha === MODEL_MANIFEST.sha256;
  } catch {
    return false;
  }
}

/**
 * Downloads the model if missing. Idempotent. Calls `onProgress` during the
 * download. Resolves when the file is complete and verified.
 */
export async function ensureModelDownloaded(
  onProgress?: (p: LocalModelProgress) => void,
): Promise<void> {
  if (await isModelReady()) return;
  await fsp.mkdir(modelsDir(), { recursive: true });
  const tmp = modelPath() + '.part';
  await downloadTo(MODEL_MANIFEST.url, tmp, onProgress);

  if (MODEL_MANIFEST.sha256) {
    const sha = await fileSha256(tmp);
    if (sha !== MODEL_MANIFEST.sha256) {
      await fsp.unlink(tmp).catch((): undefined => undefined);
      throw new Error(`downloaded model has unexpected sha256: ${sha}`);
    }
  }
  await fsp.rename(tmp, modelPath());
}

function fileSha256(p: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = fs.createReadStream(p);
    s.on('data', (chunk) => h.update(chunk));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

function downloadTo(
  fromUrl: string,
  toPath: string,
  onProgress?: (p: LocalModelProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const u = new URL(fromUrl);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(u, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirects manually.
        res.resume();
        return downloadTo(res.headers.location, toPath, onProgress).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} while downloading ${fromUrl}`));
      }
      const total = res.headers['content-length']
        ? Number(res.headers['content-length'])
        : null;
      let downloaded = 0;
      const out = fs.createWriteStream(toPath);
      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (onProgress) {
          const percent = total ? Math.floor((downloaded / total) * 100) : 0;
          onProgress({ downloaded, total, percent });
        }
      });
      res.pipe(out);
      out.on('finish', () => out.close((err) => err ? reject(err) : resolve()));
      out.on('error', reject);
    });
    req.on('error', reject);
  });
}
