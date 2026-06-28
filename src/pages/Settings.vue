<template>
    <div class="h-full overflow-y-auto">
        <div class="px-6 py-6">
            <PageHeader title="Settings" subtitle="Configure your editor and application preferences"
                :divider="false" />

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
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
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
                    </section>

                    <!-- Language -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
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
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
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

                    <!-- Voice (only when local engine is bundled) -->
                    <section v-if="voiceLocalAvailable" class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Voice</h2>
                        <VoiceSettings />
                    </section>

                    <!-- Editor Appearance -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
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

            <!-- Application Tab -->
            <div v-show="activeTab === 'application'">
                <p class="text-sm text-text-muted mb-4">
                    Control how the app behaves when you close the window, how it starts with your session, and the
                    global shortcut to bring it back from the tray.
                </p>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    <!-- Close behavior -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Close behavior
                        </h2>
                        <div v-if="!trayAvailable"
                            class="mb-3 text-xs text-text-secondary p-2 bg-surface rounded border border-border">
                            Your environment does not expose a system tray. The app will run in classic mode (close =
                            quit).
                        </div>
                        <div class="space-y-2">
                            <label class="flex items-start gap-2 cursor-pointer">
                                <input type="radio" value="tray" v-model="closeBehavior" :disabled="!trayAvailable"
                                    @change="saveAppSettings" class="accent-accent mt-1" />
                                <div>
                                    <div class="text-sm text-text-primary">Keep running in tray (recommended)</div>
                                    <div class="text-xs text-text-muted">Closing the window hides it. Use Exit from the
                                        tray icon to quit.</div>
                                </div>
                            </label>
                            <label class="flex items-start gap-2 cursor-pointer">
                                <input type="radio" value="quit" v-model="closeBehavior" @change="saveAppSettings"
                                    class="accent-accent mt-1" />
                                <div>
                                    <div class="text-sm text-text-primary">Quit on close</div>
                                    <div class="text-xs text-text-muted">Closing the window quits the app entirely
                                        (classic mode).</div>
                                </div>
                            </label>
                        </div>
                    </section>

                    <!-- Launch at login -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Startup</h2>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" v-model="launchAtLogin" :disabled="platform === 'linux'"
                                @change="saveAppSettings" class="accent-accent mt-1" />
                            <div>
                                <div class="text-sm text-text-primary">Launch at login</div>
                                <div class="text-xs text-text-muted">
                                    <span v-if="platform === 'linux'">Not supported on Linux yet.</span>
                                    <span v-else>Starts hidden in the tray, without opening the window.</span>
                                </div>
                            </div>
                        </label>
                    </section>

                    <!-- Global shortcut -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Global
                            shortcut</h2>
                        <div class="text-xs text-text-muted mb-2">Show or hide the window from anywhere.</div>
                        <div class="flex items-center gap-2">
                            <button @click="startShortcutCapture" type="button"
                                class="flex-1 px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-left">
                                <span v-if="shortcutCaptureMode" class="text-text-muted">Press a key combination… (Esc
                                    to cancel)</span>
                                <span v-else-if="toggleShortcut">{{ toggleShortcut }}</span>
                                <span v-else class="text-text-muted">Click to set</span>
                            </button>
                            <button v-if="toggleShortcut" @click="clearShortcut" type="button"
                                class="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                                Clear
                            </button>
                        </div>
                        <div v-if="shortcutError" class="mt-2 text-xs text-red-500">{{ shortcutError }}</div>
                        <p class="mt-2 text-xs text-text-muted">If the shortcut stops working, another app may have
                            taken it — re-set it here.</p>
                    </section>

                    <!-- macOS dock -->
                    <section v-if="platform === 'darwin'"
                        class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">macOS dock
                        </h2>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" v-model="hideDockIcon" @change="saveAppSettings"
                                class="accent-accent mt-1" />
                            <div>
                                <div class="text-sm text-text-primary">Hide dock icon</div>
                                <div class="text-xs text-text-muted">The app stays accessible from the menu bar tray
                                    only.</div>
                            </div>
                        </label>
                    </section>

                    <!-- Voice preload -->
                    <section v-if="voiceLocalAvailable" class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Voice</h2>
                        <label class="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" v-model="preloadVoiceModel" @change="saveAppSettings"
                                class="accent-accent mt-1" />
                            <div>
                                <div class="text-sm text-text-primary">Preload voice model on startup</div>
                                <div class="text-xs text-text-muted">Faster first dictation, ~200 MB more RAM. Applies
                                    on next launch.</div>
                            </div>
                        </label>
                    </section>

                </div>
            </div>

            <!-- Features Tab -->
            <div v-show="activeTab === 'features'">
                <p class="text-sm text-text-muted mb-4">Enable or disable application features. Server-disabled
                    features cannot be enabled here.</p>

                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div v-for="flag in featureStore.featureFlags" :key="flag.key"
                        class="bg-surface-elevated rounded-2xl border border-border p-4 flex items-center justify-between">
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
                            <button v-if="ws.id !== workspaceStore.activeWorkspaceId" @click="switchToWorkspace(ws.id)"
                                class="text-xs text-accent hover:underline cursor-pointer">Switch</button>
                            <button v-if="ws.type !== 'local'" @click="editWorkspace(ws)"
                                class="text-xs text-text-secondary hover:underline cursor-pointer">Edit</button>
                            <button v-if="ws.id !== workspaceStore.defaultWorkspaceId"
                                @click="workspaceStore.setDefaultWorkspace(ws.id)"
                                class="text-xs text-text-secondary hover:underline cursor-pointer">Set default</button>
                            <button v-else @click="workspaceStore.setDefaultWorkspace(null)"
                                class="text-xs text-text-muted hover:underline cursor-pointer">Unset default</button>
                            <button v-if="workspaceStore.workspaces.length > 1 && ws.type !== 'local'"
                                @click="deleteWorkspace(ws.id)"
                                class="text-xs text-red-500 hover:underline cursor-pointer">Remove</button>
                        </div>
                    </div>

                    <button @click="showWorkspaceModal = true"
                        class="bg-surface-elevated rounded-2xl border border-dashed border-border p-4 flex items-center justify-center gap-2 text-sm text-text-muted hover:bg-surface-hover hover:border-text-muted transition-colors cursor-pointer">
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

                <!-- ════ Installed → live service status (observability) ════ -->
                <template v-if="standaloneFullyInstalled">
                    <p class="text-sm text-text-muted mb-4">Local server status — services running on this machine</p>

                    <div class="bg-surface-elevated rounded-2xl border border-border p-5 max-w-lg">
                        <h3 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Services</h3>
                        <div class="space-y-3">
                            <div v-for="svc in serviceStatusList" :key="svc.key">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full"
                                            :class="statusDotClass(serviceStatus[svc.key])"></span>
                                        <span class="text-sm text-text-primary">{{ svc.label }}</span>
                                    </div>
                                    <span class="text-xs" :class="statusTextClass(serviceStatus[svc.key])">{{
                                        statusLabel(serviceStatus[svc.key]) }}</span>
                                </div>
                                <p v-if="serviceErrors[svc.key]"
                                    class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mt-1.5 ml-4 break-words whitespace-pre-wrap">
                                    {{ serviceErrors[svc.key] }}</p>
                            </div>
                        </div>

                        <!-- AI / Inference Models (optional — manage here) -->
                        <div class="mt-5 pt-4 border-t border-border">
                            <h3 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">AI /
                                Inference</h3>
                            <p class="text-xs text-text-muted mb-3">Document extraction, transcription, translation,
                                entity recognition, summarization, semantic search.</p>

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

                            <!-- Download progress -->
                            <div v-if="standaloneDownloading" class="mb-3">
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
                                class="mb-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                                {{ standaloneDownloadError }}
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

                        <!-- Uninstall local server -->
                        <div class="mt-5 pt-4 border-t border-border">
                            <button @click="uninstallStandalone"
                                class="px-4 py-2 rounded-lg border border-border text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                                Uninstall local server
                            </button>
                        </div>
                    </div>
                </template>

                <!-- ════ Not installed → install offer (hardware-gated) ════ -->
                <template v-else>
                    <p class="text-sm text-text-muted mb-4">Install and run all services locally on this machine</p>

                    <div class="bg-surface-elevated rounded-2xl border border-border p-5 max-w-lg">
                        <!-- Checking hardware -->
                        <p v-if="!hardwareReport" class="text-sm text-text-muted">Checking your hardware…</p>

                        <!-- Hardware can't run it locally -->
                        <template v-else-if="!hardwareReport.canInstall">
                            <p class="text-sm text-text-secondary">This machine can't run Documents locally.</p>
                            <p class="text-xs text-text-muted mt-1">{{ hardwareReport.blockReason }}</p>
                        </template>

                        <!-- Hardware allows installing -->
                        <template v-else>
                            <h3 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Core
                                Services</h3>
                            <div class="space-y-3 mb-4">
                                <div v-for="svc in coreServices" :key="svc.key"
                                    class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full"
                                            :class="standaloneInstalled[svc.key] ? 'bg-green-500' : 'bg-border'"></span>
                                        <span class="text-sm text-text-primary">{{ svc.label }}</span>
                                    </div>
                                    <span class="text-xs text-text-muted">{{ svc.size }}</span>
                                </div>
                            </div>

                            <p class="text-xs text-text-muted mb-3">{{ hardwareSummary }}</p>
                            <div v-if="hardwareReport.install.status === 'slow'"
                                class="mb-3 text-xs text-amber-600 dark:text-amber-500">
                                Runs slowly<template v-if="hardwareReport.install.reason"> — {{
                                    hardwareReport.install.reason }}</template>
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

                            <button @click="installStandalone" :disabled="standaloneDownloading"
                                class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                {{ standaloneDownloading ? 'Installing...' : 'Install Local Server (~350 MB)' }}
                            </button>
                        </template>
                    </div>
                </template>
            </div>

            <!-- Export Tab -->
            <div v-show="activeTab === 'export'">
                <p class="text-sm text-text-muted mb-4">Export resources from your projects as a ZIP archive</p>

                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                    <!-- Project Selection -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
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

                    <!-- Export Action -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
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

