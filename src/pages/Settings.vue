<template>
    <div class="h-full overflow-y-auto">
        <div class="px-6 py-6">
            <PageHeader title="Settings" subtitle="Configure your editor and application preferences" :divider="false" />

            <!-- Tabs -->
            <div class="flex gap-1 mb-6 border-b border-border">
                <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
                    class="px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer border-b-2 -mb-px"
                    :class="activeTab === tab.id
                        ? 'border-accent text-accent'
                        : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'">
                    {{ tab.label }}
                </button>
            </div>

            <!-- General Tab -->
            <div v-show="activeTab === 'general'">
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                    <!-- Theme -->
                    <section class="bg-surface-elevated rounded-xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Theme</h2>
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-2">Appearance</label>
                            <div class="flex gap-2">
                                <button v-for="opt in themeOptions" :key="opt.value"
                                    @click="theme = opt.value; saveSettings()"
                                    class="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border transition-all duration-200 cursor-pointer"
                                    :class="theme === opt.value
                                        ? 'border-accent bg-accent-subtle text-accent-dark'
                                        : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                                        <path stroke-linecap="round" stroke-linejoin="round" :d="opt.icon" />
                                    </svg>
                                    <span class="text-xs font-medium">{{ opt.label }}</span>
                                </button>
                            </div>
                        </div>
                        <div class="mt-4">
                            <label class="block text-xs font-medium text-text-secondary mb-1">Active theme</label>
                            <div class="flex items-center gap-2">
                                <select v-model="activeThemeId" @change="onActiveThemeChange"
                                    class="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all">
                                    <option v-for="entry in themes" :key="entry.manifest.id" :value="entry.manifest.id">
                                        {{ entry.manifest.name }}
                                    </option>
                                </select>
                                <button type="button" class="btn-secondary text-xs whitespace-nowrap"
                                    @click="showThemeManager = true">
                                    Manage themes…
                                </button>
                            </div>
                        </div>
                    </section>

                    <!-- Language -->
                    <section class="bg-surface-elevated rounded-xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Language</h2>
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1">Display Language</label>
                            <select v-model="language" @change="saveSettings"
                                class="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all">
                                <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.label
                                    }}</option>
                            </select>
                        </div>
                    </section>

                    <!-- Browser -->
                    <section class="bg-surface-elevated rounded-xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Browser</h2>
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1">Default URL</label>
                            <input type="text" v-model="defaultBrowserUrl" @change="saveSettings"
                                placeholder="https://example.com"
                                class="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" />
                            <p class="mt-1.5 text-xs text-text-muted">The page that opens by default in the built-in
                                browser</p>
                        </div>
                    </section>

                    <!-- Editor Appearance -->
                    <section class="bg-surface-elevated rounded-xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Editor
                            Appearance</h2>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1">Font Size</label>
                                <select v-model="fontSize" @change="saveSettings"
                                    class="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all">
                                    <option v-for="size in fontSizes" :key="size" :value="size">{{ size }} px</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1">Font Family</label>
                                <select v-model="fontFamily" @change="saveSettings"
                                    class="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all">
                                    <option v-for="family in fontFamilies" :key="family.value" :value="family.value">{{
                                        family.label }}</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1">Paragraph Spacing
                                    <span class="text-text-muted font-normal ml-1">{{ paragraphSpacing }}</span></label>
                                <input type="range" min="1" max="3" step="0.1" v-model.number="paragraphSpacing"
                                    @change="saveSettings"
                                    class="w-full h-1.5 bg-border rounded-full appearance-none accent-accent" />
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            <!-- Features Tab -->
            <div v-show="activeTab === 'features'">
                <p class="text-sm text-text-muted mb-4">Enable or disable application features. Server-disabled
                    features cannot be enabled here.</p>

                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div v-for="flag in featureStore.featureFlags" :key="flag.key"
                        class="bg-surface-elevated rounded-xl border border-border p-4 flex items-center justify-between">
                        <div>
                            <span class="text-sm font-medium text-text-primary">{{ flag.label }}</span>
                            <p v-if="!flag.backendEnabled" class="text-xs text-text-muted mt-0.5">Disabled by server
                            </p>
                        </div>
                        <button v-if="flag.backendEnabled" @click="featureStore.toggleLocalFeature(flag.key)"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer"
                            :class="flag.enabled ? 'bg-accent' : 'bg-border'">
                            <span
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                                :class="flag.enabled ? 'translate-x-6' : 'translate-x-1'" />
                        </button>
                        <span v-else
                            class="relative inline-flex h-6 w-11 items-center rounded-full bg-border opacity-40 cursor-not-allowed">
                            <span class="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                        </span>
                    </div>
                </div>
            </div>

            <!-- Workspaces Tab -->
            <div v-show="activeTab === 'workspaces'">
                <p class="text-sm text-text-muted mb-4">Manage server connections</p>

                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div v-for="ws in workspaceStore.workspaces" :key="ws.id"
                        class="bg-surface-elevated rounded-xl border p-4 flex flex-col gap-2 transition-colors"
                        :class="ws.id === workspaceStore.activeWorkspaceId ? 'border-accent' : 'border-border'">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-medium text-text-primary">{{ ws.name }}</span>
                                <span v-if="ws.id === workspaceStore.defaultWorkspaceId"
                                    class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-text-muted">Default</span>
                            </div>
                            <span v-if="ws.id === workspaceStore.activeWorkspaceId"
                                class="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">Active</span>
                        </div>
                        <span v-if="ws.type === 'local'" class="text-xs text-accent truncate">Local server</span>
                        <span v-else class="text-xs text-text-muted truncate">{{ ws.url }}</span>
                        <div class="flex gap-2 mt-1">
                            <button v-if="ws.id !== workspaceStore.activeWorkspaceId"
                                @click="switchToWorkspace(ws.id)"
                                class="text-xs text-accent hover:underline cursor-pointer">Switch</button>
                            <button v-if="ws.type !== 'local'" @click="editWorkspace(ws)"
                                class="text-xs text-text-secondary hover:underline cursor-pointer">Edit</button>
                            <button v-if="ws.id !== workspaceStore.defaultWorkspaceId"
                                @click="workspaceStore.setDefaultWorkspace(ws.id)"
                                class="text-xs text-text-secondary hover:underline cursor-pointer">Set default</button>
                            <button v-else @click="workspaceStore.setDefaultWorkspace(null)"
                                class="text-xs text-text-muted hover:underline cursor-pointer">Unset default</button>
                            <button
                                v-if="workspaceStore.workspaces.length > 1 && ws.type !== 'local'"
                                @click="deleteWorkspace(ws.id)"
                                class="text-xs text-red-500 hover:underline cursor-pointer">Remove</button>
                        </div>
                    </div>

                    <button @click="showWorkspaceModal = true"
                        class="bg-surface-elevated rounded-xl border border-dashed border-border p-4 flex items-center justify-center gap-2 text-sm text-text-muted hover:bg-surface-hover hover:border-text-muted transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Workspace
                    </button>
                </div>

                <WorkspaceModal v-if="showWorkspaceModal || editingWorkspace" :workspace="editingWorkspace"
                    @close="showWorkspaceModal = false; editingWorkspace = null" @save="handleWorkspaceSave" />
            </div>

            <!-- Server Tab -->
            <div v-show="activeTab === 'server'">
                <p class="text-sm text-text-muted mb-4">Install and run all services locally on this machine</p>

                <div class="bg-surface-elevated rounded-xl border border-border p-5 max-w-lg">
                    <!-- Core services -->
                    <h3 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Core Services
                    </h3>
                    <div class="space-y-3 mb-4">
                        <div v-for="svc in coreServices" :key="svc.key" class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full"
                                    :class="standaloneInstalled[svc.key] ? 'bg-green-500' : 'bg-border'"></span>
                                <span class="text-sm text-text-primary">{{ svc.label }}</span>
                            </div>
                            <span class="text-xs text-text-muted">{{ svc.size }}</span>
                        </div>
                    </div>

                    <!-- Download progress -->
                    <div v-if="standaloneDownloading" class="mb-4">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-xs text-text-secondary">Downloading {{ downloadProgress.component
                                }}...</span>
                            <span class="text-xs text-text-muted">{{ downloadProgress.percent }}%</span>
                        </div>
                        <div class="w-full h-1.5 bg-border rounded-full overflow-hidden">
                            <div class="h-full bg-accent rounded-full transition-all duration-300"
                                :style="{ width: downloadProgress.percent + '%' }"></div>
                        </div>
                    </div>

                    <!-- Error -->
                    <div v-if="standaloneDownloadError"
                        class="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                        {{ standaloneDownloadError }}
                    </div>

                    <!-- Install / Uninstall -->
                    <div class="flex gap-2">
                        <button v-if="!standaloneFullyInstalled" @click="installStandalone"
                            :disabled="standaloneDownloading"
                            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            {{ standaloneDownloading ? 'Installing...' : 'Install Local Server (~350 MB)' }}
                        </button>
                        <button v-if="standaloneFullyInstalled" @click="uninstallStandalone"
                            class="px-4 py-2 rounded-lg border border-border text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                            Uninstall
                        </button>
                    </div>

                    <!-- AI / Inference Models -->
                    <div class="mt-5 pt-4 border-t border-border">
                        <h3 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">AI /
                            Inference</h3>
                        <p class="text-xs text-text-muted mb-3">Document extraction, transcription, translation, entity
                            recognition, summarization, semantic search, image generation.</p>

                        <!-- GPU detection -->
                        <div v-if="gpuInfo" class="mb-3 text-xs px-3 py-2 rounded-lg"
                            :class="gpuInfo.available && gpuInfo.cuda ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-surface-hover text-text-muted'">
                            <template v-if="gpuInfo.available && gpuInfo.cuda">
                                GPU detected: {{ gpuInfo.name }} (CUDA) — GPU acceleration will be used
                            </template>
                            <template v-else-if="gpuInfo.available">
                                {{ gpuInfo.name }} detected — CPU inference will be used
                            </template>
                            <template v-else>
                                No GPU detected — CPU inference will be used
                            </template>
                        </div>

                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full"
                                    :class="standaloneInstalled.models ? 'bg-green-500' : 'bg-border'"></span>
                                <span class="text-sm text-text-primary">Models Service</span>
                            </div>
                            <span class="text-xs text-text-muted">{{ modelsSize }}</span>
                        </div>

                        <div class="flex items-center gap-2">
                            <button v-if="!standaloneInstalled.models" @click="installModels"
                                :disabled="standaloneDownloading"
                                class="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                {{ standaloneDownloading ? 'Installing...' : 'Install AI Features' }}
                            </button>
                            <button v-else @click="uninstallModels"
                                class="px-4 py-2 rounded-lg border border-border text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                                Remove AI Features
                            </button>
                            <!-- Force CPU toggle when GPU is available -->
                            <label v-if="gpuInfo?.cuda && !standaloneInstalled.models"
                                class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer ml-2">
                                <input type="checkbox" v-model="forceCpu" class="accent-accent w-3 h-3" />
                                Force CPU only
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Export Tab -->
            <div v-show="activeTab === 'export'">
                <p class="text-sm text-text-muted mb-4">Export resources from your projects as a ZIP archive</p>

                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                    <!-- Project Selection -->
                    <section class="bg-surface-elevated rounded-xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Project
                            Selection</h2>
                        <div class="space-y-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" v-model="exportScope" value="all"
                                    class="accent-accent w-3.5 h-3.5" />
                                <span class="text-sm text-text-primary">All projects</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" v-model="exportScope" value="selected"
                                    class="accent-accent w-3.5 h-3.5" />
                                <span class="text-sm text-text-primary">Select projects</span>
                            </label>

                            <div v-if="exportScope === 'selected'" class="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                                <div v-if="availableProjects.length === 0"
                                    class="text-xs text-text-muted py-2 text-center">
                                    No projects found
                                </div>
                                <label v-for="project in availableProjects" :key="project.id"
                                    class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-hover cursor-pointer transition-colors">
                                    <input type="checkbox" :value="project.id" v-model="selectedProjectIds"
                                        class="accent-accent w-3.5 h-3.5" />
                                    <span class="text-sm text-text-primary truncate">{{ project.name }}</span>
                                </label>
                            </div>
                        </div>
                    </section>

                    <!-- Export Options -->
                    <section class="bg-surface-elevated rounded-xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Include in
                            Export</h2>
                        <div class="space-y-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="exportOptions.includeOriginalFiles"
                                    class="accent-accent w-3.5 h-3.5" />
                                <div>
                                    <span class="text-sm text-text-primary">Original files</span>
                                    <p class="text-xs text-text-muted">PDF, Word, images and other uploaded files</p>
                                </div>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="exportOptions.includeMetadata"
                                    class="accent-accent w-3.5 h-3.5" />
                                <div>
                                    <span class="text-sm text-text-primary">Metadata</span>
                                    <p class="text-xs text-text-muted">Summaries, keywords, entities and authors</p>
                                </div>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="exportOptions.includeContent"
                                    class="accent-accent w-3.5 h-3.5" />
                                <div>
                                    <span class="text-sm text-text-primary">Extracted content</span>
                                    <p class="text-xs text-text-muted">HTML content and translations</p>
                                </div>
                            </label>
                        </div>
                    </section>

                    <!-- Export Action -->
                    <section class="bg-surface-elevated rounded-xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Download
                        </h2>
                        <div class="space-y-4">
                            <div class="text-sm text-text-secondary">
                                <p v-if="exportScope === 'all'">Exporting <strong>all projects</strong> with their
                                    resources.</p>
                                <p v-else-if="selectedProjectIds.length === 0">Select at least one project to export.
                                </p>
                                <p v-else>Exporting <strong>{{ selectedProjectIds.length }}</strong> project{{
                                    selectedProjectIds.length > 1 ? 's' : '' }}.</p>
                            </div>

                            <button @click="startExport"
                                :disabled="exporting || (exportScope === 'selected' && selectedProjectIds.length === 0)"
                                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                                :class="exporting || (exportScope === 'selected' && selectedProjectIds.length === 0)
                                    ? 'bg-border text-text-muted cursor-not-allowed'
                                    : 'bg-accent text-white hover:bg-accent-dark active:scale-[0.98]'">
                                <svg v-if="exporting" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                                    fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4" />
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                {{ exporting ? 'Exporting...' : 'Export ZIP' }}
                            </button>

                            <p v-if="exportError" class="text-xs text-red-500">{{ exportError }}</p>
                            <p v-if="exportSuccess" class="text-xs text-green-600">Export downloaded successfully.</p>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    </div>

    <div v-if="showThemeManager"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showThemeManager = false">
        <div class="bg-surface-elevated rounded-xl border border-border shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-semibold text-text-primary">Themes</h2>
                <button type="button" class="text-text-muted hover:text-text-primary cursor-pointer"
                    @click="showThemeManager = false" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <ThemeManager />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import PageHeader from '../components/ui/PageHeader.vue';
