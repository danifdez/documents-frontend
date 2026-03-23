<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div
                    class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-2xl w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light flex items-center justify-between">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Import CSV</h3>
                        <div class="flex items-center gap-2">
                            <span v-for="(label, i) in ['Upload', 'Map', 'Result']" :key="i"
                                class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                :class="step === i + 1
                                    ? 'bg-accent text-white'
                                    : step > i + 1
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-surface text-text-muted border border-border'">
                                {{ label }}
                            </span>
                        </div>
                    </div>

                    <div class="px-6 py-5">
                        <!-- Step 1: Upload -->
                        <div v-if="step === 1" class="space-y-4">
                            <div @drop.prevent="handleDrop" @dragover.prevent
                                class="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/40 transition-colors cursor-pointer"
                                @click="triggerFileInput">
                                <svg class="mx-auto h-10 w-10 text-text-muted mb-3" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="1.5">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p class="text-sm text-text-secondary mb-1">Drop your CSV file here or click to browse
                                </p>
                                <p class="text-xs text-text-muted">Supports .csv files</p>
                            </div>
                            <input ref="fileInputRef" type="file" accept=".csv" class="hidden"
                                @change="handleFileSelect" />
                            <div v-if="selectedFile" class="flex items-center gap-2 text-sm text-text-primary">
                                <svg class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                {{ selectedFile.name }}
                            </div>
                        </div>

                        <!-- Step 2: Map columns -->
                        <div v-if="step === 2" class="space-y-4">
                            <p class="text-sm text-text-muted">Map CSV columns to dataset fields</p>

                            <!-- Preview table -->
                            <div class="overflow-x-auto border border-border rounded-lg max-h-40">
                                <table class="w-full text-xs">
                                    <thead>
                                        <tr class="bg-surface border-b border-border">
                                            <th v-for="header in preview?.headers" :key="header"
                                                class="px-3 py-1.5 text-left font-medium text-text-muted">
                                                {{ header }}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-border-light">
                                        <tr v-for="(row, i) in preview?.previewRows?.slice(0, 5)" :key="i">
                                            <td v-for="(cell, j) in row" :key="j"
                                                class="px-3 py-1.5 text-text-primary truncate max-w-[12rem]">
                                                {{ cell }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Column mapping -->
                            <div class="space-y-2">
                                <div v-for="header in preview?.headers" :key="header"
                                    class="flex items-center gap-3">
                                    <span class="text-sm text-text-secondary w-40 truncate shrink-0">{{ header }}</span>
                                    <svg class="h-4 w-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                    <select v-model="columnMappings[header]"
                                        class="flex-1 rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                        <option value="">-- Skip --</option>
                                        <option v-for="field in schema" :key="field.key" :value="field.key">
                                            {{ field.name }} ({{ field.type }})
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <p class="text-xs text-text-muted">{{ preview?.totalRows }} rows to import</p>
                        </div>

                        <!-- Step 3: Result -->
                        <div v-if="step === 3" class="space-y-4">
                            <div v-if="importResult" class="space-y-3">
                                <div class="flex items-center gap-2 text-sm">
                                    <svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="text-text-primary font-medium">
                                        {{ importResult.imported }} records imported
                                    </span>
                                </div>
                                <div v-if="importResult.errors.length > 0" class="space-y-1">
                                    <p class="text-sm text-red-500 font-medium">
                                        {{ importResult.errors.length }} rows with errors:
                                    </p>
                                    <div class="max-h-40 overflow-y-auto space-y-1">
                                        <div v-for="err in importResult.errors.slice(0, 20)" :key="err.row"
                                            class="text-xs text-text-muted bg-red-50 rounded px-2 py-1">
                                            Row {{ err.row }}: {{ err.messages.join(', ') }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="handleClose" variant="secondary">
                            {{ step === 3 ? 'Close' : 'Cancel' }}
                        </Button>
                        <Button v-if="step === 1" @click="handleUpload" variant="info"
                            :disabled="!selectedFile || uploading">
                            {{ uploading ? 'Parsing...' : 'Parse CSV' }}
                        </Button>
                        <Button v-if="step === 2" @click="handleImport" variant="info" :disabled="!hasAnyMapping || importing">
                            {{ importing ? 'Importing...' : 'Import' }}
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { DatasetField, CsvPreview, ImportResult } from '../../services/datasets/useDatasets';
import Button from '../ui/Button.vue';

const props = defineProps<{
    isOpen: boolean;
    datasetId: number;
    schema: DatasetField[];
}>();

const emit = defineEmits<{
    close: [];
    imported: [result: ImportResult];
    uploadPreview: [file: File, callback: (preview: CsvPreview) => void];
    confirmImport: [file: File, mappings: { csvColumn: string; fieldKey: string }[], callback: (result: ImportResult) => void];
}>();

const step = ref(1);
const selectedFile = ref<File | null>(null);
const preview = ref<CsvPreview | null>(null);
const columnMappings = ref<Record<string, string>>({});
const importResult = ref<ImportResult | null>(null);
const uploading = ref(false);
const importing = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const hasAnyMapping = computed(() => {
    return Object.values(columnMappings.value).some(v => v !== '');
});

watch(() => props.isOpen, (open) => {
    if (open) {
        step.value = 1;
        selectedFile.value = null;
        preview.value = null;
        columnMappings.value = {};
        importResult.value = null;
    }
});

const triggerFileInput = () => {
    fileInputRef.value?.click();
};

const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) {
        selectedFile.value = input.files[0];
    }
};

const handleDrop = (e: DragEvent) => {
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.csv')) {
        selectedFile.value = file;
    }
};

const handleUpload = () => {
    if (!selectedFile.value) return;
    uploading.value = true;
    emit('uploadPreview', selectedFile.value, (result: CsvPreview) => {
        preview.value = result;
        // Auto-map columns by name similarity
        for (const header of result.headers) {
            const match = props.schema.find(f =>
                f.name.toLowerCase() === header.toLowerCase() ||
                f.key.toLowerCase() === header.toLowerCase()
            );
            columnMappings.value[header] = match?.key || '';
        }
        step.value = 2;
        uploading.value = false;
    });
};

const handleImport = () => {
    if (!selectedFile.value) return;
    importing.value = true;
    const mappings = Object.entries(columnMappings.value)
        .filter(([_, fieldKey]) => fieldKey !== '')
        .map(([csvColumn, fieldKey]) => ({ csvColumn, fieldKey }));

    emit('confirmImport', selectedFile.value, mappings, (result: ImportResult) => {
        importResult.value = result;
        step.value = 3;
        importing.value = false;
        emit('imported', result);
    });
};

const handleClose = () => {
    emit('close');
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
