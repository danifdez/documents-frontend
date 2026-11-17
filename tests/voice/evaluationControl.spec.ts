// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createHash } from 'node:crypto';
vi.mock('electron', () => ({ app: { getPath: () => { throw new Error('No personal profiles'); } }, ipcMain: {} }));
import { laboratoryProfile, evaluationProfile } from '@/main/evaluation/profile';
import { checkedEvaluationInput } from '@/main/evaluation/control';
let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'evaluation-profile-'));
  await fs.writeFile(path.join(root,'.ai-train-laboratory'),'ai-train-laboratory/1\n',{ mode:0o600 });
});
afterEach(async () => { await fs.rm(root,{ recursive:true,force:true }); });
const input = () => ({ media_type:'audio/wav', chunks:[{ size:2, base64:'Bwg=', sha256:'sha256:'+createHash('sha256').update(Buffer.from([7,8])).digest('hex') }],
  execution:{ delivery:'ordered_ack',finish:'stop',evidence_mode:'simulated' } });
describe('explicit private evaluation control', () => {
  it('requires launch authorization and a marked private owned profile', () => {
    expect(() => laboratoryProfile(path.join(os.homedir(),'.config/Documents'))).toThrow('Personal');
    expect(() => laboratoryProfile(path.join(os.homedir(),'.config/documents-frontend-dev/child'))).toThrow('Personal');
    expect(evaluationProfile([])).toBeUndefined();expect(laboratoryProfile(root)).toBe(root);
    expect(evaluationProfile(['--evaluation-control','--evaluation-capture','--evaluation-profile='+root])).toBe(root);
    expect(() => evaluationProfile(['--evaluation-control','--evaluation-profile='+root])).toThrow('authorization');
    expect(() => evaluationProfile(['--evaluation-control','--evaluation-capture','--evaluation-profile='+root,'--evaluation-profile='+root])).toThrow('authorization');
  });
  it('rejects profile aliases and weakened directory permissions', async () => {
    const alias=path.join(root,'alias');await fs.symlink(root,alias);
    expect(() => laboratoryProfile(alias)).toThrow('Invalid');await fs.chmod(root,0o755);
    expect(() => laboratoryProfile(root)).toThrow('private');
  });
  it.each(['symlink','hardlink','permissions','contents'])('rejects a forged %s profile marker', async (kind) => {
    const marker=path.join(root,'.ai-train-laboratory');
    if(kind==='permissions')await fs.chmod(marker,0o644);
    if(kind==='contents')await fs.writeFile(marker,'not an authorization');
    if(kind==='symlink'){await fs.rename(marker,path.join(root,'original'));await fs.symlink(path.join(root,'original'),marker);}
    if(kind==='hardlink')await fs.link(marker,path.join(root,'alias'));
    expect(() => laboratoryProfile(root)).toThrow();
  });
  it('validates bounded audio before allowing the fixed execution conditions', () => {
    const value=input();expect(checkedEvaluationInput(value,'simulated')).toBe(value);
    for(const changed of [ { ...value, command:'never execute' },{ ...value,profile:'/private' },
      { ...value,execution:{ ...value.execution,evidence_mode:'observed' } }, { ...value,execution:{ ...value.execution,finish:'anything' } },
      { ...value,chunks:[{ ...value.chunks[0],size:true }] }, { ...value,chunks:[{ ...value.chunks[0],base64:'invalid' }] },
      { ...value,chunks:[{ ...value.chunks[0],sha256:'sha256:'+'0'.repeat(64) }] } ]) {
      expect(() => checkedEvaluationInput(changed,'simulated')).toThrow();
    }
  });
  it('rejects aggregate excess without accepting arbitrary paths or formats', () => {
    const chunk=Buffer.alloc(256*1024);const artifact={size:chunk.length,base64:chunk.toString('base64'),sha256:'sha256:'+createHash('sha256').update(chunk).digest('hex')};
    expect(() => checkedEvaluationInput({ ...input(),chunks:Array(17).fill(artifact) },'simulated')).toThrow();
    expect(() => checkedEvaluationInput({ ...input(),media_type:'http://localhost/private' },'simulated')).toThrow();
  });
});