import { useTheme, type ThemeMode } from '../composables/useTheme';
import apiClient from '../services/api';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useFeatureStore } from '../store/featureStore';
import { useRouter } from 'vue-router';
import WorkspaceModal from '../components/WorkspaceModal.vue';
import ThemeManager from '../components/settings/ThemeManager.vue';
import { useThemes } from '../composables/useThemes';
import type { Workspace } from '../types/Workspace';

const { themeMode, setTheme } = useTheme();
const showThemeManager = ref(false);
const { themes, activeThemeId, refresh: refreshThemes, activateTheme } = useThemes();
const onActiveThemeChange = async () => {
    await activateTheme(activeThemeId.value);
};
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const projectStore = useProjectStore();
const featureStore = useFeatureStore();
const router = useRouter();

// ── Tabs ──
type TabId = 'general' | 'features' | 'workspaces' | 'server' | 'export';
const activeTab = ref<TabId>('general');
const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'features', label: 'Features' },
    { id: 'workspaces', label: 'Workspaces' },
    { id: 'server', label: 'Server' },
    { id: 'export', label: 'Export' },
];

const showWorkspaceModal = ref(false);
const editingWorkspace = ref<Workspace | null>(null);

function editWorkspace(ws: Workspace) {
    editingWorkspace.value = { ...ws };
}

