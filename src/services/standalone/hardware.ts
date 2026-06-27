import os from 'os';
import fs from 'fs';
import { app } from 'electron';
import { detectGpu, GpuInfo } from './download-manager';

/**
 * Hardware probe + install gate for standalone mode.
 *
 * Runs in the Electron main process BEFORE anything is installed, so the
 * first-run flow can check whether the machine can host Documents locally and,
 * if so, install the base system in one step.
 *
 * The local AI (models bundle + Qwen3-8B Q5_K_M) is core — the assistant and
 * agents need it. So the LLM is the install gate: a machine that can't run the
 * 8B even slowly can't run standalone at all (`canInstall` is false → the flow
 * offers connecting to a server instead).
 *
 * A single install covers the base: postgres + backend + the models bundle
 * (LLM + embeddings) + Qdrant, with the always-on base features (notes,
 * calendar, tasks, and the AI). Optional features are off by default; the user
 * enables what they need later from Settings, which downloads any service they
 * require.
 *
 * Thresholds in MIN are a calibrated starting point — tune them against real
 * measurements without touching the logic.
 */

export type InstallStatus = 'yes' | 'slow' | 'no';

// Optional backend feature flags (FEATURE_<X>). The base capabilities
// (notes, calendar, tasks, and the AI: rag + assistants) are always on and
// are not flags, so they don't appear here.
export type FeatureKey =
  | 'timelines' | 'canvas' | 'bibliography'
  | 'datasets' | 'knowledge_base'
  | 'relationships';

/**
 * Extra infrastructure a feature needs on top of the always-present base
 * (postgres + backend + models LLM/embeddings + qdrant). Empty = runs on the
 * base alone. This map lets Settings know, when a feature is switched on,
 * whether a service must be downloaded first (e.g. relationships → neo4j).
 */
export type ServiceNeed = 'qdrant' | 'neo4j';

export const FEATURE_REQUIREMENTS: Record<FeatureKey, ServiceNeed[]> = {
  timelines: [],
  canvas: [],
  bibliography: [],
  datasets: [],
  knowledge_base: ['qdrant'],
  relationships: ['neo4j'],
};

/** Every optional feature. The base install leaves them all off
 * (FEATURE_<X>=false at the embedded backend); the user enables what they
 * need later from Settings. */
export const ALL_FEATURES: FeatureKey[] = [
  'timelines', 'canvas', 'bibliography',
  'datasets', 'knowledge_base', 'relationships',
];

export interface HardwareInfo {
  cpuModel: string;
  cpuCores: number; // logical cores (os.cpus())
  arch: string;
  platform: NodeJS.Platform;
  ramGB: number;
  /** Free space on the user-data volume, or null when it can't be probed. */
  freeDiskGB: number | null;
  gpu: GpuInfo;
}

export interface InstallPlan {
  /** Status of the base install on this machine ('yes' | 'slow' | 'no'). */
  status: InstallStatus;
  /** User-facing note when status is 'slow'. Empty otherwise. */
  reason: string;
  /** Approximate total download, in GB. */
  downloadGB: number;
  /** Downloadable services the base install needs. */
  components: string[];
  /** The models bundle variant picked for this machine (cpu vs gpu). */
  bundle: 'models-cpu' | 'models-gpu';
}

export interface HardwareReport {
  hardware: HardwareInfo;
  /** Whether the machine can run the local LLM and host the base install. */
  canInstall: boolean;
  /** User-facing reason when canInstall is false (drives the "use a server" path). */
  blockReason: string;
  /** The single base install plan (no profiles). */
  install: InstallPlan;
}

// ── Thresholds (GB unless noted) ──────────────────────────────────────────
const MIN = {
  // Local LLM (Qwen3-8B Q5_K_M) — the install floor.
  // GPU wants ~7 GB VRAM for all layers; 5–7 GB runs with partial offload.
  aiGpuVram: 7,
  aiGpuVramFloor: 5,
  // GPU path still needs some system RAM for Postgres/Qdrant/etc.
  aiGpuSysRam: 8,
  // CPU path: only a strong CPU qualifies, and the honest verdict is 'slow'
  // (no GPU = slow token generation). Below this it's 'no'.
  aiCpuCores: 8,
  aiCpuRam: 16,
};