</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import PageHeader from '../components/ui/PageHeader.vue';
import { useTheme, type ThemeMode } from '../composables/useTheme';
import apiClient from '../services/api';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useFeatureStore } from '../store/featureStore';
import { useRouter } from 'vue-router';
import WorkspaceModal from '../components/WorkspaceModal.vue';
import VoiceSettings from '../components/settings/VoiceSettings.vue';
import { isLocalEngineAvailable } from '../services/voice/availability';
import type { Workspace } from '../types/Workspace';

const { setTheme } = useTheme();
const voiceLocalAvailable = isLocalEngineAvailable();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const projectStore = useProjectStore();
const featureStore = useFeatureStore();
const router = useRouter();

// ── Tabs ──
type TabId = 'general' | 'application' | 'features' | 'workspaces' | 'server' | 'export';
const activeTab = ref<TabId>('general');
const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'application', label: 'Application' },
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
const standaloneInstalled = ref({ backend: false, postgres: false, models: false });
const standaloneDownloading = ref(false);
const standaloneDownloadError = ref('');
const downloadProgress = ref({ component: '', downloaded: 0, total: 0, percent: 0 });
const gpuInfo = ref<{ available: boolean; name: string | null; cuda: boolean } | null>(null);
const standaloneFullyInstalled = computed(() =>
    standaloneInstalled.value.backend && standaloneInstalled.value.postgres
);

