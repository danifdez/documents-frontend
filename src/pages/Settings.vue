<template>
    <div class="h-full overflow-y-auto">
        <div class="px-6 py-6">
            <PageHeader title="Settings" subtitle="Configure your editor and application preferences"
                :divider="false" />

            <SegmentedControl v-model="activeTab" :options="tabs" class="mb-6" />

            <!-- General Tab -->
            <div v-show="activeTab === 'general'">
                <!-- Appearance -->
                <h2 class="text-sm font-semibold text-text-primary mb-4">Appearance</h2>
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

                <!-- Application -->
                <h2 class="text-sm font-semibold text-text-primary mt-8 mb-4">Application</h2>
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

                    <!-- Quick assistant shortcut -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Quick
                            assistant</h2>
                        <div class="text-xs text-text-muted mb-2">Open the floating assistant from anywhere.</div>
                        <div class="flex items-center gap-2">
                            <button @click="startQuickShortcutCapture" type="button"
                                class="flex-1 px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-left">
                                <span v-if="quickShortcutCaptureMode" class="text-text-muted">Press a key combination… (Esc
                                    to cancel)</span>
                                <span v-else-if="quickAssistantShortcut">{{ quickAssistantShortcut }}</span>
                                <span v-else class="text-text-muted">Click to set</span>
                            </button>
                            <button v-if="quickAssistantShortcut" @click="clearQuickShortcut" type="button"
                                class="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                                Clear
                            </button>
                        </div>
                        <div v-if="quickShortcutError" class="mt-2 text-xs text-red-500">{{ quickShortcutError }}</div>
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
                        <h2 class="text-xs font-semibold text-text-primary uppercase tracking-wider mb-4">Voice startup
                        </h2>
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

                <!-- Features -->
                <h2 class="text-sm font-semibold text-text-primary mt-8 mb-4">Features</h2>
                <p class="text-sm text-text-muted mb-4">Enable or disable application features. Server-disabled
                    features cannot be enabled here.</p>
                <p v-if="featureStore.standaloneMode" class="text-xs text-text-muted mb-4">Some changes restart the local
                    backend and AI service on this machine.</p>

                <div v-if="featuresError"
                    class="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {{ featuresError }}
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div v-for="flag in featureStore.featureFlags" :key="flag.key"
                        class="bg-surface-elevated rounded-2xl border border-border p-4 flex items-center justify-between">
                        <div>
                            <span class="text-sm font-medium text-text-primary">{{ flag.label }}</span>
                            <p v-if="flag.key === 'browser_federation'" class="text-xs text-text-muted mt-0.5">Let the personal assistant use a paired IA Browser in a separate tab.</p>
                            <p v-if="flag.key === 'browser_federation'" class="text-xs text-text-muted mt-0.5">{{ browserStatusText }}</p>
                            <p v-if="flag.key === 'browser_federation' && authStore.authRequired && !authStore.isAdmin" class="text-xs text-text-muted mt-0.5">An administrator can change this setting.</p>
                            <p v-if="!flag.backendEnabled" class="text-xs text-text-muted mt-0.5">Disabled by server
                            </p>
                            <p v-else-if="featuresApplyingKey === flag.key" class="text-xs text-text-muted mt-0.5">
                                Applying…</p>
                        </div>
                        <button v-if="flag.backendEnabled" @click="toggleFeature(flag.key)"
                            :disabled="featuresApplying || (flag.key === 'browser_federation' && authStore.authRequired && !authStore.isAdmin)"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <p class="text-sm text-text-muted mb-6">
                    <template v-if="standaloneFullyInstalled">Everything runs on this computer. Check that each part is
                        working below, and keep it up to date.</template>
                    <template v-else>Run Documents entirely on this computer — your documents never leave your
                        device.</template>
                </p>

                <!-- Download progress / errors (shared by install and update) -->
                <div v-if="standaloneDownloading" class="bg-surface-elevated rounded-2xl border border-border p-4 mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm text-text-secondary">Installing {{ friendlyComponent(downloadProgress.component) }}…</span>
                        <span class="text-xs text-text-muted">{{ downloadProgress.percent }}%</span>
                    </div>
                    <div class="w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <div class="h-full bg-accent rounded-full transition-all duration-300"
                            :style="{ width: downloadProgress.percent + '%' }"></div>
                    </div>
                </div>
                <div v-if="standaloneDownloadError"
                    class="mb-6 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    {{ standaloneDownloadError }}
                </div>

                <!-- ════ Installed → live service status (observability) ════ -->
                <template v-if="standaloneFullyInstalled">
                    <!-- Overall status -->
                    <section class="bg-surface-elevated rounded-2xl border border-border p-5 mb-6">
                        <div class="flex items-center gap-3">
                            <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="overallStatus.dot"></span>
                            <div class="min-w-0">
                                <h3 class="text-base font-semibold text-text-primary">{{ overallStatus.title }}</h3>
                                <p class="text-sm text-text-muted">{{ overallStatus.subtitle }}</p>
                            </div>
                        </div>
                    </section>

                    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        <!-- Core service cards -->
                        <section v-for="svc in serviceStatusList" :key="svc.key"
                            class="bg-surface-elevated rounded-2xl border border-border p-5 flex flex-col">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <h3 class="text-sm font-semibold text-text-primary">{{ svc.label }}</h3>
                                    <p class="text-xs text-text-muted mt-1">{{ svc.description }}</p>
                                </div>
                                <span class="shrink-0 inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-xs font-medium"
                                    :class="statusBadgeClass(serviceStatus[svc.key])">
                                    <span class="w-1.5 h-1.5 rounded-full"
                                        :class="statusDotClass(serviceStatus[svc.key])"></span>
                                    {{ statusLabel(serviceStatus[svc.key]) }}
                                </span>
                            </div>
                            <p v-if="serviceErrors[svc.key]"
                                class="mt-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 break-words whitespace-pre-wrap">
                                {{ serviceErrors[svc.key] }}</p>
                        </section>

                        <!-- AI assistant card -->
                        <section class="bg-surface-elevated rounded-2xl border border-border p-5 flex flex-col">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <h3 class="text-sm font-semibold text-text-primary">AI assistant</h3>
                                    <p class="text-xs text-text-muted mt-1">Powers the assistant, summaries,
                                        transcription and search.</p>
                                </div>
                                <span class="shrink-0 inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-xs font-medium"
                                    :class="statusBadgeClass(serviceStatus.models)">
                                    <span class="w-1.5 h-1.5 rounded-full"
                                        :class="statusDotClass(serviceStatus.models)"></span>
                                    {{ statusLabel(serviceStatus.models) }}
                                </span>
                            </div>

                            <!-- Hardware / acceleration note -->
                            <div v-if="gpuInfo" class="mt-3 text-xs px-3 py-2 rounded-lg"
                                :class="gpuInfo.available && gpuInfo.cuda ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-surface-hover text-text-muted'">
                                <template v-if="gpuInfo.available && gpuInfo.cuda">
                                    Graphics acceleration is active with {{ gpuInfo.name }}.
                                </template>
                                <template v-else-if="gpuInfo.available">
                                    {{ gpuInfo.name }} found. The assistant will run on the processor.
                                </template>
                                <template v-else>
                                    No graphics card found. The assistant runs on the processor.
                                </template>
                            </div>

                            <div class="mt-auto pt-4">
                                <p v-if="standaloneInstalled.models" class="text-xs text-text-muted">
                                    Installed on this computer · {{ modelsSize }}
                                </p>
                                <template v-else>
                                    <p class="text-xs text-text-muted mb-3">Not installed yet. Install it to use the
                                        assistant and search.</p>
                                    <div class="flex flex-wrap items-center gap-3">
                                        <button @click="installModels" :disabled="standaloneDownloading"
                                            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                            {{ standaloneDownloading ? 'Installing…' : 'Install AI assistant' }}
                                        </button>
                                        <label v-if="gpuInfo?.cuda"
                                            class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                                            <input type="checkbox" v-model="forceCpu" class="accent-accent w-3 h-3" />
                                            Use processor only
                                        </label>
                                    </div>
                                </template>
                            </div>
                        </section>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <!-- Updates -->
                        <section class="bg-surface-elevated rounded-2xl border border-border p-5 flex flex-col">
                            <h3 class="text-sm font-semibold text-text-primary">Updates</h3>
                            <p class="text-xs text-text-muted mt-1 mb-4">Install newer versions of the local services
                                without reinstalling Documents.</p>
                            <button @click="updateStandaloneServices" :disabled="standaloneDownloading"
                                class="self-start px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                {{ standaloneDownloading ? 'Updating…' : 'Update local services' }}
                            </button>
                        </section>

                        <!-- Advanced -->
                        <section class="bg-surface-elevated rounded-2xl border border-border p-5">
                            <button @click="showAdvanced = !showAdvanced"
                                class="w-full flex items-center justify-between gap-3 cursor-pointer">
                                <div class="text-left">
                                    <h3 class="text-sm font-semibold text-text-primary">Advanced</h3>
                                    <p class="text-xs text-text-muted mt-1">Connection address for browsers and other
                                        apps.</p>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4 text-text-muted transition-transform duration-200 shrink-0"
                                    :class="{ 'rotate-180': showAdvanced }" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            <div v-if="showAdvanced" class="mt-4 pt-4 border-t border-border">
                                <label class="block text-xs font-medium text-text-secondary mb-2">Local address</label>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm text-text-secondary shrink-0">127.0.0.1:</span>
                                    <input v-model.number="standalonePort" type="number" min="1024" max="65535"
                                        class="w-28 px-2 py-1.5 rounded-lg border border-border bg-surface text-sm text-text-primary" />
                                    <button @click="saveStandalonePort" :disabled="savingStandalonePort"
                                        class="px-3 py-1.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50">
                                        {{ savingStandalonePort ? 'Saving…' : 'Save' }}
                                    </button>
                                </div>
                                <p class="text-xs text-text-muted mt-2">Changing the port restarts the local server.</p>
                                <p v-if="standalonePortError" class="text-xs text-red-500 mt-2">{{ standalonePortError }}
                                </p>
                            </div>
                        </section>
                    </div>

                    <!-- Remove local server -->
                    <section class="mt-6 bg-surface-elevated rounded-2xl border border-border p-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 class="text-sm font-semibold text-text-primary">Remove local server</h3>
                            <p class="text-xs text-text-muted mt-1">Stops and removes the services from this computer.
                                Your documents and projects are kept.</p>
                        </div>
                        <button @click="uninstallStandalone"
                            class="shrink-0 px-4 py-2 rounded-lg border border-border text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                            Remove local server
                        </button>
                    </section>
                </template>

                <!-- ════ Not installed → install offer (hardware-gated) ════ -->
                <template v-else>
                    <!-- Checking hardware -->
                    <div v-if="!hardwareReport" class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <p class="text-sm text-text-muted">Checking your hardware…</p>
                    </div>

                    <!-- Hardware can't run it locally -->
                    <div v-else-if="!hardwareReport.canInstall"
                        class="bg-surface-elevated rounded-2xl border border-border p-5">
                        <h3 class="text-base font-semibold text-text-primary">This computer can't run Documents locally
                        </h3>
                        <p class="text-sm text-text-secondary mt-1">{{ hardwareReport.blockReason }}</p>
                        <p class="text-xs text-text-muted mt-3">You can still connect to a Documents server from the
                            Workspaces tab.</p>
                    </div>

                    <!-- Hardware allows installing -->
                    <template v-else>
                        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            <section v-for="svc in installComponents" :key="svc.label"
                                class="bg-surface-elevated rounded-2xl border border-border p-5">
                                <h3 class="text-sm font-semibold text-text-primary">{{ svc.label }}</h3>
                                <p class="text-xs text-text-muted mt-1">{{ svc.description }}</p>
                            </section>
                        </div>

                        <section class="bg-surface-elevated rounded-2xl border border-border p-5 mt-6">
                            <h3 class="text-sm font-semibold text-text-primary">Ready to install</h3>
                            <p class="text-xs text-text-muted mt-1">{{ hardwareSummary }}</p>
                            <p class="text-xs text-text-muted mt-1">
                                Download: about {{ hardwareReport.install.downloadGB }} GB
                            </p>
                            <div v-if="hardwareReport.install.status === 'slow'"
                                class="mt-2 text-xs text-amber-600 dark:text-amber-500">
                                Runs slowly<template v-if="hardwareReport.install.reason"> — {{
                                    hardwareReport.install.reason }}</template>
                            </div>
                            <button @click="installStandalone" :disabled="standaloneDownloading"
                                class="mt-4 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                {{ standaloneDownloading ? 'Installing…' : 'Install local server' }}
                            </button>
                        </section>
                    </template>
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
import SegmentedControl from '../components/ui/SegmentedControl.vue';
import { useTheme, type ThemeMode } from '../composables/useTheme';
import { useElectronApi } from '../composables/useElectronApi';
import { useStandaloneManager, type ServiceKey } from '../composables/useStandaloneManager';
import { useExport } from '../services/export/useExport';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useFeatureStore } from '../store/featureStore';
import apiClient from '../services/api';
import { useRouter } from 'vue-router';
import WorkspaceModal from '../components/WorkspaceModal.vue';
import VoiceSettings from '../components/settings/VoiceSettings.vue';
import { isLocalEngineAvailable } from '../services/voice/availability';
import type { Workspace } from '../types/Workspace';

