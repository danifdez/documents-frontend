<template>
    <div class="dataset-view-node my-3 rounded-xl border border-border bg-surface-elevated overflow-hidden select-none">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span class="text-sm font-semibold text-text-primary">{{ datasetName }}</span>
                <span v-if="activeFilters.length > 0"
                    class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent-subtle text-accent">
                    {{ activeFilters.length }} filter{{ activeFilters.length > 1 ? 's' : '' }}
                </span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                    Live
                </span>
            </div>
            <div class="flex items-center gap-1">
                <!-- Toggle filters -->
                <button @click="showFilters = !showFilters"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    :class="{ 'text-accent bg-accent-subtle': showFilters }" title="Toggle filters">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                </button>
                <!-- Toggle edit mode -->
                <button v-if="editable" @click="toggleEditMode"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    :class="{ 'text-accent bg-accent-subtle': editMode }" title="Toggle edit mode">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
                <!-- Refresh -->
                <button @click="loadData" :disabled="loading"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Refresh">
                    <svg class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Filter bar -->
        <div v-if="showFilters" class="px-4 py-3 bg-surface-hover/30 border-b border-border-light space-y-2">
            <div v-for="(f, i) in editableFilters" :key="i" class="flex items-center gap-2">
                <select v-model="f.field"
                    class="rounded-lg bg-surface-elevated border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-32">
                    <option value="">Field...</option>
                    <option v-for="field in schemaFields" :key="field.key" :value="field.key">{{ field.name }}
                    </option>
                </select>
                <select v-model="f.operator"
                    class="rounded-lg bg-surface-elevated border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-24">
                    <option value="eq">=</option>
                    <option value="contains">contains</option>
                    <option v-if="getFieldType(f.field) === 'number'" value="gt">&gt;</option>
                    <option v-if="getFieldType(f.field) === 'number'" value="gte">&gt;=</option>
                    <option v-if="getFieldType(f.field) === 'number'" value="lt">&lt;</option>
                    <option v-if="getFieldType(f.field) === 'number'" value="lte">&lt;=</option>
                </select>
                <input v-model="f.value" type="text" placeholder="Value..."
                    class="flex-1 rounded-lg bg-surface-elevated border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    @keydown.enter="applyFilters" />
                <button @click="editableFilters.splice(i, 1)"
                    class="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="flex items-center gap-2">
                <button @click="editableFilters.push({ field: '', operator: 'eq', value: '' })"
                    class="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-accent hover:text-accent-dark hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer">
                    <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add filter
                </button>
                <button @click="applyFilters"
                    class="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors cursor-pointer">
                    Apply
                </button>
                <button v-if="editableFilters.length > 0" @click="editableFilters = []; applyFilters()"
                    class="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-text-muted hover:text-text-secondary rounded-lg transition-colors cursor-pointer">
                    Clear all
                </button>
            </div>
        </div>

        <!-- Filter badges (compact, when filter bar is closed) -->
        <div v-if="!showFilters && activeFilters.length > 0"
            class="px-4 py-1.5 bg-surface-hover/50 border-b border-border-light flex flex-wrap gap-1">
            <span v-for="(f, i) in activeFilters" :key="i"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border-light text-text-muted">
                {{ f.field }} {{ operatorLabel(f.operator) }} {{ f.value }}
            </span>
        </div>

        <!-- Edit mode toolbar -->
        <div v-if="editMode && hasChanges"
            class="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <span class="text-xs text-amber-700 font-medium">
                {{ editingCells.size }} unsaved change{{ editingCells.size > 1 ? 's' : '' }}
            </span>
            <div class="flex items-center gap-2">
                <button @click="cancelEdits"
                    class="px-2 py-1 text-[11px] text-text-muted hover:text-text-secondary rounded transition-colors cursor-pointer">
                    Cancel
                </button>
                <button @click="applyEdits"
                    class="px-2 py-1 text-[11px] bg-accent text-white rounded hover:bg-accent-dark transition-colors cursor-pointer">
                    Save changes
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading && records.length === 0" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="px-4 py-4 text-sm text-red-500 text-center">{{ error }}</div>

        <!-- Empty -->
        <div v-else-if="records.length === 0" class="px-4 py-6 text-sm text-text-muted text-center">
            No records found
        </div>

        <!-- Data table -->
        <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-border bg-surface">
                        <th v-for="field in visibleFields" :key="field"
                            class="px-3 py-2 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                            {{ getFieldName(field) }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border-light">
                    <tr v-for="record in records" :key="record.id" class="hover:bg-surface-hover/50">
                        <td v-for="field in visibleFields" :key="field"
                            class="px-3 py-1.5 text-text-primary whitespace-nowrap"
                            @dblclick="editMode && startEdit(record, field, $event)">
                            <!-- Inline editing -->
                            <template v-if="isEditing(record.id, field)">
                                <select v-if="getFieldType(field) === 'boolean'"
                                    :value="getEditValue(record.id, field)"
                                    @input="setEditValue(record.id, field, ($event.target as HTMLSelectElement).value === 'true')"
                                    @blur="blurEdit(record.id, field)"
                                    @keydown.escape="cancelCellEdit(record.id, field)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent">
                                    <option :value="true">Yes</option>
                                    <option :value="false">No</option>
                                </select>
                                <select v-else-if="getFieldType(field) === 'select'"
                                    :value="getEditValue(record.id, field)"
                                    @input="setEditValue(record.id, field, ($event.target as HTMLSelectElement).value)"
                                    @blur="blurEdit(record.id, field)"
                                    @keydown.escape="cancelCellEdit(record.id, field)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent">
                                    <option v-for="opt in getFieldOptions(field)" :key="opt" :value="opt">{{ opt }}
                                    </option>
                                </select>
                                <input v-else-if="getFieldType(field) === 'number'" type="number"
                                    :value="getEditValue(record.id, field)"
                                    @input="setEditValue(record.id, field, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field)"
                                    @keydown.escape="cancelCellEdit(record.id, field)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <input v-else-if="getFieldType(field) === 'date'" type="date"
                                    :value="getEditValue(record.id, field)"
                                    @input="setEditValue(record.id, field, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field)"
                                    @keydown.escape="cancelCellEdit(record.id, field)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <input v-else-if="getFieldType(field) === 'datetime'" type="datetime-local"
                                    :value="getEditValue(record.id, field)"
                                    @input="setEditValue(record.id, field, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field)"
                                    @keydown.escape="cancelCellEdit(record.id, field)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <input v-else-if="getFieldType(field) === 'time'" type="time"
                                    :value="getEditValue(record.id, field)"
                                    @input="setEditValue(record.id, field, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field)"
                                    @keydown.escape="cancelCellEdit(record.id, field)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                                <input v-else type="text" :value="getEditValue(record.id, field)"
                                    @input="setEditValue(record.id, field, ($event.target as HTMLInputElement).value)"
                                    @blur="blurEdit(record.id, field)"
                                    @keydown.escape="cancelCellEdit(record.id, field)"
                                    class="w-full bg-transparent outline outline-1 outline-accent/50 rounded-sm px-0 py-0 text-sm focus:outline-accent" />
                            </template>
                            <!-- Read-only display -->
                            <template v-else>
                                <span v-if="getFieldType(field) === 'boolean'">
                                    <span v-if="record.data[field]"
                                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700">Yes</span>
                                    <span v-else
                                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface text-text-muted">No</span>
                                </span>
                                <span v-else>{{ formatValue(record.data[field]) }}</span>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Footer -->
        <div v-if="total > 0"
            class="px-4 py-1.5 border-t border-border bg-surface text-[10px] text-text-muted flex items-center justify-between">
            <span>{{ records.length }} of {{ total }} records</span>
            <span v-if="editMode" class="text-accent font-medium">Edit mode — double-click cells to edit</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import apiClient from '../../services/api';
