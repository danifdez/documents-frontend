<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div
                    class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-2xl w-full mx-4 overflow-hidden max-h-[85vh] flex flex-col">
                    <div class="px-6 py-4 border-b border-border-light flex items-center justify-between shrink-0">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Import Dataset from File
                        </h3>
                        <div class="flex items-center gap-2">
                            <span v-for="(label, i) in ['Upload', 'Review', 'Result']" :key="i"
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

                    <div class="px-6 py-5 overflow-y-auto min-h-0">
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
                                <p class="text-xs text-text-muted">The schema will be inferred automatically from the
                                    file</p>
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

                        <!-- Step 2: Review -->
                        <div v-if="step === 2" class="space-y-4">
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Dataset name</label>
                                <input v-model="datasetName" type="text"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="e.g. Authors, Sensors..." />
                            </div>

                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Inferred schema
                                    <span class="text-text-muted font-normal">({{ inferredSchema.length }}
                                        fields)</span></label>
                                <div class="border border-border rounded-lg overflow-hidden">
                                    <table class="w-full text-xs">
                                        <thead>
                                            <tr class="bg-surface border-b border-border">
                                                <th class="px-3 py-1.5 text-left font-medium text-text-muted">Column
                                                </th>
                                                <th class="px-3 py-1.5 text-left font-medium text-text-muted">Field key
                                                </th>
                                                <th class="px-3 py-1.5 text-left font-medium text-text-muted">Type</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-border-light">
                                            <tr v-for="field in inferredSchema" :key="field.key">
                                                <td class="px-3 py-1.5 text-text-primary">{{ field.name }}</td>
                                                <td class="px-3 py-1.5 text-text-muted font-mono">{{ field.key }}</td>
                                                <td class="px-3 py-1.5">
                                                    <span
                                                        class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                        :class="{
                                                            'bg-blue-50 text-blue-700': field.type === 'text',
                                                            'bg-emerald-50 text-emerald-700': field.type === 'number',
                                                            'bg-amber-50 text-amber-700': field.type === 'date',
                                                            'bg-purple-50 text-purple-700': field.type === 'boolean',
                                                        }">
                                                        {{ field.type }}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Preview rows -->
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Preview
                                    <span class="text-text-muted font-normal">(first 5 rows)</span></label>
                                <div class="overflow-x-auto border border-border rounded-lg max-h-40">
                                    <table class="w-full text-xs">
                                        <thead>
                                            <tr class="bg-surface border-b border-border">
                                                <th v-for="field in inferredSchema" :key="field.key"
                                                    class="px-3 py-1.5 text-left font-medium text-text-muted whitespace-nowrap">
                                                    {{ field.name }}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-border-light">
                                            <tr v-for="(row, i) in previewRows" :key="i">
                                                <td v-for="(cell, j) in row" :key="j"
                                                    class="px-3 py-1.5 text-text-primary truncate max-w-[12rem]">
                                                    {{ cell }}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p class="text-xs text-text-muted mt-1">{{ totalRows }} rows total</p>
                            </div>
                        </div>

                        <!-- Step 3: Result -->
                        <div v-if="step === 3" class="space-y-4">
                            <div v-if="result" class="space-y-3">
                                <div class="flex items-center gap-2 text-sm">
                                    <svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="text-text-primary font-medium">
                                        Dataset "{{ result.dataset.name }}" created with {{ result.imported }} records
                                    </span>
                                </div>
                                <div v-if="result.errors.length > 0" class="space-y-1">
                                    <p class="text-sm text-red-500 font-medium">
                                        {{ result.errors.length }} rows with errors:
                                    </p>
                                    <div class="max-h-40 overflow-y-auto space-y-1">
                                        <div v-for="err in result.errors.slice(0, 20)" :key="err.row"
                                            class="text-xs text-text-muted bg-red-50 rounded px-2 py-1">
                                            Row {{ err.row }}: {{ err.messages.join(', ') }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5 shrink-0">
                        <Button @click="handleClose" variant="secondary">
                            {{ step === 3 ? 'Close' : 'Cancel' }}
                        </Button>
                        <Button v-if="step === 1" @click="handleParse" variant="info" :disabled="!selectedFile">
                            Continue
                        </Button>
                        <Button v-if="step === 2" @click="handleImport" variant="info"
                            :disabled="!datasetName.trim() || importing">
                            {{ importing ? 'Importing...' : 'Create Dataset' }}
                        </Button>
                        <Button v-if="step === 3 && result" @click="goToDataset" variant="info">
                            Open Dataset
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDatasets, type DatasetField, type ImportFromFileResult } from '../../services/datasets/useDatasets';
import { useNotification } from '../../composables/useNotification';
import Button from '../ui/Button.vue';

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits<{
    close: [];
    imported: [result: ImportFromFileResult];
}>();

const router = useRouter();
const { importFromFile } = useDatasets();
const notification = useNotification();

const step = ref(1);
const selectedFile = ref<File | null>(null);
const datasetName = ref('');
const inferredSchema = ref<DatasetField[]>([]);
const previewRows = ref<string[][]>([]);
const totalRows = ref(0);
const importing = ref(false);
const result = ref<ImportFromFileResult | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

watch(() => props.isOpen, (open) => {
    if (open) {
        step.value = 1;
        selectedFile.value = null;
        datasetName.value = '';
        inferredSchema.value = [];
        previewRows.value = [];
        totalRows.value = 0;
        result.value = null;
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

const handleParse = () => {
    if (!selectedFile.value) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length === 0) return;

        const headers = parseCSVLine(lines[0]);
        const dataLines = lines.slice(1);

        // Infer schema from sample data
        const sampleRows = dataLines.slice(0, 100).map(l => parseCSVLine(l));
        inferredSchema.value = headers.map((header, colIndex) => {
            const values = sampleRows
                .map(row => row[colIndex])
                .filter(v => v !== undefined && v !== null && v !== '');
            return {
                key: toFieldKey(header),
                name: header,
                type: detectType(values),
                required: false,
            };
        });

        previewRows.value = dataLines.slice(0, 5).map(l => parseCSVLine(l));
        totalRows.value = dataLines.length;
        datasetName.value = selectedFile.value!.name.replace(/\.\w+$/, '');
        step.value = 2;
    };
    reader.readAsText(selectedFile.value);
};

const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current.trim());
    return result;
};

const toFieldKey = (header: string): string => {
    return header
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
};

const detectType = (values: string[]): 'text' | 'number' | 'boolean' | 'date' => {
    if (values.length === 0) return 'text';
    if (values.every(v => v === 'true' || v === 'false')) return 'boolean';
    if (values.every(v => !isNaN(Number(v)))) return 'number';
    if (values.every(v => /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(Date.parse(v)))) return 'date';
    return 'text';
};

const handleImport = async () => {
    if (!selectedFile.value || !datasetName.value.trim()) return;
    importing.value = true;
    try {
        result.value = await importFromFile(selectedFile.value, datasetName.value.trim());
        step.value = 3;
        emit('imported', result.value);
        notification.success(`Dataset "${result.value.dataset.name}" created with ${result.value.imported} records`);
    } catch {
        notification.error('Failed to import dataset from file');
    } finally {
        importing.value = false;
    }
};

const goToDataset = () => {
    if (result.value) {
        router.push(`/datasets/${result.value.dataset.id}`);
    }
    emit('close');
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