const { setTheme } = useTheme();
const { isElectron, getSettings, setSettings } = useElectronApi();
const voiceLocalAvailable = isLocalEngineAvailable();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const projectStore = useProjectStore();
const featureStore = useFeatureStore();
const router = useRouter();

// ── Tabs ──
type TabId = 'general' | 'workspaces' | 'server' | 'export';
const activeTab = ref<TabId>('general');
const tabs: { value: TabId; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'workspaces', label: 'Workspaces' },
    { value: 'server', label: 'Server' },
    { value: 'export', label: 'Export' },
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

// ── Feature toggles ──
const featuresApplying = ref(false);
const featuresApplyingKey = ref<string | null>(null);
const featuresError = ref('');
const browserStatus = ref<'ready' | 'update_required' | 'offline' | 'not_paired' | 'unavailable' | null>(null);
const browserStatusText = computed(() => {
    if (!featureStore.isEnabled('browser_federation')) return 'Turn this on to allow browser tasks.';
    if (browserStatus.value === 'ready') return 'IA Browser is connected and ready.';
    if (browserStatus.value === 'update_required') return 'Update IA Browser to use assistant tasks.';
    if (browserStatus.value === 'offline') return 'Open the paired IA Browser to use this feature.';
    if (browserStatus.value === 'not_paired') return 'Pair IA Browser in its Documents settings.';
    if (browserStatus.value === 'unavailable') return 'Could not check the browser connection.';
    return 'Checking the browser connection…';
});

