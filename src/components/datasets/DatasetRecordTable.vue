<template>
    <div class="bg-surface-elevated border-b border-border overflow-hidden">
        <!-- Table -->
        <div class="overflow-x-auto">
            <table class="w-full text-sm table-fixed">
                <thead>
                    <tr class="border-b border-border bg-surface">
                        <th class="px-2 py-2.5 text-center w-10">
                            <input type="checkbox" :checked="allSelected" @change="toggleSelectAll"
                                class="rounded border-border text-accent focus:ring-accent/20 cursor-pointer" />
                        </th>
                        <th class="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider w-16">
                            ID
                        </th>
                        <th v-for="field in schema" :key="field.key"
                            class="px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-secondary transition-colors overflow-hidden truncate"
                            @click="$emit('sort', field.key)">
                            {{ field.name }}
                            <svg v-if="field.linkedDatasetId" class="inline h-3 w-3 text-accent ml-0.5" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span v-if="sortField === field.key" class="ml-1">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border-light">
                    <tr v-if="records.length === 0">
                        <td :colspan="schema.length + 3" class="px-4 py-8 text-center text-text-muted text-sm">
                            No records yet
                        </td>
                    </tr>
                    <tr v-for="record in records" :key="record.id"
                        class="hover:bg-surface-hover transition-colors group"
                        :class="{ 'bg-accent-subtle/30': selectedIds.has(record.id) }">
                        <td class="px-2 py-2.5 text-center">
                            <input type="checkbox" :checked="selectedIds.has(record.id)"
                                @change="toggleSelect(record.id)"
                                class="rounded border-border text-accent focus:ring-accent/20 cursor-pointer" />
                        </td>
                        <td class="px-4 py-2.5 text-text-muted text-xs">{{ record.id }}</td>
                        <td v-for="field in schema" :key="field.key"
                            class="px-4 py-2.5 text-text-primary overflow-hidden"
                            @dblclick="startEdit(record, field, $event)">
                            <!-- Inline editing -->
                            <template v-if="isEditing(record.id, field.key)">
                                <!-- Boolean edit -->
                                <select v-if="field.type === 'boolean'"
                                    :value="getEditValue(record.id, field.key)"
                                    @input="setEditValue(record.id, field.key, ($event.target as HTMLSelectElement).value === 'true')"
                                    @blur="blurEdit(record.id, field.key)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent">
                                    <option :value="true">Yes</option>
                                    <option :value="false">No</option>
                                </select>
                                <!-- Select edit -->
                                <select v-else-if="field.type === 'select'"
                                    :value="getEditValue(record.id, field.key)"
                                    @input="setEditValue(record.id, field.key, ($event.target as HTMLSelectElement).value)"
                                    @blur="blurEdit(record.id, field.key)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent">
                                    <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                                </select>
                                <!-- Number edit -->
                                <input v-else-if="field.type === 'number'" type="number"
                                    :value="getEditValue(record.id, field.key)"
                                    @input="setEditValue(record.id, field.key, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field.key)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <!-- Date edit -->
                                <input v-else-if="field.type === 'date'" type="date"
                                    :value="getEditValue(record.id, field.key)"
                                    @input="setEditValue(record.id, field.key, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field.key)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <!-- Datetime edit -->
                                <input v-else-if="field.type === 'datetime'" type="datetime-local"
                                    :value="getEditValue(record.id, field.key)"
                                    @input="setEditValue(record.id, field.key, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field.key)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <!-- Time edit -->
                                <input v-else-if="field.type === 'time'" type="time"
                                    :value="getEditValue(record.id, field.key)"
                                    @input="setEditValue(record.id, field.key, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field.key)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <!-- Text edit -->
                                <input v-else type="text"
                                    :value="getEditValue(record.id, field.key)"
                                    @input="setEditValue(record.id, field.key, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field.key)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                            </template>
                            <!-- Read-only display -->
                            <template v-else>
                                <!-- Boolean -->
                                <span v-if="field.type === 'boolean'">
                                    <span v-if="record.data[field.key]"
                                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700">Yes</span>
                                    <span v-else
                                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface text-text-muted">No</span>
                                </span>
                                <!-- Linked field -->
                                <span v-else-if="field.linkedDatasetId && record.data[field.key] != null">
                                    <button v-if="getLinkedDisplay(field, record)"
                                        @click.stop="openLinkedPopup(field, record)"
                                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors cursor-pointer">
                                        {{ getLinkedDisplay(field, record) }}
                                        <svg class="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <span v-else-if="linkedDataLoading"
                                        class="text-[10px] text-text-muted italic">loading...</span>
                                    <span v-else class="text-text-secondary">{{ record.data[field.key] }}</span>
                                </span>
                                <!-- Normal field -->
                                <span v-else>{{ record.data[field.key] ?? '—' }}</span>
                            </template>
                        </td>
                    </tr>
                </tbody>
                <tfoot v-if="records.length > 0">
                    <tr class="border-t border-border bg-surface/50">
                        <td class="px-2 py-2"></td>
                        <td class="px-4 py-2 text-[10px] text-text-muted font-medium">
                            {{ records.length }} rows
                        </td>
                        <td v-for="field in schema" :key="field.key" class="px-4 py-2 text-[10px] text-text-muted">
                            <template v-if="field.type === 'number'">
                                <span class="font-medium">Sum:</span> {{ formatSummary(columnSum(field.key)) }}
                                <span class="ml-1.5 font-medium">Avg:</span> {{ formatSummary(columnAvg(field.key)) }}
                            </template>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Pagination -->
        <div class="px-4 py-2.5 border-t border-border bg-surface flex items-center justify-between">
            <span class="text-xs text-text-muted">
                Showing {{ records.length }} of {{ total }} records
            </span>
            <div class="flex items-center gap-2">
                <button @click="$emit('page', page - 1)" :disabled="page <= 1"
                    class="px-2.5 py-1 text-xs rounded border border-border text-text-secondary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                    Prev
                </button>
                <span class="text-xs text-text-muted">Page {{ page }}</span>
                <button @click="$emit('page', page + 1)" :disabled="records.length < limit"
                    class="px-2.5 py-1 text-xs rounded border border-border text-text-secondary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                    Next
                </button>
            </div>
        </div>

        <!-- Linked record popup -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="popup.show"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    @click.self="popup.show = false">
                    <div class="bg-surface-elevated rounded-xl shadow-2xl border border-border max-w-lg w-full mx-4 overflow-hidden">
                        <div class="px-5 py-3.5 border-b border-border-light flex items-center justify-between">
                            <div class="flex items-center gap-2 min-w-0">
                                <svg class="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <h3 class="text-sm font-semibold text-text-primary truncate">
                                    {{ popup.datasetName }} — Record #{{ popup.recordId }}
                                </h3>
                            </div>
                            <button @click="popup.show = false"
                                class="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-colors">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div class="max-h-[60vh] overflow-y-auto">
                            <table class="w-full text-sm">
                                <tbody class="divide-y divide-border-light">
                                    <tr v-for="(value, key) in popup.data" :key="key" class="hover:bg-surface-hover/50">
                                        <td class="px-5 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap w-1/3">
                                            {{ getFieldName(key as string) }}
                                        </td>
                                        <td class="px-5 py-2.5 text-text-primary break-words">
                                            {{ value ?? '—' }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="px-5 py-3 border-t border-border-light bg-surface flex justify-end">
                            <button @click="popup.show = false"
                                class="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, nextTick } from 'vue';
import type { DatasetField, DatasetRecord } from '../../services/datasets/useDatasets';
import apiClient from '../../services/api';

const props = defineProps<{
    schema: DatasetField[];
    records: DatasetRecord[];
    total: number;
    page: number;
    limit: number;
    sortField?: string;
    sortOrder?: string;
}>();

const emit = defineEmits<{
    page: [page: number];
    sort: [field: string];
    bulkDelete: [ids: number[]];
    inlineUpdate: [recordId: number, data: Record<string, any>];
}>();

// Inline editing
const editingCells = ref<Map<string, any>>(new Map()); // key: "recordId:fieldKey" -> edited value

const cellKey = (recordId: number, fieldKey: string) => `${recordId}:${fieldKey}`;

const isEditing = (recordId: number, fieldKey: string) => editingCells.value.has(cellKey(recordId, fieldKey));

const hasChanges = computed(() => editingCells.value.size > 0);

const startEdit = async (record: DatasetRecord, field: DatasetField, event: MouseEvent) => {
    if (field.linkedDatasetId) return;
    const key = cellKey(record.id, field.key);
    if (!editingCells.value.has(key)) {
        editingCells.value.set(key, record.data[field.key] ?? '');
    }
    await nextTick();
    const td = (event.target as HTMLElement).closest('td');
    const input = td?.querySelector('input, select') as HTMLElement | null;
    input?.focus();
};

const getEditValue = (recordId: number, fieldKey: string) => {
    return editingCells.value.get(cellKey(recordId, fieldKey));
};

const setEditValue = (recordId: number, fieldKey: string, value: any) => {
    editingCells.value.set(cellKey(recordId, fieldKey), value);
};

const blurEdit = (recordId: number, fieldKey: string) => {
    const record = props.records.find(r => r.id === recordId);
    const original = record?.data[fieldKey] ?? '';
    const current = editingCells.value.get(cellKey(recordId, fieldKey));
    if (String(current) === String(original)) {
        editingCells.value.delete(cellKey(recordId, fieldKey));
    }
};

const cancelEdits = () => {
    editingCells.value = new Map();
};

const applyEdits = () => {
    // Group changes by record
    const changes = new Map<number, Record<string, any>>();
    for (const [key, value] of editingCells.value) {
        const [ridStr, fieldKey] = key.split(':');
        const rid = Number(ridStr);
        if (!changes.has(rid)) {
            const record = props.records.find(r => r.id === rid);
            changes.set(rid, { ...record?.data });
        }
        changes.get(rid)![fieldKey] = value;
    }
    for (const [recordId, data] of changes) {
        emit('inlineUpdate', recordId, data);
    }
    editingCells.value = new Map();
};

// Clear edits when records change
watch(() => props.records, () => { editingCells.value = new Map(); });

// Selection
const selectedIds = ref<Set<number>>(new Set());

const allSelected = computed(() =>
    props.records.length > 0 && props.records.every(r => selectedIds.value.has(r.id))
);

const toggleSelectAll = () => {
    if (allSelected.value) {
        selectedIds.value.clear();
    } else {
        for (const r of props.records) selectedIds.value.add(r.id);
    }
};

const toggleSelect = (id: number) => {
    if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id);
    } else {
        selectedIds.value.add(id);
    }
};