import type { DatasetField } from '../../services/datasets/useDatasets';

const props = defineProps<{
    datasetId: number;
    datasetName: string;
    fields: string;
    filters: string;
    editable: boolean;
}>();

const records = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const editMode = ref(false);
const showFilters = ref(false);
const schemaFields = ref<DatasetField[]>([]);

// Editable filters (local copy for UI manipulation)
const editableFilters = ref<{ field: string; operator: string; value: string }[]>([]);

const visibleFields = computed(() => {
    try { return JSON.parse(props.fields); }
    catch { return []; }
});

const activeFilters = ref<{ field: string; operator: string; value: string }[]>([]);

// Initialize active filters from props
const initFilters = () => {
    try {
        const parsed = JSON.parse(props.filters);
        activeFilters.value = [...parsed];
        editableFilters.value = parsed.map((f: any) => ({ ...f }));
    } catch {
        activeFilters.value = [];
        editableFilters.value = [];
    }
};

const operatorLabel = (op: string) => {
    const map: Record<string, string> = { eq: '=', gt: '>', gte: '>=', lt: '<', lte: '<=', contains: '~' };
    return map[op] || op;
};

const formatValue = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
};

const getFieldType = (fieldKey: string): string => {
    const field = schemaFields.value.find(f => f.key === fieldKey);
    return field?.type || 'text';
};