async function loadBrowserStatus() {
    try {
        const { data } = await apiClient.get<{ enabled: boolean; browser: typeof browserStatus.value }>(
            '/features/browser-federation/status',
        );
        browserStatus.value = data.browser;
        featureStore.setBackendFeatures({
            ...featureStore.backendFeatures,
            browser_federation: data.enabled,
        });
    } catch {
        browserStatus.value = 'unavailable';
    }
}

let browserStatusTimer: ReturnType<typeof setInterval> | null = null;

async function toggleFeature(key: string) {
    if (featuresApplying.value) return;
    featuresApplying.value = true;
    featuresApplyingKey.value = key;
    featuresError.value = '';
    try {
        const result = await featureStore.toggleLocalFeature(key);
        if (result && !result.success) {
            featuresError.value = result.error || 'Could not update the feature. Please try again.';
        }
        if (key === 'browser_federation' && result?.success) await loadBrowserStatus();
    } catch (e: any) {
        featuresError.value = e?.message || 'Could not update the feature. Please try again.';
    } finally {
        featuresApplying.value = false;
        featuresApplyingKey.value = null;
    }
}

// ── Local server (standalone) lifecycle ──
const {
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
    subscribeDownloadProgress,
} = useStandaloneManager();

// User-facing description of the parts installed and running on this machine.
const installComponents = [
    { label: 'Database', description: 'Stores your projects, documents and settings.' },
    { label: 'Application server', description: 'Runs Documents and keeps everything in sync.' },
    { label: 'AI assistant', description: 'Powers the assistant, summaries, transcription and search.' },
];

