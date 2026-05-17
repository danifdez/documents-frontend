<template>
    <Transition name="files-panel">
        <aside v-if="show" class="files-panel"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            :class="{ 'files-panel-dragging': dragging }">
            <header class="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
                <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold text-text-primary">Working folder</h3>
                    <p class="text-[11px] text-text-muted truncate">
                        <template v-if="hasFolder">
                            {{ files.length }} {{ files.length === 1 ? 'file' : 'files' }} · drop files to add
                        </template>
                        <template v-else>
                            No folder configured
                        </template>
                    </p>
                </div>
                <button v-if="hasFolder" @click="handleReconcile" :disabled="reconciling"
                    class="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    title="Rescan folder">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75"
                        :class="{ 'animate-spin': reconciling }">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                <button @click="$emit('update:show', false)"
                    class="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                    title="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <div class="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                <div v-if="!hasFolder" class="text-xs text-text-muted italic text-center py-12 px-4">
                    Configure a working folder in the assistant settings to start.
                </div>

                <template v-else>
                    <div v-if="loading && files.length === 0" class="flex justify-center py-8">
                        <LoadingSpinner size="sm" />
                    </div>

                    <div v-else-if="files.length === 0 && uploads.length === 0"
                        class="text-xs text-text-muted italic text-center py-8 px-4">
                        No files yet. Drag and drop here to add some.
                    </div>

                    <!-- In-progress uploads -->
                    <div v-for="(u, i) in uploads" :key="`upload-${i}-${u.name}`"
                        class="rounded-lg border border-border bg-surface-elevated p-2.5 flex items-center gap-2">
                        <span class="text-base leading-none">{{ iconFor(u.name) }}</span>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-medium text-text-primary truncate">{{ u.name }}</div>
                            <div class="text-[11px] text-text-muted">
                                <template v-if="u.status === 'uploading'">Uploading…</template>
                                <template v-else-if="u.status === 'error'">⚠ {{ u.error }}</template>
                            </div>
                        </div>
                        <button v-if="u.status === 'error'" @click="uploads.splice(i, 1)"
                            class="text-[11px] text-text-muted hover:text-text-primary px-1 cursor-pointer">
                            ✕
                        </button>
                    </div>

                    <!-- Indexed files -->
                    <div v-for="file in files" :key="file.id"
                        class="rounded-lg border border-border bg-surface-elevated p-2.5 flex items-center gap-2 group">
                        <span class="text-base leading-none">{{ iconFor(file.filename) }}</span>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-medium text-text-primary truncate" :title="file.filename">
                                {{ file.filename }}
                            </div>
                            <div class="text-[11px] text-text-muted flex items-center gap-1.5 flex-wrap">
                                <span>{{ formatSize(file.size) }}</span>
                                <span>·</span>
                                <span>{{ formatRelative(file.mtime) }}</span>
                                <span v-if="file.hasExtractedText === null"
                                    class="badge badge-indexing">Indexing…</span>
                                <span v-else-if="file.hasExtractedText === false"
                                    class="badge badge-noextract">No text extracted</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button v-if="shellAvailable" @click="openFile(file)"
                                class="row-action" title="Open with default editor">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </button>
                            <button v-if="shellAvailable" @click="showInFolder(file)"
                                class="row-action" title="Show in folder">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </button>
                            <button @click="askDelete(file)"
                                class="row-action row-action-danger"
                                :disabled="deletingId === file.id"
                                title="Delete file">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </template>
            </div>

            <!-- Drag overlay -->
            <div v-if="dragging && hasFolder" class="drop-overlay">
                <div class="text-sm font-medium text-accent-dark">Drop to add to the working folder</div>
            </div>

            <!-- Delete confirmation -->
            <div v-if="pendingDelete" class="confirm-overlay" @click.self="pendingDelete = null">
                <div class="confirm-dialog">
                    <div class="text-sm font-semibold text-text-primary mb-2">Delete file?</div>
                    <div class="text-xs text-text-secondary mb-4 break-words">
                        <span class="font-mono">{{ pendingDelete.filename }}</span> will be removed from disk and from
                        the assistant's index. This cannot be undone.
                    </div>
                    <div class="flex justify-end gap-2">
                        <button @click="pendingDelete = null"
                            class="px-3 py-1.5 text-xs rounded border border-border hover:bg-surface-hover cursor-pointer">
                            Cancel
                        </button>
                        <button @click="confirmDelete"
                            class="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer disabled:opacity-50"
                            :disabled="deletingId === pendingDelete.id">
                            {{ deletingId === pendingDelete.id ? 'Deleting…' : 'Delete' }}
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import { useAssistantStore } from '../../store/assistantStore';
import { useIndexedFiles, type IndexedFile } from '../../services/assistants/useIndexedFiles';

const props = defineProps<{
    show: boolean;
    assistantId: number | null;
}>();

defineEmits<{
    (e: 'update:show', v: boolean): void;
}>();

const store = useAssistantStore();
const api = useIndexedFiles();

const files = ref<IndexedFile[]>([]);
const loading = ref(false);
const reconciling = ref(false);
const dragging = ref(false);
const deletingId = ref<number | null>(null);
const pendingDelete = ref<IndexedFile | null>(null);

interface PendingUpload {
    name: string;
    status: 'uploading' | 'error';
    error?: string;
}
const uploads = ref<PendingUpload[]>([]);

const shellAvailable = computed(() => !!window.shellOps);

