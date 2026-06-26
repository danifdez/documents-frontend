import os from 'os';
import fs from 'fs';
import { app } from 'electron';
import { detectGpu, GpuInfo } from './download-manager';

/**
 * Hardware probe + install gate for standalone mode.
 *
 * Runs in the Electron main process BEFORE anything is installed, so the
 * first-run wizard can offer three install profiles and mark each against what
 * the machine can run.
 *
 * The local AI (models bundle + Qwen3-8B Q5_K_M) ships in EVERY profile — the
 * assistant and agents are core, not optional. So the LLM is the install gate:
 * a machine that can't run the 8B even slowly can't run standalone at all
 * (`canInstall` is false → the wizard offers connecting to a server instead).
 *
 * The three profiles share that LLM floor and differ by the capabilities AROUND
 * the model:
 *   essential — core + LLM: assistant/agents and text generation (summaries,
 *               keywords). No vector store, no graph.
 *   balanced  — + Qdrant + Whisper: semantic search ("ask your documents") and
 *               audio/video transcription.
 *   complete  — + Neo4j: the entity/relationship graph.
 *
 * Because the LLM (~6.5 GB) is always present, all three weigh ~9–10 GB; disk
 * barely separates them. What separates them at runtime is RAM — Qdrant and
 * especially Neo4j's JVM cost extra on top of the model — so the higher profiles
 * can drop from 'yes' to 'slow' on a machine that runs the LLM comfortably but
 * is tight on system memory.
 *
 * Thresholds in MIN are a calibrated starting point — tune them against real
 * measurements without touching the logic.
 */

export type ProfileStatus = 'yes' | 'slow' | 'no';
export type ProfileKey = 'essential' | 'balanced' | 'complete';

// Backend feature flags (FEATURE_<X>).
export type FeatureKey =
  | 'notes' | 'tasks' | 'calendar' | 'timelines' | 'authors' | 'canvas' | 'bibliography'
  | 'datasets' | 'rag' | 'assistants' | 'knowledge_base' | 'data_sources'
  | 'entities' | 'relationships';

/**
 * Extra infrastructure a feature needs on top of the always-present base
 * (postgres + backend + models LLM/embeddings). Empty = runs on the base alone.
 *
 * Profiles are only a convenience preset: the wizard turns these features on as a
 * starting point, but the user can toggle any feature later from Settings. This
 * map is what lets Settings know, when a feature is switched on, whether a service
 * must be downloaded first (e.g. relationships → neo4j).
 */
export type ServiceNeed = 'qdrant' | 'neo4j';

export const FEATURE_REQUIREMENTS: Record<FeatureKey, ServiceNeed[]> = {
  notes: [],
  tasks: [],
  calendar: [],
  timelines: [],
  authors: [],
  canvas: [],
  bibliography: [],
  datasets: [],
  rag: ['qdrant'],
  assistants: ['qdrant'],
  knowledge_base: ['qdrant'],
  data_sources: ['qdrant'],
  entities: ['neo4j'],
  relationships: ['neo4j'],
};

const ESSENTIAL_FEATURES: FeatureKey[] = ['notes', 'tasks', 'calendar', 'rag', 'assistants'];
const BALANCED_FEATURES: FeatureKey[] = [
  ...ESSENTIAL_FEATURES,
  'authors', 'timelines', 'canvas', 'bibliography', 'datasets', 'knowledge_base', 'data_sources',
];
const COMPLETE_FEATURES: FeatureKey[] = [...BALANCED_FEATURES, 'entities', 'relationships'];

/** Every feature any profile can enable — the universe used to compute what a
 * given profile leaves disabled (FEATURE_<X>=false at the embedded backend). */
export const ALL_FEATURES: FeatureKey[] = COMPLETE_FEATURES;

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

export interface InstallProfile {
  key: ProfileKey;
  label: string;
  description: string;
  status: ProfileStatus;
  /** User-facing explanation when status is 'slow' or 'no'. Empty when 'yes'. */
  reason: string;
  /** Approximate total download for this profile, in GB. */
  downloadGB: number;
  /** Downloadable services this profile installs. */
  components: string[];
  /** Feature flags this profile turns on as a starting point (user-editable later). */
  features: FeatureKey[];
  /** Always true — every profile ships the local LLM. */
  llm: boolean;
}

export interface HardwareReport {
  hardware: HardwareInfo;
  /** Whether the machine can run the local LLM (and host the essential profile). */
  canInstall: boolean;
  /** User-facing reason when canInstall is false (drives the "use a server" path). */
  blockReason: string;
  /** Always three profiles: essential, balanced, complete. */
  profiles: InstallProfile[];
  /** Suggested default: highest profile at 'yes', else the balanced sweet spot. */
  recommended: ProfileKey;
}