const coreServices = [
    { key: 'backend' as const, label: 'Backend (NestJS)', size: '~50 MB' },
    { key: 'postgres' as const, label: 'PostgreSQL', size: '~200 MB' },
];

// ── Live service status (observability, shown once standalone is installed) ──
type ServiceKey = 'postgres' | 'backend' | 'models';
const serviceStatusList: { key: ServiceKey; label: string }[] = [
    { key: 'postgres', label: 'PostgreSQL' },
    { key: 'backend', label: 'Backend (NestJS)' },
    { key: 'models', label: 'Models Service' },
];
const serviceStatus = ref<Record<ServiceKey, string>>({
    postgres: 'stopped', backend: 'stopped', models: 'not_installed',
});
const serviceErrors = ref<Partial<Record<ServiceKey, string>>>({});

function statusDotClass(state: string): string {
    if (state === 'running') return 'bg-green-500';
    if (state === 'starting') return 'bg-amber-500 animate-pulse';
    if (state === 'error') return 'bg-red-500';
    return 'bg-border';
}
function statusLabel(state: string): string {
    if (state === 'not_installed') return 'Not installed';
    return state.charAt(0).toUpperCase() + state.slice(1);
}
function statusTextClass(state: string): string {
    if (state === 'running') return 'text-green-600 dark:text-green-400';
    if (state === 'error') return 'text-red-500';
    return 'text-text-muted';
}

async function refreshServiceStatus() {
    if (!window.electronAPI?.standaloneStatus) return;
    const res = await window.electronAPI.standaloneStatus();
    serviceStatus.value = res.services as Record<ServiceKey, string>;
    serviceErrors.value = (res.errors ?? {}) as Partial<Record<ServiceKey, string>>;
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
// Poll only while the Server tab is open and the local server is installed.
watch(
    [activeTab, standaloneFullyInstalled],
    ([tab, installed]) => {
        if (tab === 'server' && installed) startStatusPolling();
        else stopStatusPolling();
    },
    { immediate: true },
);
onUnmounted(stopStatusPolling);

// ── Hardware report (gates the install offer when not yet installed) ──
interface HardwareReport {
    hardware: { cpuModel: string; cpuCores: number; ramGB: number; freeDiskGB: number | null; gpu: { name: string | null; vramGB: number } };
    canInstall: boolean;
    blockReason: string;
    install: { status: 'yes' | 'slow' | 'no'; reason: string; downloadGB: number; components: string[]; bundle: string };
}
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
    if (window.electronAPI?.standaloneHardwareReport) {
        hardwareReport.value = await window.electronAPI.standaloneHardwareReport();
    }
}

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

