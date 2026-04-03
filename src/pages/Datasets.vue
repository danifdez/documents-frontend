<template>
    <div class="h-full flex flex-col">
        <!-- Header bar -->
        <div
            class="shrink-0 px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
                <h1 class="text-lg font-semibold text-text-primary tracking-tight">Datasets</h1>
                <span class="text-xs text-text-muted hidden sm:inline">Manage structured data collections</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <!-- Search -->
                <div class="relative">
                    <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input v-model="searchTerm" type="text" placeholder="Search..."
                        class="w-48 pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:w-64 transition-all" />
                </div>
                <button @click="showImportModal = true"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Import File
                </button>
                <button @click="openProviderModal"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    Sync from Provider
                </button>
                <button @click="showCreateModal = true"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-dark text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 3v14m7-7H3" />
                    </svg>
                    New Dataset
                </button>
            </div>
        </div>

        <!-- Loading -->
        <LoadingSpinner v-if="loading" size="lg" fullHeight />

        <!-- Empty state -->
        <EmptyState v-else-if="datasets.length === 0" icon="database" title="No datasets yet"
            description="Create a dataset to start managing structured data" />

        <!-- Dataset list -->
        <div v-else class="flex-1 flex flex-col overflow-hidden">
            <!-- Table header -->
            <div
                class="shrink-0 grid grid-cols-[1fr_6rem_8rem_6.5rem] gap-3 px-4 py-2 border-b border-border bg-surface text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                <span>Name</span>
                <span class="text-center">Fields</span>
                <span class="text-center">Records</span>
                <span class="text-right">Actions</span>
            </div>
            <!-- Scrollable rows -->
            <div class="flex-1 overflow-y-auto divide-y divide-border-light">
                <div v-for="dataset in filteredDatasets" :key="dataset.id"
                    class="group grid grid-cols-[1fr_6rem_8rem_6.5rem] gap-3 items-center px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer"
                    @click="router.push(`/datasets/${dataset.id}`)">
                    <div class="min-w-0">
                        <span class="text-sm font-medium text-text-primary truncate block">{{ dataset.name }}</span>
                        <span v-if="dataset.description" class="text-xs text-text-muted truncate block mt-0.5">
                            {{ dataset.description }}
                        </span>
                        <span v-if="dataset.project" class="text-[10px] text-accent mt-0.5 block">
                            {{ dataset.project.name }}
                        </span>
                    </div>
                    <span class="text-sm text-text-secondary text-center">{{ dataset.schema.length }}</span>
                    <span class="text-sm text-text-secondary text-center">{{ dataset.recordCount || 0 }}</span>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end"
                        @click.stop>
                        <button @click="router.push(`/datasets/${dataset.id}`)"
                            class="p-1.5 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                            title="View">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button @click="confirmDelete(dataset)"
                            class="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <!-- Footer -->
            <div class="shrink-0 px-4 py-2 border-t border-border bg-surface text-xs text-text-muted">
                {{ filteredDatasets.length }} datasets
            </div>
        </div>

        <!-- Create Dataset Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showCreateModal"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div
                        class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light">
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">New Dataset</h3>
                        </div>
                        <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Name *</label>
                                <input v-model="createForm.name" type="text"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="e.g. Casas, Coches..." />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
                                <textarea v-model="createForm.description" rows="2"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                                    placeholder="Optional description"></textarea>
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Fields *</label>
                                <DatasetSchemaEditor v-model="createForm.schema" />
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="showCreateModal = false" variant="secondary">Cancel</Button>
                            <Button @click="handleCreate" variant="info"
                                :disabled="!createForm.name.trim() || createForm.schema.length === 0 || creating">
                                {{ creating ? 'Creating...' : 'Create' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Import from File Modal -->
        <CsvImportDatasetModal :is-open="showImportModal" @close="showImportModal = false" @imported="handleImported" />

        <!-- Import from Provider Modal -->
        <DataSourceConfigModal :is-open="showProviderModal" :providers="providers" @close="showProviderModal = false"
            @created="handleProviderCreated" />

        <!-- Delete Confirm -->
        <ConfirmModal :is-open="showDeleteModal" title="Delete Dataset"
            :message="`Are you sure you want to delete &quot;${datasetToDelete?.name}&quot;? All records will be permanently deleted.`"
            confirm-text="Delete" cancel-text="Cancel" confirm-variant="danger" @confirm="handleDelete"
            @cancel="showDeleteModal = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDatasets, type Dataset, type DatasetField, type ImportFromFileResult } from '../services/datasets/useDatasets';
import { useDataSources, type DataSourceProvider } from '../services/data-sources/useDataSources';
import { useNotification } from '../composables/useNotification';
import Button from '../components/ui/Button.vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import DatasetSchemaEditor from '../components/datasets/DatasetSchemaEditor.vue';
import CsvImportDatasetModal from '../components/datasets/CsvImportDatasetModal.vue';
import DataSourceConfigModal from '../components/data-sources/DataSourceConfigModal.vue';

const router = useRouter();
const { getAllDatasets, createDataset, deleteDataset } = useDatasets();
const { getProviders } = useDataSources();
const notification = useNotification();

const datasets = ref<Dataset[]>([]);
const loading = ref(true);
const searchTerm = ref('');

// Data source providers
const providers = ref<DataSourceProvider[]>([]);
const showProviderModal = ref(false);

const openProviderModal = async () => {
    if (!providers.value.length) {
        try {
            providers.value = await getProviders();
        } catch {
            notification.error('Failed to load providers');
            return;
        }
    }
    showProviderModal.value = true;
};

const handleProviderCreated = async () => {
    // DataSource sync auto-creates a Dataset; reload the list
    try {
        datasets.value = await getAllDatasets();
        datasets.value.sort((a, b) => a.name.localeCompare(b.name));
        notification.success('Dataset imported from provider');
    } catch {
        notification.error('Failed to reload datasets');
    }
};

const filteredDatasets = computed(() => {
    const q = searchTerm.value.trim().toLowerCase();
    if (!q) return datasets.value;
    return datasets.value.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q)
    );
});

