import { spawn } from 'node:child_process';

export const DECODE_LIMITS = { timeoutMs: 15000, bytes: 64 * 1024 * 1024 };
/** Pipe-only decoding: no URLs/files from audio, diagnostics, or ambient secrets. */
export function decodeAudio(executable: string, input: Buffer, signal: AbortSignal): Promise<Float32Array> {
  if (signal.aborted) return Promise.reject(new Error('Local voice decoding cancelled'));
  return new Promise((resolve, reject) => {
    const proc = spawn(executable, ['-nostdin', '-loglevel', 'error',
      '-protocol_whitelist', 'pipe', '-format_whitelist', 'wav,matroska,webm,ogg', '-i', 'pipe:0',
      '-vn', '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', 'pipe:1'],
    { stdio: ['pipe', 'pipe', 'ignore'], env: { LANG: 'C' }, windowsHide: true });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let failed = false;
    const fail = () => { failed = true; proc.kill('SIGKILL'); };
    const timer = setTimeout(fail, DECODE_LIMITS.timeoutMs);
    signal.addEventListener('abort', fail, { once: true });
    proc.stdout.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > DECODE_LIMITS.bytes) fail();
      else if (!failed) chunks.push(chunk);
    });
    proc.on('error', () => { failed = true; });
    proc.stdin.on('error', () => { failed = true; });
    proc.on('close', (code) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', fail);
      if (failed || signal.aborted || code !== 0 || bytes === 0 || bytes % 2) {
        reject(new Error('Local voice decoding failed'));
        return;
      }
      const pcm = Buffer.concat(chunks);
      const output = new Float32Array(pcm.length / 2);
      for (let i = 0; i < output.length; i++) output[i] = pcm.readInt16LE(i * 2) / 32768;
      resolve(output);
    });
    proc.stdin.end(input);
  });
}