const hasFolder = computed(() => {
    const a = store.activeAssistant;
    return !!(a && a.id === props.assistantId && a.folderScope);
});

async function refresh() {
    if (props.assistantId == null) return;
    if (!hasFolder.value) {
        files.value = [];
        return;
    }
    loading.value = true;
    try {
        files.value = await api.list(props.assistantId);
    } catch (e: any) {
        console.error('[files-panel] list failed', e);
    } finally {
        loading.value = false;
    }
}

async function handleReconcile() {
    if (props.assistantId == null) return;
    reconciling.value = true;
    try {
        await api.reconcile(props.assistantId);
        await refresh();
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Could not rescan the folder');
    } finally {
        reconciling.value = false;
    }
}

function onDragOver(_e: DragEvent) {
    if (!hasFolder.value) return;
    dragging.value = true;
}

function onDragLeave(e: DragEvent) {
    // Ignore leaves that bubble from children — only react when leaving the panel.
    if (e.currentTarget && (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
        return;
    }
    dragging.value = false;
}

async function onDrop(e: DragEvent) {
    dragging.value = false;
    if (!hasFolder.value || props.assistantId == null) return;
    const list = e.dataTransfer?.files;
    if (!list || list.length === 0) return;
    const toUpload = Array.from(list);
    for (const f of toUpload) {
        await uploadOne(f);
    }
    await refresh();
}

async function uploadOne(file: File) {
    if (props.assistantId == null) return;
    const slot: PendingUpload = { name: file.name, status: 'uploading' };
    uploads.value.push(slot);
    const idx = uploads.value.length - 1;
    try {
        await api.upload(props.assistantId, file);
        uploads.value.splice(idx, 1);
    } catch (e: any) {
        const code = e?.response?.data?.error;
        let msg: string;
        if (code === 'file_exists') {
            msg = 'Already exists; rename it before uploading.';
        } else if (code) {
            msg = code;
        } else {
            msg = e?.message || 'Upload failed';
        }
        uploads.value[idx] = { name: file.name, status: 'error', error: msg };
    }
}

async function openFile(file: IndexedFile) {
    if (!window.shellOps) return;
    const res = await window.shellOps.openPath(file.filePath);
    if (!res.ok) {
        alert(`Could not open: ${res.error ?? 'unknown error'}`);
    }
}

async function showInFolder(file: IndexedFile) {
    if (!window.shellOps) return;
    await window.shellOps.showItemInFolder(file.filePath);
}

function askDelete(file: IndexedFile) {
    pendingDelete.value = file;
}

async function confirmDelete() {
    if (!pendingDelete.value || props.assistantId == null) return;
    const target = pendingDelete.value;
    deletingId.value = target.id;
    try {
        await api.remove(props.assistantId, target.id);
        files.value = files.value.filter((f) => f.id !== target.id);
        pendingDelete.value = null;
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Could not delete the file');
    } finally {
        deletingId.value = null;
    }
}

function formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRelative(iso: string): string {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} d ago`;
    return d.toLocaleDateString();
}

function iconFor(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (['md', 'txt', 'rtf'].includes(ext)) return '📝';
    if (['pdf'].includes(ext)) return '📕';
    if (['doc', 'docx', 'odt'].includes(ext)) return '📄';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return '📊';
    if (['ppt', 'pptx', 'odp'].includes(ext)) return '📈';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'tiff'].includes(ext)) return '🖼️';
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus'].includes(ext)) return '🎵';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv'].includes(ext)) return '🎬';
    if (['json', 'xml', 'yaml', 'yml'].includes(ext)) return '🧾';
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return '🗜️';
    return '📄';
}

watch(
    () => [props.show, props.assistantId] as const,
    async ([show, id]) => {
        if (show && id != null) {
            await refresh();
        } else if (!show) {
            uploads.value = [];
        }
    },
    { immediate: true },
);

// React to chat-driven mutations (folder_write / folder_delete / overwrite) without polling.
watch(
    () => (props.assistantId != null ? store.folderFilesVersionFor(props.assistantId) : 0),
    () => {
        if (props.show && props.assistantId != null) {
            void refresh();
        }
    },
);
</script>

<style scoped>
.files-panel {
    width: 22rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface);
    border-left: 1px solid var(--color-border);
    position: relative;
}

.files-panel-dragging {
    outline: 2px dashed var(--color-accent);
    outline-offset: -4px;
}

.files-panel-enter-active,
.files-panel-leave-active {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.files-panel-enter-from,
.files-panel-leave-to {
    transform: translateX(20px);
    opacity: 0;
}

.badge {
    display: inline-block;
    padding: 0 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.badge-indexing {
    background-color: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent-dark);
}

.badge-noextract {
    background-color: color-mix(in srgb, rgb(217 119 6) 15%, transparent);
    color: rgb(180 83 9);
}

.row-action {
    padding: 0.25rem;
    border-radius: 0.25rem;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s;
}
.row-action:hover:not(:disabled) {
    color: var(--color-text-primary);
    background-color: var(--color-surface-hover);
}
.row-action-danger:hover:not(:disabled) {
    color: rgb(220 38 38);
    background-color: color-mix(in srgb, rgb(220 38 38) 10%, transparent);
}
.row-action:disabled { opacity: 0.5; cursor: wait; }

.drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
    pointer-events: none;
    z-index: 1;
}

.confirm-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 2;
}

.confirm-dialog {
    background-color: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 1rem;
    width: 100%;
    max-width: 20rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}
</style>