// ── Live service status (observability, shown once standalone is installed) ──
const serviceStatusList: { key: ServiceKey; label: string; description: string }[] = [
    { key: 'postgres', label: 'Database', description: 'Stores your projects, documents and settings.' },
    { key: 'backend', label: 'Application server', description: 'Runs Documents and keeps everything in sync.' },
];

// Friendly names for the installer progress steps.
const COMPONENT_LABELS: Record<string, string> = {
    node: 'system files',
    postgres: 'the database',
    backend: 'the application server',
    'models-cpu': 'the AI assistant',
    'models-gpu': 'the AI assistant',
    'ai-models': 'the AI models',
};

function friendlyComponent(component: string): string {
    return COMPONENT_LABELS[component] || 'the local server';
}

const showAdvanced = ref(false);

const standalonePort = ref(32100);
const savingStandalonePort = ref(false);
const standalonePortError = ref('');

async function loadStandalonePort() {
    if (!isElectron || !window.electronAPI?.standaloneGetPort) return;
    standalonePort.value = await window.electronAPI.standaloneGetPort();
}

async function saveStandalonePort() {
    if (!isElectron || !window.electronAPI?.standaloneSetPort) return;
    savingStandalonePort.value = true;
    standalonePortError.value = '';
    try {
        const result = await window.electronAPI.standaloneSetPort(standalonePort.value);
        if (!result.success) standalonePortError.value = result.error || 'Could not update the local API port.';
    } finally {
        savingStandalonePort.value = false;
    }
}