// Create
const showCreateModal = ref(false);
const creating = ref(false);
const createForm = ref<{ name: string; description: string; schema: DatasetField[] }>({
    name: '', description: '', schema: [],
});

const handleCreate = async () => {
    if (!createForm.value.name.trim() || createForm.value.schema.length === 0) return;
    creating.value = true;
    try {
        const created = await createDataset({
            name: createForm.value.name.trim(),
            description: createForm.value.description.trim() || undefined,
            schema: createForm.value.schema,
        });
        datasets.value.push(created);
        datasets.value.sort((a, b) => a.name.localeCompare(b.name));
        showCreateModal.value = false;
        createForm.value = { name: '', description: '', schema: [] };
        notification.success(`"${created.name}" created`);
    } catch {
        notification.error('Failed to create dataset');
    } finally {
        creating.value = false;
    }
};

// Import from file
const showImportModal = ref(false);

const handleImported = (result: ImportFromFileResult) => {
    datasets.value.push(result.dataset);
    datasets.value.sort((a, b) => a.name.localeCompare(b.name));
};

// Delete
const showDeleteModal = ref(false);
const datasetToDelete = ref<Dataset | null>(null);

const confirmDelete = (dataset: Dataset) => {
    datasetToDelete.value = dataset;
    showDeleteModal.value = true;
};

const handleDelete = async () => {
    showDeleteModal.value = false;
    if (!datasetToDelete.value) return;
    try {
        await deleteDataset(datasetToDelete.value.id);
        datasets.value = datasets.value.filter(d => d.id !== datasetToDelete.value!.id);
        notification.success(`"${datasetToDelete.value.name}" deleted`);
    } catch {
        notification.error('Failed to delete dataset');
    } finally {
        datasetToDelete.value = null;
    }
};

onMounted(async () => {
    try {
        datasets.value = await getAllDatasets();
    } catch {
        notification.error('Failed to load datasets');
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.modal-enter-active {
    transition: opacity 0.2s ease;
}

.modal-leave-active {
    transition: opacity 0.15s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
