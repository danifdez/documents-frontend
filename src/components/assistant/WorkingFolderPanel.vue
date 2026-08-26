<template>
    <Transition name="folder-panel">
        <aside v-if="show" class="working-folder-panel relative flex shrink-0 flex-col border-l border-border bg-surface"
            :class="{ 'outline-2 outline-offset-[-4px] outline-dashed outline-accent': dragging }"
            @dragover.prevent="dragging = hasFolder"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop">
            <header class="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
                <div class="min-w-0 flex-1">
                    <h3 class="text-sm font-semibold text-text-primary">Working folder</h3>
                    <p class="truncate text-[11px] text-text-muted">
                        <template v-if="hasFolder">
                            {{ files.length }} {{ files.length === 1 ? 'file' : 'files' }} · drop files to add
                        </template>
                        <template v-else>No folder configured</template>
                    </p>
                </div>
                <button v-if="hasFolder" class="row-action" :disabled="reconciling" title="Rescan folder"
                    @click="reconcile">
                    <span :class="{ 'inline-block animate-spin': reconciling }">↻</span>
                </button>
                <button class="row-action" title="Close" @click="$emit('update:show', false)">✕</button>
            </header>

            <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
                <div v-if="!hasFolder" class="px-4 py-12 text-center text-xs italic text-text-muted">
                    Choose a working folder to make its files available here.
                </div>
                <div v-else-if="loading && files.length === 0" class="flex justify-center py-8">
                    <LoadingSpinner size="sm" />
                </div>
                <div v-else-if="files.length === 0 && uploads.length === 0"
                    class="px-4 py-8 text-center text-xs italic text-text-muted">
                    No files yet. Drag and drop here to add one.
                </div>

                <div v-for="upload in uploads" :key="upload.name"
                    class="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated p-2.5">
                    <span>{{ iconFor(upload.name) }}</span>
                    <div class="min-w-0 flex-1">
                        <div class="truncate text-xs font-medium text-text-primary">{{ upload.name }}</div>
                        <div class="text-[11px] text-text-muted">
                            {{ upload.error ? `⚠ ${upload.error}` : 'Uploading…' }}
                        </div>
                    </div>
                </div>

                <div v-for="file in files" :key="file.id"
                    class="group flex items-center gap-2 rounded-lg border border-border bg-surface-elevated p-2.5">
                    <span>{{ iconFor(file.filename) }}</span>
                    <div class="min-w-0 flex-1">
                        <div class="truncate text-xs font-medium text-text-primary" :title="file.filename">
                            {{ file.filename }}
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                            <span>{{ formatSize(file.size) }}</span>
                            <span>·</span>
                            <span>{{ formatRelative(file.mtime) }}</span>
                            <span v-if="file.hasExtractedText === null">· Indexing…</span>
                        </div>
                    </div>
                    <div class="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button v-if="shellAvailable" class="row-action" title="Open file" @click="openFile(file)">↗</button>
                        <button v-if="shellAvailable" class="row-action" title="Show in folder"
                            @click="showInFolder(file)">⌕</button>
                        <button class="row-action hover:!text-red-600" title="Delete file"
                            @click="pendingDelete = file">⌫</button>
                    </div>
                </div>
            </div>

            <div v-if="dragging && hasFolder"
                class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-accent-subtle/90 text-sm font-medium text-accent-dark">
                Drop to add to the working folder
            </div>

            <div v-if="pendingDelete" class="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
                @click.self="pendingDelete = null">
                <div class="w-full max-w-80 rounded-lg border border-border bg-surface-elevated p-4 shadow-xl">
                    <h4 class="mb-2 text-sm font-semibold text-text-primary">Delete file?</h4>
                    <p class="mb-4 break-words text-xs text-text-secondary">
                        <code>{{ pendingDelete.filename }}</code> will be removed from disk and from the index.
                    </p>
                    <div class="flex justify-end gap-2">
                        <button class="rounded border border-border px-3 py-1.5 text-xs" @click="pendingDelete = null">
                            Cancel
                        </button>
                        <button class="rounded bg-red-600 px-3 py-1.5 text-xs text-white" :disabled="deleting"
                            @click="removePending">
                            {{ deleting ? 'Deleting…' : 'Delete' }}
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
import {
    useIndexedFiles,
    type IndexedFile,
    type WorkingFolderOwnerType,
} from '../../services/indexedFiles/useIndexedFiles';

