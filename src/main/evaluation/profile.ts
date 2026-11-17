import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';
/** Operator-selected laboratory profile. Never obtained from a case or socket. */
export function laboratoryProfile(value: string): string {
  const personal = ['Documents','documents-frontend','documents-frontend-dev'].map((name) => path.join(homedir(),'.config',name));
  personal.push(path.join(homedir(),'.local/share/documents-frontend'));
  if (personal.some((root) => value === root || value.startsWith(root + path.sep))) throw new Error('Personal profiles cannot be used for evaluation');
  if (process.platform !== 'linux' || process.getuid?.() === 0 || process.getuid?.() !== process.geteuid?.() ||
      !path.isAbsolute(value) || fs.realpathSync(value) !== value) throw new Error('Invalid evaluation profile');
  const stat = fs.lstatSync(value);
  if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700) throw new Error('Evaluation profile must be private');
  const fd = fs.openSync(path.join(value, '.ai-train-laboratory'), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const marker = fs.fstatSync(fd);
    if (!marker.isFile() || marker.uid !== process.getuid() || marker.nlink !== 1 || (marker.mode & 0o777) !== 0o600 || marker.size !== 22 ||
        fs.readFileSync(fd, 'utf8') !== 'ai-train-laboratory/1\n') throw new Error('Evaluation profile marker is invalid');
  } finally { fs.closeSync(fd); }
  return value;
}
export function evaluationProfile(args: string[]): string | undefined {
  if (!args.includes('--evaluation-control')) return undefined;
  const values = args.filter((item) => item.startsWith('--evaluation-profile='));
  if (values.length !== 1 || !args.includes('--evaluation-capture')) throw new Error('Explicit evaluation authorization required');
  return laboratoryProfile(values[0].slice('--evaluation-profile='.length));
}