function statusDotClass(state: string): string {
    if (state === 'running') return 'bg-green-500';
    if (state === 'starting') return 'bg-amber-500 animate-pulse';
    if (state === 'error') return 'bg-red-500';
    return 'bg-border';
}
function statusLabel(state: string): string {
    if (state === 'not_installed') return 'Not installed';
    if (state === 'stopped') return 'Stopped';
    return state.charAt(0).toUpperCase() + state.slice(1);
}
function statusBadgeClass(state: string): string {
    if (state === 'running') return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
    if (state === 'starting') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500';
    if (state === 'error') return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
    return 'bg-surface-hover text-text-muted';
}

// Plain-language summary shown at the top of the Server tab.
const overallStatus = computed(() => {
    const states = serviceStatusList.map((svc) => serviceStatus.value[svc.key]);
    if (states.includes('error')) {
        return { dot: 'bg-red-500', title: 'Something needs attention', subtitle: 'One or more parts could not start. See the details below.' };
    }
    if (states.includes('starting')) {
        return { dot: 'bg-amber-500 animate-pulse', title: 'Starting up…', subtitle: 'The local services are getting ready.' };
    }
    if (states.includes('stopped')) {
        return { dot: 'bg-border', title: 'Local server is stopped', subtitle: 'Start it again from the Workspaces tab.' };
    }
    if (serviceStatus.value.models === 'not_installed') {
        return { dot: 'bg-green-500', title: 'Local server is running', subtitle: 'Install the AI assistant below to use the assistant and search.' };
    }
    return { dot: 'bg-green-500', title: 'Everything is running', subtitle: 'All local services are working normally.' };
});

// Poll only while the Server tab is open and the local server is installed.
watch(
    [activeTab, standaloneFullyInstalled],
    ([tab, installed]) => {
        if (tab === 'server' && installed) startStatusPolling();
        else stopStatusPolling();
    },
    { immediate: true },
);

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

// ── Application tab ──
const closeBehavior = ref<'tray' | 'quit'>('tray');
const launchAtLogin = ref(false);
const toggleShortcut = ref<string | null>(null);
const quickAssistantShortcut = ref<string | null>(null);
const hideDockIcon = ref(false);
const preloadVoiceModel = ref(false);
const shortcutCaptureMode = ref(false);
const quickShortcutCaptureMode = ref(false);
const shortcutError = ref<string | null>(null);
const quickShortcutError = ref<string | null>(null);
const platform = ref<'darwin' | 'win32' | 'linux' | 'other'>('other');
const trayAvailable = ref(true);