// Footprints for the disk gate.
const FP_CORE = 0.5; // postgres + backend
const BUNDLE_CPU = 2;
const BUNDLE_GPU = 5;
const EMBEDDINGS = 0.15; // bge + spaCy (used by the assistant)
const LLM_WEIGHTS = 6.5; // Qwen3-8B Q5_K_M GGUF
const DISK_SAFETY = 2;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function getFreeDiskGB(): number | null {
  try {
    const stats = fs.statfsSync(app.getPath('userData'));
    return round1((stats.bavail * stats.bsize) / 1024 ** 3);
  } catch {
    return null; // statfs unsupported → skip disk gating rather than false-block
  }
}

export function detectHardware(): HardwareInfo {
  const cpus = os.cpus();
  return {
    cpuModel: cpus[0]?.model?.trim() || 'Unknown CPU',
    cpuCores: cpus.length || 1,
    arch: process.arch,
    platform: process.platform,
    ramGB: round1(os.totalmem() / 1024 ** 3),
    freeDiskGB: getFreeDiskGB(),
    gpu: detectGpu(),
  };
}

interface LlmVerdict {
  status: InstallStatus; // 'yes' | 'slow' | 'no'
  mode: 'gpu' | 'cpu' | null;
  reason: string;
}

// The shared floor: can this machine run Qwen3-8B, and how?
function evalLlm(hw: HardwareInfo): LlmVerdict {
  const gpuUsable = hw.gpu.cuda && hw.ramGB >= MIN.aiGpuSysRam;

  if (gpuUsable && hw.gpu.vramGB >= MIN.aiGpuVram) {
    return { status: 'yes', mode: 'gpu', reason: '' };
  }
  if (gpuUsable && hw.gpu.vramGB >= MIN.aiGpuVramFloor) {
    return {
      status: 'slow',
      mode: 'gpu',
      reason: `${hw.gpu.vramGB} GB VRAM — the assistant runs with partial GPU offload, slower responses`,
    };
  }
  if (hw.cpuCores >= MIN.aiCpuCores && hw.ramGB >= MIN.aiCpuRam) {
    return {
      status: 'slow',
      mode: 'cpu',
      reason: `No compatible GPU — the assistant runs on CPU (${hw.cpuCores} cores), expect slow responses`,
    };
  }
  return {
    status: 'no',
    mode: null,
    reason: `This machine can't run the local assistant — needs an NVIDIA GPU (${MIN.aiGpuVramFloor} GB+ VRAM) or a CPU with ${MIN.aiCpuCores}+ cores and ${MIN.aiCpuRam} GB of RAM`,
  };
}

// Demote a status to 'no' when the install won't fit on disk.
function diskGate(status: InstallStatus, reason: string, footprintGB: number, hw: HardwareInfo): { status: InstallStatus; reason: string } {
  if (status !== 'no' && hw.freeDiskGB !== null) {
    const needed = round1(footprintGB + DISK_SAFETY);
    if (hw.freeDiskGB < needed) {
      return { status: 'no', reason: `Needs ~${needed} GB of free disk space (${hw.freeDiskGB} GB available)` };
    }
  }
  return { status, reason };
}

export function getHardwareReport(): HardwareReport {
  const hardware = detectHardware();
  const llm = evalLlm(hardware);
  const bundle = llm.mode === 'gpu' ? 'models-gpu' : 'models-cpu';
  const bundleSize = llm.mode === 'gpu' ? BUNDLE_GPU : BUNDLE_CPU;

  // The base install: core + LLM + embeddings + Qdrant.
  const footprint = FP_CORE + bundleSize + EMBEDDINGS + LLM_WEIGHTS;
  const gate = diskGate(llm.status, llm.reason, footprint, hardware);

  const canInstall = gate.status !== 'no';
  const blockReason = gate.status === 'no' ? gate.reason : '';

  const install: InstallPlan = {
    status: gate.status,
    reason: gate.reason,
    downloadGB: round1(footprint),
    components: ['postgres', 'backend', bundle, 'qdrant'],
    bundle,
  };

  return { hardware, canInstall, blockReason, install };
}
