// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import fs from 'node:fs';
import { app } from 'electron';
import { detectGpu, type GpuInfo } from '@/services/standalone/download-manager';
import { detectHardware, getHardwareReport } from '@/services/standalone/hardware';

vi.mock('node:os', () => ({ default: { cpus: vi.fn(), totalmem: vi.fn() } }));
vi.mock('node:fs', () => ({ default: { statfsSync: vi.fn() } }));
vi.mock('electron', () => ({ app: { getPath: vi.fn() } }));
vi.mock('@/services/standalone/download-manager', () => ({ detectGpu: vi.fn() }));

const gigabyte = 1024 ** 3;
const cpu: os.CpuInfo = {
  model: '  Workstation CPU  ',
  speed: 2600,
  times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
};
const noGpu: GpuInfo = { available: false, name: null, cuda: false, vramGB: 0 };

function setCpu(cores: number, ramGB: number) {
  vi.mocked(os.cpus).mockReturnValue(Array.from({ length: cores }, () => cpu));
  vi.mocked(os.totalmem).mockReturnValue(ramGB * gigabyte);
}

function setDisk(gigabytes: number) {
  vi.mocked(fs.statfsSync).mockReturnValue({
    type: 0, bsize: 1024, blocks: 0, bfree: 0, bavail: (gigabytes * gigabyte) / 1024, files: 0, ffree: 0,
  });
}

function setGpu(vramGB: number, cuda = true) {
  vi.mocked(detectGpu).mockReturnValue({ available: true, name: 'Graphics card', cuda, vramGB });
}

beforeEach(() => {
  vi.resetAllMocks();
  setCpu(8, 16);
  setDisk(40);
  vi.mocked(app.getPath).mockReturnValue('/profile');
  vi.mocked(detectGpu).mockReturnValue(noGpu);
});

describe('local installation hardware report', () => {
  it('probes disk space on the application profile volume and rounds reported sizes', () => {
    setCpu(12, 23.94);
    setDisk(40.26);
    setGpu(8);
    expect(detectHardware()).toEqual({
      cpuModel: 'Workstation CPU', cpuCores: 12, ramGB: 23.9, freeDiskGB: 40.3,
      platform: process.platform, arch: process.arch, gpu: detectGpu(),
    });
    expect(app.getPath).toHaveBeenCalledWith('userData');
    expect(fs.statfsSync).toHaveBeenCalledWith('/profile');
  });

  it('selects the GPU bundle at the full-offload limit', () => {
    setCpu(4, 8);
    setDisk(14.5);
    setGpu(7);
    expect(getHardwareReport()).toMatchObject({
      canInstall: true,
      blockReason: '',
      install: {
        status: 'yes', reason: '', bundle: 'models-gpu', downloadGB: 12.5,
        components: ['postgres', 'backend', 'models-gpu'],
      },
    });
  });

  it.each([5, 6.9])('permits a partial GPU offload with %s GB of VRAM', (vram) => {
    setGpu(vram);
    const report = getHardwareReport();
    expect(report.canInstall).toBe(true);
    expect(report.install).toMatchObject({ status: 'slow', bundle: 'models-gpu' });
    expect(report.install.reason).toContain('partial GPU offload');
  });

  it.each([{ vram: 12, cuda: false }, { vram: 4.9, cuda: true }])(
    'falls back to CPU when the GPU cannot run the model (%j)',
    ({ vram, cuda }) => {
      setGpu(vram, cuda);
      const report = getHardwareReport();
      expect(report.canInstall).toBe(true);
      expect(report.blockReason).toBe('');
      expect(report.install).toMatchObject({ status: 'slow', bundle: 'models-cpu', downloadGB: 9.5 });
      expect(report.install.reason).toContain('CPU (8 cores)');
    },
  );

  it.each([[7, 16, 0], [16, 15, 0], [8, 7, 16]])(
    'blocks installation on a system with %i cores, %i GB of RAM and %i GB VRAM',
    (cores, ram, vram) => {
      setCpu(cores, ram);
      setGpu(vram);
      setDisk(0);
      const report = getHardwareReport();
      expect(report.canInstall).toBe(false);
      expect(report.install.status).toBe('no');
      expect(report.blockReason).toContain("can't run the local assistant");
      expect(report.install.reason).toBe(report.blockReason);
    },
  );

  it('accounts for download size and reserved space when the GPU fits but storage is insufficient', () => {
    setGpu(8);
    setDisk(14.4);
    expect(getHardwareReport()).toMatchObject({
      canInstall: false,
      blockReason: 'Needs ~14.5 GB of free disk space (14.4 GB available)',
      install: { status: 'no', bundle: 'models-gpu' },
    });
  });

  it('treats an unavailable disk probe as unknown and handles missing CPU metadata', () => {
    setCpu(0, 8);
    setGpu(8);
    vi.mocked(fs.statfsSync).mockImplementation(() => { throw new Error('Unsupported'); });
    expect(getHardwareReport()).toMatchObject({
      hardware: { cpuModel: 'Unknown CPU', cpuCores: 1, freeDiskGB: null },
      canInstall: true,
      install: { status: 'yes' },
    });
  });
});