// Export state
const exportScope = ref<'all' | 'selected'>('all');
const selectedProjectIds = ref<number[]>([]);
const { availableProjects, exporting, exportError, exportSuccess, loadProjects, exportProjects } = useExport();

const loadSettings = async () => {
    const settings = await getSettings();
    if (settings) {
        fontSize.value = settings.fontSize || 16;
        fontFamily.value = settings.fontFamily || 'sans-serif';
        paragraphSpacing.value = settings.paragraphSpacing || 1.5;
        language.value = settings.language || 'en';
        theme.value = (settings.theme as ThemeMode) || 'system';
        closeBehavior.value = settings.closeBehavior === 'quit' ? 'quit' : 'tray';
        launchAtLogin.value = !!settings.launchAtLogin;
        toggleShortcut.value = settings.toggleShortcut ?? null;
        quickAssistantShortcut.value = settings.quickAssistantShortcut ?? null;
        hideDockIcon.value = !!settings.hideDockIcon;
        preloadVoiceModel.value = !!settings.preloadVoiceModel;
    }
};

// getPlatform/getTrayAvailable are not wrapped by useElectronApi, so this is
// the one place that still reads window.electronAPI directly (typed, guarded).
async function loadAppRuntimeInfo() {
    if (window.electronAPI?.getPlatform) {
        try {
            const p = await window.electronAPI.getPlatform();
            platform.value = (p === 'darwin' || p === 'win32' || p === 'linux') ? p : 'other';
        } catch { /* keep default */ }
    }
    if (window.electronAPI?.getTrayAvailable) {
        try {
            trayAvailable.value = !!(await window.electronAPI.getTrayAvailable());
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
        // keep the residente prefs in every settings payload so
        // unrelated saves don't drop them.
        closeBehavior: closeBehavior.value,
        launchAtLogin: launchAtLogin.value,
        toggleShortcut: toggleShortcut.value,
        quickAssistantShortcut: quickAssistantShortcut.value,
        hideDockIcon: hideDockIcon.value,
        preloadVoiceModel: preloadVoiceModel.value,
    };
}

const saveSettings = () => {
    if (isElectron) {
        setTheme(theme.value);
        setSettings(currentSettingsPayload());
    }
};

async function saveAppSettings() {
    if (!isElectron) return;
    const result = await setSettings(currentSettingsPayload());
    if (result && typeof result === 'object' && result.shortcutOk === false) {
        shortcutError.value = 'Shortcut is already in use by another application.';
    } else {
        shortcutError.value = null;
    }
    if (result && typeof result === 'object' && result.quickShortcutOk === false) {
        quickShortcutError.value = 'Shortcut is already in use by another application.';
    } else {
        quickShortcutError.value = null;
    }
}

function captureShortcut(target: 'main' | 'quick') {
    const isMain = target === 'main';
    const mode = isMain ? shortcutCaptureMode : quickShortcutCaptureMode;
    if (mode.value) return;
    mode.value = true;
    if (isMain) shortcutError.value = null;
    else quickShortcutError.value = null;

    const cleanup = () => {
        window.removeEventListener('keydown', handler, true);
        window.removeEventListener('keydown', escHandler, true);
        mode.value = false;
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
            const value = parts.join('+');
            if (isMain) toggleShortcut.value = value;
            else quickAssistantShortcut.value = value;
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

function startShortcutCapture() {
    captureShortcut('main');
}

function startQuickShortcutCapture() {
    captureShortcut('quick');
}

function clearShortcut() {
    toggleShortcut.value = null;
    void saveAppSettings();
}

function clearQuickShortcut() {
    quickAssistantShortcut.value = null;
    void saveAppSettings();
}

const startExport = () =>
    exportProjects(exportScope.value === 'all' ? [] : selectedProjectIds.value);

onMounted(() => {
    loadSettings();
    loadAppRuntimeInfo();
    loadProjects();
    loadStandaloneStatus();
    loadHardwareReport();
    loadStandalonePort();
    subscribeDownloadProgress();
    void loadBrowserStatus();
    browserStatusTimer = setInterval(() => { void loadBrowserStatus(); }, 10_000);
});
onUnmounted(() => {
    if (browserStatusTimer) clearInterval(browserStatusTimer);
});
</script>
