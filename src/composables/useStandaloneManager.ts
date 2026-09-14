import { ref, computed, onUnmounted } from 'vue';
import { useElectronApi } from './useElectronApi';

export type ServiceKey = 'postgres' | 'backend' | 'models';

export interface DownloadProgress {
    component: string;
    downloaded: number;
    total: number;
    percent: number;
}

export interface GpuInfo {
    available: boolean;
    name: string | null;
    cuda: boolean;
}

export interface HardwareReport {
    hardware: { cpuModel: string; cpuCores: number; ramGB: number; freeDiskGB: number | null; gpu: { name: string | null; vramGB: number } };
    canInstall: boolean;
    blockReason: string;
    install: { status: 'yes' | 'slow' | 'no'; reason: string; downloadGB: number; components: string[]; bundle: string };
}

/**
 * Lifecycle of the standalone (local) server: install state, live service
 * status polling, GPU/hardware detection and download progress.
 */
export function useStandaloneManager() {
    const { isElectron } = useElectronApi();

    // ── Install state ──
    const standaloneInstalled = ref({ backend: false, postgres: false, models: false });
    const standaloneDownloading = ref(false);
    const standaloneDownloadError = ref('');
    const downloadProgress = ref<DownloadProgress>({ component: '', downloaded: 0, total: 0, percent: 0 });
    const gpuInfo = ref<GpuInfo | null>(null);
    const standaloneFullyInstalled = computed(() =>
        standaloneInstalled.value.backend && standaloneInstalled.value.postgres
    );

    // ── Live service status (observability, shown once standalone is installed) ──
    const serviceStatus = ref<Record<ServiceKey, string>>({
        postgres: 'stopped', backend: 'stopped', models: 'not_installed',
    });
    const serviceErrors = ref<Partial<Record<ServiceKey, string>>>({});

    async function refreshServiceStatus() {
        if (!isElectron || !window.electronAPI.standaloneStatus) return;
        const res = await window.electronAPI.standaloneStatus();
        serviceStatus.value = res.services;
        serviceErrors.value = res.errors ?? {};
    }

    let statusPollTimer: ReturnType<typeof setInterval> | null = null;
    function startStatusPolling() {
        if (statusPollTimer) return;
        refreshServiceStatus();
        statusPollTimer = setInterval(refreshServiceStatus, 3000);
    }
    function stopStatusPolling() {
        if (statusPollTimer) { clearInterval(statusPollTimer); statusPollTimer = null; }
    }
    onUnmounted(stopStatusPolling);

    // ── Hardware report (gates the install offer when not yet installed) ──
    const hardwareReport = ref<HardwareReport | null>(null);
    const hardwareSummary = computed(() => {
        const h = hardwareReport.value?.hardware;
        if (!h) return '';
        const parts = [`${h.ramGB} GB RAM`, `${h.cpuCores} cores`];
        if (h.gpu?.name) parts.push(`${h.gpu.name} (${h.gpu.vramGB} GB)`);
        if (h.freeDiskGB !== null) parts.push(`${h.freeDiskGB} GB free`);
        return parts.join(' · ');
    });

    async function loadHardwareReport() {
        if (isElectron && window.electronAPI.standaloneHardwareReport) {
            hardwareReport.value = await window.electronAPI.standaloneHardwareReport();
        }
    }

    async function loadStandaloneStatus() {
        if (isElectron && window.electronAPI.standaloneCheckInstalled) {
            standaloneInstalled.value = await window.electronAPI.standaloneCheckInstalled();
        }
        if (isElectron && window.electronAPI.standaloneDetectGpu) {
            gpuInfo.value = await window.electronAPI.standaloneDetectGpu();
        }
    }

    // ── Install / uninstall ──
    async function installStandalone() {
        standaloneDownloading.value = true;
        standaloneDownloadError.value = '';
        const result = await window.electronAPI.standaloneDownloadAll();
        standaloneDownloading.value = false;
        if (!result.success) {
            standaloneDownloadError.value = result.error || 'Download failed';
        }
        await loadStandaloneStatus();
    }

    async function uninstallStandalone() {
        await window.electronAPI.standaloneStop();
        await window.electronAPI.standaloneUninstallServices();
        await loadStandaloneStatus();
    }

    async function updateStandaloneServices() {
        standaloneDownloading.value = true;
        standaloneDownloadError.value = '';
        const result = await window.electronAPI.standaloneUpdateServices();
        standaloneDownloading.value = false;
        if (!result.success) {
            standaloneDownloadError.value = result.error || 'Update failed';
        }
        await loadStandaloneStatus();
        return result.updated ?? [];
    }

    const forceCpu = ref(false);
    const modelsSize = computed(() => {
        if (gpuInfo.value?.cuda && !forceCpu.value) return '~3-5 GB (GPU)';
        return '~1.5-2 GB (CPU)';
    });

    async function installModels() {
        standaloneDownloading.value = true;
        standaloneDownloadError.value = '';
        // Auto-detect: use GPU if CUDA available and user hasn't forced CPU
        const variant = (gpuInfo.value?.cuda && !forceCpu.value) ? 'models-gpu' : 'models-cpu';
        // Downloads the service bundle AND runs --setup to download ML models
        const result = await window.electronAPI.standaloneInstallModels(variant);
        standaloneDownloading.value = false;
        if (!result.success) {
            standaloneDownloadError.value = result.error || 'Installation failed';
        }
        await loadStandaloneStatus();
    }

    async function uninstallModels() {
        await window.electronAPI.standaloneUninstallModels();
        await loadStandaloneStatus();
    }

    function subscribeDownloadProgress() {
        if (isElectron && window.electronAPI.onStandaloneDownloadProgress) {
            window.electronAPI.onStandaloneDownloadProgress((progress) => {
                downloadProgress.value = progress;
            });
        }
    }

    return {
        standaloneInstalled,
        standaloneDownloading,
        standaloneDownloadError,
        downloadProgress,
        gpuInfo,
        forceCpu,
        modelsSize,
        standaloneFullyInstalled,
        serviceStatus,
        serviceErrors,
        hardwareReport,
        hardwareSummary,
        startStatusPolling,
        stopStatusPolling,
        loadStandaloneStatus,
        loadHardwareReport,
        installStandalone,
        uninstallStandalone,
        updateStandaloneServices,
        installModels,
        uninstallModels,
        subscribeDownloadProgress,
    };
}
