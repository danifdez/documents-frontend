<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div
                    class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-2xl w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light flex items-center justify-between">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Convert Table to Dataset
                        </h3>
                        <div class="flex items-center gap-2">
                            <span v-for="(label, i) in ['Configure', 'Result']" :key="i"
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
                        <!-- Step 1: Configure -->
                        <div v-if="step === 1" class="space-y-4">
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
                                                    <select v-model="field.type"
                                                        class="rounded bg-surface border border-border px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/20">
                                                        <option value="text">text</option>
                                                        <option value="number">number</option>
                                                        <option value="boolean">boolean</option>
                                                        <option value="date">date</option>
                                                        <option value="datetime">datetime</option>
                                                        <option value="time">time</option>
                                                        <option value="select">select</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Preview rows -->
                            <div v-if="tableData && tableData.rows.length > 0">
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Preview
                                    <span class="text-text-muted font-normal">({{ tableData.rows.length }}
                                        rows)</span></label>
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
                                            <tr v-for="(row, i) in tableData.rows.slice(0, 5)" :key="i">
                                                <td v-for="(cell, j) in row" :key="j"
                                                    class="px-3 py-1.5 text-text-primary truncate max-w-[12rem]">
                                                    {{ cell || '—' }}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Replace table option -->
                            <label
                                class="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1.5 -mx-2 transition-colors">
                                <input type="checkbox" v-model="replaceTable"
                                    class="rounded border-border text-accent focus:ring-accent/20" />
                                Replace table with live dataset view
                            </label>
                        </div>

                        <!-- Step 2: Result -->
                        <div v-if="step === 2" class="space-y-4">
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

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="handleClose" variant="secondary">
                            {{ step === 2 ? 'Close' : 'Cancel' }}
                        </Button>
                        <Button v-if="step === 1" @click="handleCreate" variant="info"
                            :disabled="!datasetName.trim() || creating">
                            {{ creating ? 'Creating...' : 'Create Dataset' }}
                        </Button>
                        <Button v-if="step === 2 && result" @click="goToDataset" variant="info">
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
import type { ParsedTable } from './utils/parseTableFromEditor';

const modelValue = defineModel<boolean>({ required: true });

const props = defineProps<{
    tableData: ParsedTable | null;
    projectId?: number;
}>();

const emit = defineEmits<{
    created: [info: {
        datasetId: number;
        datasetName: string;
        schema: DatasetField[];
        replaceTable: boolean;
    }];
}>();

const router = useRouter();
const { createFromTable } = useDatasets();
const notification = useNotification();

const step = ref(1);
const datasetName = ref('');
const inferredSchema = ref<DatasetField[]>([]);
const replaceTable = ref(true);
const creating = ref(false);
const result = ref<ImportFromFileResult | null>(null);

watch(modelValue, (open) => {
    if (open && props.tableData) {
        step.value = 1;
        creating.value = false;
        result.value = null;
        replaceTable.value = true;
        datasetName.value = 'Table Dataset';
        inferredSchema.value = props.tableData.headers.map((header, colIndex) => {
            const values = props.tableData!.rows
                .map(row => row[colIndex])
                .filter(v => v !== undefined && v !== null && v !== '');
            return {
                key: toFieldKey(header),
                name: header,
                type: detectType(values),
                required: false,
            };
        });
    }
});

const toFieldKey = (header: string): string => {
    return header
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') || 'field';
};

const detectType = (values: string[]): 'text' | 'number' | 'boolean' | 'date' => {
    if (values.length === 0) return 'text';
    if (values.every(v => v === 'true' || v === 'false')) return 'boolean';
    if (values.every(v => !isNaN(Number(v)))) return 'number';
    if (values.every(v => /^\d{4}-\d{2}-\d{2}/.test(v) && !isNaN(Date.parse(v)))) return 'date';
    return 'text';
};

const handleCreate = async () => {
    if (!props.tableData || !datasetName.value.trim()) return;
    creating.value = true;
    try {
        result.value = await createFromTable({
            name: datasetName.value.trim(),
            headers: props.tableData.headers,
            rows: props.tableData.rows,
            projectId: props.projectId,
        });
        step.value = 2;
        emit('created', {
            datasetId: result.value.dataset.id,
            datasetName: result.value.dataset.name,
            schema: inferredSchema.value,
            replaceTable: replaceTable.value,
        });
        notification.success(`Dataset "${result.value.dataset.name}" created with ${result.value.imported} records`);
    } catch {
        notification.error('Failed to create dataset from table');
    } finally {
        creating.value = false;
    }
};

const goToDataset = () => {
    if (result.value) {
        router.push(`/datasets/${result.value.dataset.id}`);
    }
    handleClose();
};

const handleClose = () => {
    modelValue.value = false;
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