const props = defineProps<{
    show: boolean;
    ownerType: WorkingFolderOwnerType | null;
    ownerId: number | null;
    folderScope: string | null;
}>();

defineEmits<{ (event: 'update:show', value: boolean): void }>();

const api = useIndexedFiles();
const files = ref<IndexedFile[]>([]);
const loading = ref(false);
const reconciling = ref(false);
const dragging = ref(false);
const deleting = ref(false);
const pendingDelete = ref<IndexedFile | null>(null);
const uploads = ref<Array<{ name: string; error?: string }>>([]);

const hasFolder = computed(() => Boolean(props.folderScope));
const shellAvailable = computed(() => Boolean(window.shellOps));

async function refresh() {
    if (!props.ownerType || props.ownerId === null || !hasFolder.value) {
        files.value = [];
        return;
    }
    loading.value = true;
    try {
        files.value = await api.list(props.ownerType, props.ownerId);
    } finally {
        loading.value = false;
    }
}

async function reconcile() {
    if (!props.ownerType || props.ownerId === null) return;
    reconciling.value = true;
    try {
        await api.reconcile(props.ownerType, props.ownerId);
        await refresh();
    } finally {
        reconciling.value = false;
    }
}

function onDragLeave(event: DragEvent) {
    if ((event.currentTarget as HTMLElement | null)?.contains(event.relatedTarget as Node)) return;
    dragging.value = false;
}

async function onDrop(event: DragEvent) {
    dragging.value = false;
    if (!props.ownerType || props.ownerId === null || !hasFolder.value) return;
    for (const file of Array.from(event.dataTransfer?.files ?? [])) {
        const upload = { name: file.name, error: undefined as string | undefined };
        uploads.value.push(upload);
        try {
            await api.upload(props.ownerType, props.ownerId, file);
            uploads.value = uploads.value.filter((item) => item !== upload);
        } catch (error: any) {
            upload.error = error?.response?.data?.error || error?.message || 'Upload failed';
        }
    }
    await refresh();
}

async function openFile(file: IndexedFile) {
    const result = await window.shellOps?.openPath(file.filePath);
    if (result && !result.ok) alert(result.error || 'Could not open the file');
}

async function showInFolder(file: IndexedFile) {
    await window.shellOps?.showItemInFolder(file.filePath);
}

async function removePending() {
    if (!pendingDelete.value || !props.ownerType || props.ownerId === null) return;
    deleting.value = true;
    try {
        await api.remove(props.ownerType, props.ownerId, pendingDelete.value.id);
        files.value = files.value.filter((file) => file.id !== pendingDelete.value?.id);
        pendingDelete.value = null;
    } finally {
        deleting.value = false;
    }
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(value: string): string {
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return `${Math.floor(hours / 24)} d ago`;
}

function iconFor(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (['md', 'txt', 'rtf'].includes(extension ?? '')) return '📝';
    if (extension === 'pdf') return '📕';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension ?? '')) return '🖼️';
    if (['json', 'xml', 'yaml', 'yml'].includes(extension ?? '')) return '🧾';
    return '📄';
}

watch(
    () => [props.show, props.ownerType, props.ownerId, props.folderScope] as const,
    ([show]) => {
        if (show) void refresh();
        else uploads.value = [];
    },
    { immediate: true },
);
</script>

<style scoped>
.row-action {
    cursor: pointer;
    border-radius: 0.25rem;
    padding: 0.25rem 0.375rem;
    color: var(--color-text-muted);
}
.working-folder-panel {
    width: 22rem;
}
.row-action:hover:not(:disabled) {
    color: var(--color-text-primary);
    background: var(--color-surface-hover);
}
.folder-panel-enter-active,
.folder-panel-leave-active {
    transition: transform 0.2s ease, opacity 0.2s ease;
}
.folder-panel-enter-from,
.folder-panel-leave-to {
    transform: translateX(1rem);
    opacity: 0;
}
</style>
