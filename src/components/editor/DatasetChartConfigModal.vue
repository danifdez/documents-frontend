<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Insert Dataset Chart</h3>
                        <p class="text-xs text-text-muted mt-0.5">Embed a saved chart that updates with live data</p>
                    </div>

                    <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        <!-- Dataset selector -->
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Dataset *</label>
                            <select v-model="selectedDatasetId"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option :value="0" disabled>Select a dataset...</option>
                                <option v-for="ds in datasets" :key="ds.id" :value="ds.id">{{ ds.name }}</option>
                            </select>
                        </div>

                        <!-- Chart selector -->
                        <div v-if="charts.length > 0">
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Saved Chart *</label>
                            <div class="space-y-1">
                                <label v-for="chart in charts" :key="chart.id"
                                    class="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1.5 transition-colors"
                                    :class="{ 'bg-accent-subtle': selectedChartId === chart.id }">
                                    <input type="radio" :value="chart.id" v-model="selectedChartId" name="chart"
                                        class="text-accent focus:ring-accent/20" />
                                    {{ chart.name }}
                                    <span class="text-[10px] text-text-muted">({{ chart.config?.chartType }})</span>
                                </label>
                            </div>
                        </div>

                        <!-- Empty state -->
                        <div v-else-if="selectedDatasetId && !loadingCharts" class="py-4 text-center">
                            <p class="text-sm text-text-muted">No saved charts for this dataset</p>
                            <p class="text-xs text-text-muted mt-1">Go to the dataset's Charts tab to create and save charts first</p>
                        </div>

                        <!-- Loading -->
                        <div v-if="loadingCharts" class="flex justify-center py-4">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                        </div>
                    </div>

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="close" variant="secondary">Cancel</Button>
                        <Button @click="handleInsert" variant="info"
                            :disabled="!selectedChartId">
                            Insert
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import apiClient from '../../services/api';
import Button from '../ui/Button.vue';

const modelValue = defineModel<boolean>({ required: true });

const emit = defineEmits<{
    insert: [config: {
        chartId: number;
        chartName: string;
        datasetId: number;
        datasetName: string;
    }];
}>();

interface DatasetInfo {
    id: number;
    name: string;
}

interface ChartInfo {
    id: number;
    name: string;
    config: Record<string, any>;
}

const datasets = ref<DatasetInfo[]>([]);
const charts = ref<ChartInfo[]>([]);
const selectedDatasetId = ref(0);
const selectedChartId = ref(0);
const loadingCharts = ref(false);

watch(modelValue, async (open) => {
    if (open) {
        selectedDatasetId.value = 0;
        selectedChartId.value = 0;
        charts.value = [];
        try {
            const response = await apiClient.get('/datasets');
            datasets.value = response.data;
        } catch { /* ignore */ }
    }
});

watch(selectedDatasetId, async (dsId) => {
    selectedChartId.value = 0;
    charts.value = [];
    if (!dsId) return;

    loadingCharts.value = true;
    try {
        const response = await apiClient.get(`/datasets/${dsId}/charts`);
        charts.value = response.data;
    } catch { /* ignore */ }
    finally {
        loadingCharts.value = false;
    }
});

const close = () => {
    modelValue.value = false;
};

const handleInsert = () => {
    const ds = datasets.value.find(d => d.id === selectedDatasetId.value);
    const chart = charts.value.find(c => c.id === selectedChartId.value);
    if (!ds || !chart) return;

    emit('insert', {
        chartId: chart.id,
        chartName: chart.name,
        datasetId: ds.id,
        datasetName: ds.name,
    });

    close();
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