async function handleWorkspaceSave(data: { name: string; url: string }) {
    if (editingWorkspace.value) {
        await workspaceStore.updateWorkspace({ ...editingWorkspace.value, ...data });
        editingWorkspace.value = null;
    } else {
        await workspaceStore.addWorkspace(data.name, data.url);
        showWorkspaceModal.value = false;
    }
}

async function switchToWorkspace(id: string) {
    authStore.reset();
    projectStore.clearCurrentProject();
    await workspaceStore.switchWorkspace(id);
    await authStore.checkAuthStatus();
    router.push('/');
}

async function deleteWorkspace(id: string) {
    await workspaceStore.removeWorkspace(id);
}

// ── Local server install state ──
const standaloneInstalled = ref({ backend: false, postgres: false, qdrant: false, neo4j: false, models: false });
const standaloneDownloading = ref(false);
const standaloneDownloadError = ref('');
const downloadProgress = ref({ component: '', downloaded: 0, total: 0, percent: 0 });
const gpuInfo = ref<{ available: boolean; name: string | null; cuda: boolean } | null>(null);
const standaloneFullyInstalled = computed(() =>
    standaloneInstalled.value.backend && standaloneInstalled.value.postgres
    && standaloneInstalled.value.qdrant && standaloneInstalled.value.neo4j
);