const getFieldName = (fieldKey: string): string => {
    const field = schemaFields.value.find(f => f.key === fieldKey);
    return field?.name || fieldKey;
};

const getFieldOptions = (fieldKey: string): string[] => {
    const field = schemaFields.value.find(f => f.key === fieldKey);
    return field?.options || [];
};

// Load dataset schema for field types
const loadSchema = async () => {
    if (!props.datasetId) return;
    try {
        const response = await apiClient.get(`/datasets/${props.datasetId}`);
        schemaFields.value = response.data.schema || [];
    } catch {
        // Schema is optional for display, fail silently
    }
};

const loadData = async () => {
    if (!props.datasetId) return;
    loading.value = true;
    error.value = null;
    try {
        const params: Record<string, any> = { limit: 100 };
        for (const f of activeFilters.value) {
            if (f.field && f.value) {
                params[`filter[${f.field}_${f.operator}]`] = f.value;
            }
        }
        const response = await apiClient.get(`/datasets/${props.datasetId}/records`, { params });
        const data = response.data;
        records.value = data.records || data;
        total.value = data.total || records.value.length;
    } catch (err: any) {
        error.value = err.response?.data?.message || 'Failed to load data';
    } finally {
        loading.value = false;
    }
};

const applyFilters = () => {
    // Only apply valid filters (field + value filled)
    activeFilters.value = editableFilters.value
        .filter(f => f.field && f.value)
        .map(f => ({ ...f }));
    loadData();
};

// --- Edit mode ---

const toggleEditMode = () => {
    if (editMode.value && hasChanges.value) {
        // Discard changes when turning off
        cancelEdits();
    }
    editMode.value = !editMode.value;
};

// Inline editing state
const editingCells = ref<Map<string, any>>(new Map());

const cellKey = (recordId: number, fieldKey: string) => `${recordId}:${fieldKey}`;

const isEditing = (recordId: number, fieldKey: string) => editingCells.value.has(cellKey(recordId, fieldKey));

const hasChanges = computed(() => editingCells.value.size > 0);

const startEdit = async (record: any, fieldKey: string, event: MouseEvent) => {
    const key = cellKey(record.id, fieldKey);
    if (!editingCells.value.has(key)) {
        editingCells.value.set(key, record.data[fieldKey] ?? '');
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
    const record = records.value.find(r => r.id === recordId);
    const original = record?.data[fieldKey] ?? '';
    const current = editingCells.value.get(cellKey(recordId, fieldKey));
    if (String(current) === String(original)) {
        editingCells.value.delete(cellKey(recordId, fieldKey));
    }
};

const cancelCellEdit = (recordId: number, fieldKey: string) => {
    editingCells.value.delete(cellKey(recordId, fieldKey));
};

const cancelEdits = () => {
    editingCells.value = new Map();
};

const applyEdits = async () => {
    // Group changes by record
    const changes = new Map<number, Record<string, any>>();
    for (const [key, value] of editingCells.value) {
        const [ridStr, fieldKey] = key.split(':');
        const rid = Number(ridStr);
        if (!changes.has(rid)) {
            const record = records.value.find(r => r.id === rid);
            changes.set(rid, { ...record?.data });
        }
        changes.get(rid)![fieldKey] = value;
    }

    // Save each changed record
    let hasError = false;
    for (const [recordId, data] of changes) {
        try {
            await apiClient.patch(`/datasets/${props.datasetId}/records/${recordId}`, { data });
        } catch (err: any) {
            console.error(`Failed to update record ${recordId}:`, err);
            hasError = true;
        }
    }

    editingCells.value = new Map();

    if (!hasError) {
        // Reload to get fresh data
        loadData();
    }
};

onMounted(() => {
    initFilters();
    loadSchema();
    loadData();
});
</script>
