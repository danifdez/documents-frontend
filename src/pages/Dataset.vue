<template>
    <div class="h-full flex flex-col">
        <!-- Loading -->
        <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
        </div>

        <template v-else-if="dataset">
            <!-- Header bar -->
            <div class="shrink-0 px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0">
                    <button @click="router.push('/datasets')"
                        class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer shrink-0">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 class="text-lg font-semibold text-text-primary tracking-tight truncate">{{ dataset.name }}</h1>
                    <span v-if="dataset.project"
                        class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-subtle text-accent shrink-0">
                        {{ dataset.project.name }}
                    </span>
                    <span v-if="dataset.description"
                        class="text-xs text-text-muted truncate hidden lg:inline">{{ dataset.description }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button @click="showRecordForm = true"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-dark text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        New Record
                    </button>
                    <button @click="showImportModal = true"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Import CSV
                    </button>
                    <button @click="activeTab = activeTab === 'schema' ? 'data' : 'schema'"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {{ activeTab === 'schema' ? 'Data' : 'Schema' }}
                    </button>
                </div>
            </div>

            <!-- Tabs strip -->
            <div class="shrink-0 px-4 py-1.5 border-b border-border bg-surface flex items-center gap-1">
                <button v-for="tab in tabs" :key="tab.key"
                    @click="activeTab = tab.key"
                    class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
                    :class="activeTab === tab.key
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:bg-surface-hover'">
                    <component :is="tab.icon" class="h-3.5 w-3.5" />
                    {{ tab.label }}
                </button>
            </div>

            <!-- Content area -->
            <div class="flex-1 overflow-auto">
                <!-- Schema editor -->
                <div v-if="activeTab === 'schema'" class="p-4">
                    <div class="max-w-lg space-y-4">
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1">Dataset name</label>
                            <input v-model="editableName" type="text"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1">Description</label>
                            <input v-model="editableDescription" type="text" placeholder="Optional description"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Fields</label>
                            <DatasetSchemaEditor v-model="editableSchema" />
                        </div>
                        <div class="flex gap-2">
                            <Button @click="saveSchema" variant="info" :disabled="savingSchema || analyzingSchema">
                                {{ analyzingSchema ? 'Analyzing...' : savingSchema ? 'Saving...' : 'Save' }}
                            </Button>
                        </div>
                    </div>
                </div>

                <!-- Data tab -->
                <div v-if="activeTab === 'data'" class="h-full flex flex-col">
                    <!-- Inline filter bar + view toggle -->
                    <div class="shrink-0 px-4 py-2 border-b border-border-light bg-surface/50 space-y-2">
                        <DatasetFilterBar :schema="dataset.schema" v-model:filters="filters"
                            v-model:search-term="searchTerm" @apply="applyFilters" @search="applyFilters" />
                        <div class="flex items-center gap-1">
                            <button @click="dataView = 'table'"
                                class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
                                :class="dataView === 'table' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-hover'">
                                Table
                            </button>
                            <button @click="dataView = 'chart'"
                                class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
                                :class="dataView === 'chart' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-hover'">
                                Chart
                            </button>
                        </div>
                    </div>

                    <!-- Table view -->
                    <div v-if="dataView === 'table'" class="flex-1 overflow-auto">
                        <DatasetRecordTable :schema="dataset.schema" :records="records" :total="totalRecords" :page="page"
                            :limit="limit" :sort-field="sortField" :sort-order="sortOrder" @edit="editRecord"
                            @delete="confirmDeleteRecord" @page="changePage" @sort="toggleSort" />
                    </div>

                    <!-- Chart view -->
                    <div v-if="dataView === 'chart'" class="flex-1 overflow-auto">
                        <DatasetChartBuilder :schema="dataset.schema" :result="chartResult" :running="chartRunning"
                            :filters="activeChartFilters" @run="runChartWithFilters" />
                    </div>
                </div>

                <!-- Correlation Matrix tab -->
                <div v-if="activeTab === 'correlation'" class="p-4">
                    <DatasetCorrelationMatrix :schema="dataset.schema" :result="correlationResult" :running="correlationRunning" @run="runCorrelation" />
                </div>

                <!-- Outliers tab -->
                <div v-if="activeTab === 'outliers'" class="p-4">
                    <DatasetOutlierPanel :schema="dataset.schema" :result="outlierResult" :running="outlierRunning" @run="runOutliers" />
                </div>

                <!-- Pivot Table tab -->
                <div v-if="activeTab === 'pivot'" class="p-4">
                    <DatasetPivotTable :schema="dataset.schema" :result="pivotResult" :running="pivotRunning" @run="runPivot" />
                </div>

                <!-- Stats tab -->
                <div v-if="activeTab === 'stats'" class="p-4">
                    <DatasetStatsPanel :schema="dataset.schema" :result="statsResult" :running="statsRunning" @run="runStats" />
                </div>

            </div>
        </template>

        <!-- Record Form Modal -->
        <DatasetRecordForm v-if="dataset" :is-open="showRecordForm" :schema="dataset.schema"
            :record="editingRecord" @close="closeRecordForm" @save="handleSaveRecord" />

        <!-- CSV Import Modal -->
        <CsvImportModal v-if="dataset" :is-open="showImportModal" :dataset-id="dataset.id" :schema="dataset.schema"
            @close="showImportModal = false" @upload-preview="handleCsvUpload" @confirm-import="handleCsvConfirm"
            @imported="handleImported" />

        <!-- Delete Record Confirm -->
        <ConfirmModal :is-open="showDeleteRecordModal" title="Delete Record"
            message="Are you sure you want to delete this record? This cannot be undone."
            confirm-text="Delete" cancel-text="Cancel" confirm-variant="danger" @confirm="handleDeleteRecord"
            @cancel="showDeleteRecordModal = false" />

        <!-- Schema Change Warning Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showSchemaWarning && schemaAnalysis"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light flex items-center gap-2">
                            <svg class="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">Schema change impacts</h3>
                        </div>
                        <div class="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
                            <!-- Removed fields -->
                            <div v-if="schemaAnalysis.removedFields.length > 0">
                                <h4 class="text-sm font-medium text-red-600 mb-2">Removed fields with existing data</h4>
                                <div class="space-y-1.5">
                                    <div v-for="field in schemaAnalysis.removedFields" :key="field.key"
                                        class="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                                        <div>
                                            <span class="text-sm font-medium text-red-800">{{ field.name }}</span>
                                            <span class="text-xs text-red-600 ml-1">({{ field.key }})</span>
                                        </div>
                                        <span class="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                            {{ field.affectedRecords }} records affected
                                        </span>
                                    </div>
                                </div>
                                <p class="text-xs text-text-muted mt-1.5">Data in these fields will become inaccessible after the schema change.</p>
                            </div>

                            <!-- Type changes -->
                            <div v-if="schemaAnalysis.typeChanges.length > 0">
                                <h4 class="text-sm font-medium text-amber-600 mb-2">Type changes</h4>
                                <div class="space-y-1.5">
                                    <div v-for="change in schemaAnalysis.typeChanges" :key="change.key"
                                        class="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span class="text-sm font-medium text-amber-800">{{ change.name }}</span>
                                                <span class="text-xs text-amber-600">
                                                    {{ change.oldType }}
                                                    <svg class="inline h-3 w-3 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                    {{ change.newType }}
                                                </span>
                                            </div>
                                            <span v-if="change.incompatibleRecords > 0"
                                                class="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                {{ change.incompatibleRecords }} incompatible
                                            </span>
                                            <span v-else
                                                class="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                All compatible
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p class="text-xs text-text-muted mt-1.5">Incompatible values will not match the new type and may cause validation errors.</p>
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="cancelSchemaChange" variant="secondary">Cancel</Button>
                            <Button @click="applySchemaChange" variant="warning" :disabled="savingSchema">
                                {{ savingSchema ? 'Applying...' : 'Apply anyway' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDatasets, type Dataset, type DatasetRecord, type DatasetField, type CsvPreview, type ImportResult, type SchemaAnalysis } from '../services/datasets/useDatasets';
import { useNotification } from '../composables/useNotification';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import DatasetRecordTable from '../components/datasets/DatasetRecordTable.vue';
import DatasetRecordForm from '../components/datasets/DatasetRecordForm.vue';
import DatasetSchemaEditor from '../components/datasets/DatasetSchemaEditor.vue';
import DatasetFilterBar from '../components/datasets/DatasetFilterBar.vue';
import DatasetStatsPanel from '../components/datasets/DatasetStatsPanel.vue';
import DatasetChartBuilder from '../components/datasets/DatasetChartBuilder.vue';
import DatasetCorrelationMatrix from '../components/datasets/DatasetCorrelationMatrix.vue';
import DatasetOutlierPanel from '../components/datasets/DatasetOutlierPanel.vue';
import DatasetPivotTable from '../components/datasets/DatasetPivotTable.vue';
import CsvImportModal from '../components/datasets/CsvImportModal.vue';

const TabIcon = (paths: string[]) => ({
    render: () => h('svg', { class: 'h-3.5 w-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
        paths.map(d => h('path', { d })))
});

const tabs = [
    { key: 'data', label: 'Data', icon: TabIcon(['M3 10h18M3 14h18M3 6h18M3 18h18']) },
    { key: 'correlation', label: 'Correlation', icon: TabIcon(['M4 4v16h16', 'M8 16V9', 'M12 16V4', 'M16 16v-5']) },
    { key: 'outliers', label: 'Outliers', icon: TabIcon(['M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z']) },
    { key: 'pivot', label: 'Pivot Table', icon: TabIcon(['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z']) },
    { key: 'stats', label: 'Stats', icon: TabIcon(['M16 8v8', 'M12 11v5', 'M8 14v2', 'M4 18h16']) },
];

const route = useRoute();
const router = useRouter();
const notification = useNotification();
const {
    getDataset, updateDataset,
    getRecords, createRecord, updateRecord, deleteRecord,
    uploadCsvPreview, confirmCsvImport,
    analyzeSchemaChange,
    requestStats, getStatsResult,
} = useDatasets();

// State
const dataset = ref<Dataset | null>(null);
const records = ref<DatasetRecord[]>([]);
const totalRecords = ref(0);
const loading = ref(true);
const activeTab = ref('data');
const dataView = ref<'table' | 'chart'>('table');

// Pagination & sorting
const page = ref(1);
const limit = ref(50);
const sortField = ref('');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Filters
const filters = ref<{ field: string; operator: string; value: string }[]>([]);
const searchTerm = ref('');

// Schema editing
const editableSchema = ref<DatasetField[]>([]);
const editableName = ref('');
const editableDescription = ref('');
const savingSchema = ref(false);
const schemaAnalysis = ref<SchemaAnalysis | null>(null);
const analyzingSchema = ref(false);
const showSchemaWarning = ref(false);

// Record form
const showRecordForm = ref(false);
const editingRecord = ref<DatasetRecord | null>(null);

// CSV import
const showImportModal = ref(false);

// Delete record
const showDeleteRecordModal = ref(false);
const recordToDelete = ref<DatasetRecord | null>(null);

const datasetId = Number(route.params.id);

const loadRecords = async () => {
    if (!dataset.value) return;
    const params: Record<string, any> = {
        page: page.value,
        limit: limit.value,
    };

    if (sortField.value) {
        params.sort = sortField.value;
        params.order = sortOrder.value;
    }

    if (searchTerm.value) {
        params.search = searchTerm.value;
    }

    // Add filters
    for (const f of filters.value) {
        if (f.field && f.value) {
            params[`filter[${f.field}_${f.operator}]`] = f.value;
        }
    }

    const result = await getRecords(datasetId, params);
    records.value = result.records;
    totalRecords.value = result.total;
};

const changePage = (newPage: number) => {
    page.value = newPage;
    loadRecords();
};

const toggleSort = (field: string) => {
    if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortOrder.value = 'asc';
    }
    loadRecords();
};

const applyFilters = () => {
    page.value = 1;
    loadRecords();
};

// Schema
const saveSchema = async () => {
    if (!dataset.value) return;

    // Analyze impact first
    analyzingSchema.value = true;
    try {
        const analysis = await analyzeSchemaChange(dataset.value.id, editableSchema.value);
        schemaAnalysis.value = analysis;

        if (!analysis.safe) {
            showSchemaWarning.value = true;
            return;
        }

        await applySchemaChange();
    } catch {
        notification.error('Failed to analyze schema changes');
    } finally {
        analyzingSchema.value = false;
    }
};

const applySchemaChange = async () => {
    if (!dataset.value) return;
    showSchemaWarning.value = false;
    savingSchema.value = true;
    try {
        dataset.value = await updateDataset(dataset.value.id, {
            name: editableName.value.trim() || dataset.value.name,
            description: editableDescription.value.trim() || undefined,
            schema: editableSchema.value,
        });
        editableName.value = dataset.value.name;
        editableDescription.value = dataset.value.description || '';
        editableSchema.value = [...dataset.value.schema];
        schemaAnalysis.value = null;
        notification.success('Schema updated');
    } catch {
        notification.error('Failed to update schema');
    } finally {
        savingSchema.value = false;
    }
};

const cancelSchemaChange = () => {
    showSchemaWarning.value = false;
    schemaAnalysis.value = null;
};

// Record CRUD
const editRecord = (record: DatasetRecord) => {
    editingRecord.value = record;
    showRecordForm.value = true;
};

const closeRecordForm = () => {
    showRecordForm.value = false;
    editingRecord.value = null;
};

const handleSaveRecord = async (data: Record<string, any>) => {
    try {
        if (editingRecord.value) {
            await updateRecord(datasetId, editingRecord.value.id, data);
            notification.success('Record updated');
        } else {
            await createRecord(datasetId, data);
            notification.success('Record created');
        }
        closeRecordForm();
        await loadRecords();
    } catch {
        notification.error('Failed to save record');
    }
};

const confirmDeleteRecord = (record: DatasetRecord) => {
    recordToDelete.value = record;
    showDeleteRecordModal.value = true;
};

const handleDeleteRecord = async () => {
    showDeleteRecordModal.value = false;
    if (!recordToDelete.value) return;
    try {
        await deleteRecord(datasetId, recordToDelete.value.id);
        notification.success('Record deleted');
        await loadRecords();
    } catch {
        notification.error('Failed to delete record');
    } finally {
        recordToDelete.value = null;
    }
};

// CSV Import
const handleCsvUpload = async (file: File, callback: (preview: CsvPreview) => void) => {
    try {
        const preview = await uploadCsvPreview(datasetId, file);
        callback(preview);
    } catch {
        notification.error('Failed to parse CSV');
    }
};

const handleCsvConfirm = async (file: File, mappings: { csvColumn: string; fieldKey: string }[], callback: (result: ImportResult) => void) => {
    try {
        const result = await confirmCsvImport(datasetId, file, mappings);
        callback(result);
    } catch {
        notification.error('Failed to import CSV');
    }
};

const handleImported = () => {
    loadRecords();
};

// Generic async job runner
const createJobRunner = (errorMsg: string) => {
    const result = ref<Record<string, any> | null>(null);
    const running = ref(false);
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async (operation: string, params: Record<string, any>) => {
        running.value = true;
        result.value = null;
        if (timer) clearInterval(timer);
        try {
            const { jobId } = await requestStats(datasetId, operation, params);
            timer = setInterval(async () => {
                try {
                    const { status, result: r } = await getStatsResult(datasetId, jobId);
                    if (status === 'completed' || status === 'processed') {
                        result.value = r;
                        running.value = false;
                        if (timer) clearInterval(timer);
                    } else if (status === 'failed') {
                        result.value = { error: errorMsg };
                        running.value = false;
                        if (timer) clearInterval(timer);
                    }
                } catch { /* keep polling */ }
            }, 2000);
        } catch {
            notification.error(errorMsg);
            running.value = false;
        }
    };

    return { result, running, run };
};

// Stats
const { result: statsResult, running: statsRunning, run: runStats } = createJobRunner('Analysis failed');

// Charts
const { result: chartResult, running: chartRunning, run: runChart } = createJobRunner('Chart generation failed');

// Build active filters for chart (pass current query filters to chart operation)
const activeChartFilters = computed(() => {
    return filters.value
        .filter(f => f.field && f.value)
        .map(f => ({ field: f.field, operator: f.operator, value: f.value }));
});

const runChartWithFilters = (operation: string, params: Record<string, any>) => {
    const filtersPayload = activeChartFilters.value;
    if (filtersPayload.length > 0) {
        params.filters = filtersPayload;
    }
    if (searchTerm.value) {
        params.search = searchTerm.value;
    }
    runChart(operation, params);
};

// Correlation
const { result: correlationResult, running: correlationRunning, run: runCorrelation } = createJobRunner('Correlation analysis failed');

// Outliers
const { result: outlierResult, running: outlierRunning, run: runOutliers } = createJobRunner('Outlier detection failed');

// Pivot Table
const { result: pivotResult, running: pivotRunning, run: runPivot } = createJobRunner('Pivot table generation failed');

onMounted(async () => {
    try {
        dataset.value = await getDataset(datasetId);
        editableSchema.value = [...dataset.value.schema];
        editableName.value = dataset.value.name;
        editableDescription.value = dataset.value.description || '';
        await loadRecords();
    } catch {
        notification.error('Failed to load dataset');
    } finally {
        loading.value = false;
    }
});
</script>