const coreServices = [
    { key: 'backend' as const, label: 'Backend (NestJS)', size: '~50 MB' },
    { key: 'postgres' as const, label: 'PostgreSQL', size: '~200 MB' },
    { key: 'qdrant' as const, label: 'Qdrant', size: '~40 MB' },
    { key: 'neo4j' as const, label: 'Neo4j', size: '~60 MB' },
];

async function loadStandaloneStatus() {
    if (window.electronAPI?.standaloneCheckInstalled) {
        standaloneInstalled.value = await window.electronAPI.standaloneCheckInstalled();
    }
    if (window.electronAPI?.standaloneDetectGpu) {
        gpuInfo.value = await window.electronAPI.standaloneDetectGpu();
    }
}

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

function onDownloadProgress(progress: { component: string; downloaded: number; total: number; percent: number }) {
    downloadProgress.value = progress;
}

const fontSizes = [12, 14, 16, 18, 20, 22, 24];
const fontFamilies = [
    { label: 'Sans Serif', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
];

const languages = [
    { label: 'English', code: 'en' },
    { label: 'Spanish', code: 'es' },
    { label: 'Italian', code: 'it' },
    { label: 'Portuguese', code: 'pt' },
    { label: 'German', code: 'de' },
    { label: 'French', code: 'fr' },
];

const themeOptions = [
    { label: 'Light', value: 'light' as ThemeMode, icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
    { label: 'Dark', value: 'dark' as ThemeMode, icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
    { label: 'System', value: 'system' as ThemeMode, icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

const fontSize = ref(16);
const fontFamily = ref('sans-serif');
const paragraphSpacing = ref(1.5);
const language = ref('en');
const theme = ref<ThemeMode>('system');
const defaultBrowserUrl = ref('https://github.com/electron/electron');

// Export state
const exportScope = ref<'all' | 'selected'>('all');
const selectedProjectIds = ref<number[]>([]);
const availableProjects = ref<{ id: number; name: string; description?: string }[]>([]);
const exporting = ref(false);
const exportError = ref('');
const exportSuccess = ref(false);
const exportOptions = ref({
    includeOriginalFiles: true,
    includeMetadata: true,
    includeContent: true,
});

const loadSettings = async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        if (settings) {
            fontSize.value = settings.fontSize || 16;
            fontFamily.value = settings.fontFamily || 'sans-serif';
            paragraphSpacing.value = settings.paragraphSpacing || 1.5;
            language.value = settings.language || 'en';
            theme.value = (settings.theme as ThemeMode) || 'system';
            activeThemeId.value = settings.themeId || 'default';
            defaultBrowserUrl.value = settings.defaultBrowserUrl || 'https://github.com/electron/electron';
        }
    }
};

const saveSettings = () => {
    if (window.electronAPI && window.electronAPI.setSettings) {
        setTheme(theme.value);
        window.electronAPI.setSettings({
            fontSize: fontSize.value,
            fontFamily: fontFamily.value,
            paragraphSpacing: paragraphSpacing.value,
            language: language.value,
            theme: theme.value,
            themeId: activeThemeId.value,
            defaultBrowserUrl: defaultBrowserUrl.value,
        });
    }
};

const loadProjects = async () => {
    try {
        const { data } = await apiClient.get('/export/projects');
        availableProjects.value = data;
    } catch {
        availableProjects.value = [];
    }
};

const startExport = async () => {
    exporting.value = true;
    exportError.value = '';
    exportSuccess.value = false;

    try {
        const response = await apiClient.post('/export', {
            projectIds: exportScope.value === 'all' ? [] : selectedProjectIds.value,
            includeOriginalFiles: exportOptions.value.includeOriginalFiles,
            includeMetadata: exportOptions.value.includeMetadata,
            includeContent: exportOptions.value.includeContent,
        }, {
            responseType: 'blob',
        });

        const contentDisposition = response.headers['content-disposition'];
        let filename = 'export.zip';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
            if (match) filename = match[1];
        }

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        exportSuccess.value = true;
    } catch (err: any) {
        exportError.value = err?.response?.data?.message || 'Failed to export. Please try again.';
    } finally {
        exporting.value = false;
    }
};

onMounted(() => {
    loadSettings();
    refreshThemes();
    loadProjects();
    loadStandaloneStatus();
    if (window.electronAPI?.onStandaloneDownloadProgress) {
        window.electronAPI.onStandaloneDownloadProgress(onDownloadProgress);
    }
});
</script>