// ── Thresholds (GB unless noted) ──────────────────────────────────────────
const MIN = {
  // Local LLM (Qwen3-8B Q5_K_M) — the install floor, shared by all profiles.
  // GPU wants ~7 GB VRAM for all layers; 5–7 GB runs with partial offload.
  aiGpuVram: 7,
  aiGpuVramFloor: 5,
  // GPU path still needs some system RAM for Postgres/Qdrant/etc.
  aiGpuSysRam: 8,
  // CPU path: only a strong CPU qualifies, and the honest verdict is 'slow'
  // (no GPU = slow token generation). Below this it's 'no'.
  aiCpuCores: 8,
  aiCpuRam: 16,

  // Extra system RAM the data services want on top of the model.
  ramBalanced: 8, // + Qdrant + embeddings
  ramComplete: 12, // + Neo4j JVM
};

// Footprints for the disk gate (cumulative — higher profiles include lower).
const FP_CORE = 0.5; // postgres + backend
const BUNDLE_CPU = 2;
const BUNDLE_GPU = 5;
const EMBEDDINGS = 0.15; // bge + spaCy (used by the assistant)
const WHISPER = 0.46;
const LLM_WEIGHTS = 6.5; // Qwen3-8B Q5_K_M GGUF
const NEO4J = 0.1;
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
  status: ProfileStatus; // 'yes' | 'slow' | 'no'
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

// Demote a status to 'no' when the profile won't fit on disk.
function diskGate(status: ProfileStatus, reason: string, footprintGB: number, hw: HardwareInfo): { status: ProfileStatus; reason: string } {
  if (status !== 'no' && hw.freeDiskGB !== null) {
    const needed = round1(footprintGB + DISK_SAFETY);
    if (hw.freeDiskGB < needed) {
      return { status: 'no', reason: `Needs ~${needed} GB of free disk space (${hw.freeDiskGB} GB available)` };
    }
  }
  return { status, reason };
}

// Demote 'yes' → 'slow' when system RAM is tight for this profile's extra services.
function ramGate(status: ProfileStatus, reason: string, neededRam: number, label: string, hw: HardwareInfo): { status: ProfileStatus; reason: string } {
  if (status === 'yes' && hw.ramGB < neededRam) {
    return { status: 'slow', reason: `${hw.ramGB} GB RAM — ${label} on top of the model may swap, slower performance` };
  }
  return { status, reason };
}

export function getHardwareReport(): HardwareReport {
  const hardware = detectHardware();
  const llm = evalLlm(hardware);
  const bundle = llm.mode === 'gpu' ? 'models-gpu' : 'models-cpu';
  const bundleSize = llm.mode === 'gpu' ? BUNDLE_GPU : BUNDLE_CPU;

  // Essential: core + LLM. Its disk footprint is the install floor.
  const fpEssential = FP_CORE + bundleSize + EMBEDDINGS + LLM_WEIGHTS;
  const essGate = diskGate(llm.status, llm.reason, fpEssential, hardware);
  const essential: InstallProfile = {
    key: 'essential',
    label: 'Essential',
    description: 'Assistant and agents over your documents, with summaries and keywords.',
    status: essGate.status,
    reason: essGate.reason,
    downloadGB: round1(fpEssential),
    components: ['postgres', 'backend', bundle, 'qdrant'],
    features: ESSENTIAL_FEATURES,
    llm: true,
  };

  // canInstall: the machine can run the LLM AND the essential profile fits.
  const canInstall = essential.status !== 'no';
  const blockReason = essential.status === 'no' ? essGate.reason : '';

  // Balanced: + Qdrant + Whisper.
  const fpBalanced = fpEssential + WHISPER;
  let b = diskGate(llm.status, llm.reason, fpBalanced, hardware);
  b = ramGate(b.status, b.reason, MIN.ramBalanced, 'semantic search', hardware);
  const balanced: InstallProfile = {
    key: 'balanced',
    label: 'Balanced',
    description: 'Adds semantic search ("ask your documents") and audio/video transcription.',
    status: b.status,
    reason: b.reason,
    downloadGB: round1(fpBalanced),
    components: ['postgres', 'backend', bundle, 'qdrant'],
    features: BALANCED_FEATURES,
    llm: true,
  };

  // Complete: + Neo4j graph.
  const fpComplete = fpBalanced + NEO4J;
  let c = diskGate(llm.status, llm.reason, fpComplete, hardware);
  c = ramGate(c.status, c.reason, MIN.ramComplete, 'the graph database', hardware);
  const complete: InstallProfile = {
    key: 'complete',
    label: 'Complete',
    description: 'Adds the entity/relationship graph on top of everything in Balanced.',
    status: c.status,
    reason: c.reason,
    downloadGB: round1(fpComplete),
    components: ['postgres', 'backend', bundle, 'qdrant', 'neo4j'],
    features: COMPLETE_FEATURES,
    llm: true,
  };

  const profiles = [essential, balanced, complete];

  // Recommend the highest 'yes'; if none, the balanced sweet spot when usable.
  let recommended: ProfileKey;
  if (complete.status === 'yes') recommended = 'complete';
  else if (balanced.status === 'yes') recommended = 'balanced';
  else if (balanced.status !== 'no') recommended = 'balanced';
  else recommended = 'essential';

  return { hardware, canInstall, blockReason, profiles, recommended };
}