// Clear selection when records change
watch(() => props.records, () => { selectedIds.value.clear(); });

// Column summaries
const columnSum = (key: string): number => {
    let sum = 0;
    for (const r of props.records) {
        const v = Number(r.data[key]);
        if (!isNaN(v)) sum += v;
    }
    return sum;
};

const columnAvg = (key: string): number => {
    let sum = 0;
    let count = 0;
    for (const r of props.records) {
        const v = Number(r.data[key]);
        if (!isNaN(v)) { sum += v; count++; }
    }
    return count > 0 ? sum / count : 0;
};

const formatSummary = (val: number): string => {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

defineExpose({ selectedIds, hasChanges, editingCells, cancelEdits, applyEdits });

// Linked data resolution
const linkedData = ref<Record<string, Record<string, Record<string, any>>>>({});
const linkedDataLoading = ref(false);

const linkedFields = () => props.schema.filter(f => f.linkedDatasetId != null && f.linkedDatasetId !== 0);

const getGroupKey = (field: DatasetField): string => {
    const dsId = Number(field.linkedDatasetId);
    const lookupField = field.linkedLookupField || '_pk';
    return `${dsId}:${lookupField}`;
};

const getLinkedDisplay = (field: DatasetField, record: DatasetRecord): string | null => {
    if (!field.linkedDatasetId) return null;
    const val = record.data[field.key];
    if (val == null || val === '') return null;
    const data = linkedData.value[getGroupKey(field)]?.[String(val)];
    if (!data) return null;
    if (field.linkedDisplayField && data[field.linkedDisplayField] != null) {
        return String(data[field.linkedDisplayField]);
    }
    const firstVal = Object.values(data).find(v => typeof v === 'string' && v.length > 0);
    return firstVal ? String(firstVal) : null;
};

let resolveVersion = 0;
const resolveAllLinks = async () => {
    const fields = linkedFields();
    if (fields.length === 0 || props.records.length === 0) return;

    const version = ++resolveVersion;
    linkedDataLoading.value = true;

    // Group values by linked dataset + lookup field
    const byDataset = new Map<string, { dsId: number; lookupField?: string; values: Set<string> }>();
    for (const field of fields) {
        const dsId = Number(field.linkedDatasetId);
        if (!dsId) continue;
        const lookupField = field.linkedLookupField || undefined;
        const groupKey = `${dsId}:${lookupField || '_pk'}`;
        if (!byDataset.has(groupKey)) byDataset.set(groupKey, { dsId, lookupField, values: new Set() });
        for (const record of props.records) {
            const val = record.data[field.key];
            if (val != null && val !== '') byDataset.get(groupKey)!.values.add(String(val));
        }
    }

    // Fetch linked records for each dataset
    const newLinkedData = { ...linkedData.value };
    for (const [groupKey, { dsId, lookupField, values }] of byDataset) {
        if (values.size === 0) continue;
        try {
            const response = await apiClient.post(`/datasets/${dsId}/resolve-links`, {
                values: [...values],
                lookupField,
            });
            // Merge into cache keyed by groupKey so different lookup fields don't collide
            newLinkedData[groupKey] = response.data;
        } catch (err) {
            console.warn(`Failed to resolve links for dataset ${dsId}:`, err);
        }
    }
    if (version !== resolveVersion) return; // discard stale results
    linkedData.value = newLinkedData;
    linkedDataLoading.value = false;
};

// Resolve links when records change
watch(() => props.records, () => {
    resolveAllLinks();
}, { immediate: true });

// Linked record popup
const popup = reactive<{
    show: boolean;
    datasetName: string;
    recordId: number;
    data: Record<string, any>;
    schema: DatasetField[];
}>({
    show: false,
    datasetName: '',
    recordId: 0,
    data: {},
    schema: [],
});

// Cache dataset schemas for popup field names
const linkedSchemas = ref<Record<number, DatasetField[]>>({});

const openLinkedPopup = async (field: DatasetField, record: DatasetRecord) => {
    const dsId = Number(field.linkedDatasetId);
    if (!dsId) return;
    const val = record.data[field.key];
    if (val == null || val === '') return;

    const data = linkedData.value[getGroupKey(field)]?.[String(val)];
    if (!data) return;

    // Fetch schema if not cached
    if (!linkedSchemas.value[dsId]) {
        try {
            const response = await apiClient.get(`/datasets/${dsId}`);
            linkedSchemas.value[dsId] = response.data.schema;
            popup.datasetName = response.data.name;
        } catch {
            popup.datasetName = `Dataset #${dsId}`;
        }
    } else {
        popup.datasetName = `Dataset #${dsId}`;
    }

    popup.schema = linkedSchemas.value[dsId] || [];
    popup.recordId = val;
    popup.data = data;
    popup.show = true;
};

const getFieldName = (key: string): string => {
    const field = popup.schema.find(f => f.key === key);
    return field?.name || key;
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.15s ease; }
.modal-leave-active { transition: opacity 0.1s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