// ── Application tab ──
const closeBehavior = ref<'tray' | 'quit'>('tray');
const launchAtLogin = ref(false);
const toggleShortcut = ref<string | null>(null);
const hideDockIcon = ref(false);
const preloadVoiceModel = ref(false);
const shortcutCaptureMode = ref(false);
const shortcutError = ref<string | null>(null);
const platform = ref<'darwin' | 'win32' | 'linux' | 'other'>('other');
const trayAvailable = ref(true);

// Export state
const exportScope = ref<'all' | 'selected'>('all');
const selectedProjectIds = ref<number[]>([]);
const availableProjects = ref<{ id: number; name: string; description?: string }[]>([]);
const exporting = ref(false);
const exportError = ref('');
const exportSuccess = ref(false);

const loadSettings = async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        if (settings) {
            fontSize.value = settings.fontSize || 16;
            fontFamily.value = settings.fontFamily || 'sans-serif';
            paragraphSpacing.value = settings.paragraphSpacing || 1.5;
            language.value = settings.language || 'en';
            theme.value = (settings.theme as ThemeMode) || 'system';
            defaultBrowserUrl.value = settings.defaultBrowserUrl || 'https://github.com/electron/electron';
            closeBehavior.value = settings.closeBehavior === 'quit' ? 'quit' : 'tray';
            launchAtLogin.value = !!settings.launchAtLogin;
            toggleShortcut.value = settings.toggleShortcut ?? null;
            hideDockIcon.value = !!settings.hideDockIcon;
            preloadVoiceModel.value = !!settings.preloadVoiceModel;
        }
    }
};

async function loadAppRuntimeInfo() {
    const api: any = window.electronAPI;
    if (api?.getPlatform) {
        try {
            const p = (await api.getPlatform()) as string;
            platform.value = (p === 'darwin' || p === 'win32' || p === 'linux') ? p : 'other';
        } catch { /* keep default */ }
    }
    if (api?.getTrayAvailable) {
        try {
            trayAvailable.value = !!(await api.getTrayAvailable());
        } catch { /* keep default */ }
    }
}

function currentSettingsPayload() {
    return {
        fontSize: fontSize.value,
        fontFamily: fontFamily.value,
        paragraphSpacing: paragraphSpacing.value,
        language: language.value,
        theme: theme.value,
        defaultBrowserUrl: defaultBrowserUrl.value,
        // keep the residente prefs in every settings payload so
        // unrelated saves don't drop them.
        closeBehavior: closeBehavior.value,
        launchAtLogin: launchAtLogin.value,
        toggleShortcut: toggleShortcut.value,
        hideDockIcon: hideDockIcon.value,
        preloadVoiceModel: preloadVoiceModel.value,
    };
}

const saveSettings = () => {
    if (window.electronAPI && window.electronAPI.setSettings) {
        setTheme(theme.value);
        window.electronAPI.setSettings(currentSettingsPayload());
    }
};

async function saveAppSettings() {
    if (!window.electronAPI?.setSettings) return;
    const result: any = await window.electronAPI.setSettings(currentSettingsPayload());
    if (result && typeof result === 'object' && result.shortcutOk === false) {
        shortcutError.value = 'Shortcut is already in use by another application.';
    } else {
        shortcutError.value = null;
    }
}

function startShortcutCapture() {
    if (shortcutCaptureMode.value) return;
    shortcutCaptureMode.value = true;
    shortcutError.value = null;

    const cleanup = () => {
        window.removeEventListener('keydown', handler, true);
        window.removeEventListener('keydown', escHandler, true);
        shortcutCaptureMode.value = false;
    };

    const handler = (e: KeyboardEvent) => {
        // Use capture phase + preventDefault so TipTap and other editors
        // don't swallow the combo while the user is configuring it.
        e.preventDefault();
        e.stopPropagation();
        const parts: string[] = [];
        if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        const k = e.key;
        if (k && !['Control', 'Shift', 'Alt', 'Meta'].includes(k)) {
            parts.push(k.length === 1 ? k.toUpperCase() : k);
            toggleShortcut.value = parts.join('+');
            cleanup();
            void saveAppSettings();
        }
    };
    const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cleanup();
        }
    };
    window.addEventListener('keydown', handler, true);
    window.addEventListener('keydown', escHandler, true);
}

function clearShortcut() {
    toggleShortcut.value = null;
    void saveAppSettings();
}

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
    loadAppRuntimeInfo();
    loadProjects();
    loadStandaloneStatus();
    loadHardwareReport();
    if (window.electronAPI?.onStandaloneDownloadProgress) {
        window.electronAPI.onStandaloneDownloadProgress(onDownloadProgress);
    }
});
</script>
