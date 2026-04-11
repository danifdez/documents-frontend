<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Insert Timeline</h3>
                        <p class="text-xs text-text-muted mt-0.5">Embed a saved timeline from this project</p>
                    </div>

                    <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div v-if="loadingTimelines" class="flex justify-center py-4">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                        </div>

                        <template v-else-if="timelines.length > 0">
                            <!-- Timeline selector -->
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Timeline *</label>
                                <div class="space-y-1">
                                    <label v-for="tl in timelines" :key="tl.id"
                                        class="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1.5 transition-colors"
                                        :class="{ 'bg-accent-subtle': selectedId === tl.id }">
                                        <input type="radio" :value="tl.id" v-model="selectedId" name="timeline"
                                            class="text-accent focus:ring-accent/20" />
                                        {{ tl.name }}
                                        <span class="text-[10px] text-text-muted">({{ (tl.timelineData || []).length }} events)</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Filter options (only if a timeline is selected) -->
                            <template v-if="selectedId">
                                <div>
                                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Filter</label>
                                    <select v-model="filterMode"
                                        class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                        <option value="all">All events</option>
                                        <option v-if="selectedEpochs.length" value="epoch">By epoch</option>
                                        <option value="range">By date range</option>
                                    </select>
                                </div>

                                <!-- Epoch selector -->
                                <div v-if="filterMode === 'epoch' && selectedEpochs.length">
                                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Epoch</label>
                                    <div class="space-y-1">
                                        <label v-for="ep in selectedEpochs" :key="ep.id"
                                            class="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1.5 transition-colors"
                                            :class="{ 'bg-accent-subtle': selectedEpochId === ep.id }">
                                            <input type="radio" :value="ep.id" v-model="selectedEpochId" name="epoch"
                                                class="text-accent focus:ring-accent/20" />
                                            <div class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: ep.color }"></div>
                                            {{ ep.name }}
                                        </label>
                                    </div>
                                </div>

                                <!-- Date range -->
                                <div v-if="filterMode === 'range'" class="flex gap-3">
                                    <div class="flex-1">
                                        <label class="block text-xs font-medium text-text-secondary mb-1">From</label>
                                        <input v-model="dateFrom" type="date"
                                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                    </div>
                                    <div class="flex-1">
                                        <label class="block text-xs font-medium text-text-secondary mb-1">To</label>
                                        <input v-model="dateTo" type="date"
                                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                    </div>
                                </div>
                            </template>
                        </template>

                        <div v-else class="py-4 text-center">
                            <p class="text-sm text-text-muted">No timelines in this project</p>
                            <p class="text-xs text-text-muted mt-1">Create a timeline first</p>
                        </div>
                    </div>

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="close" variant="secondary">Cancel</Button>
                        <Button @click="handleInsert" variant="info" :disabled="!selectedId">Insert</Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from '../ui/Button.vue';
import { useTimelines } from '../../services/timelines/useTimelines';
import { useProjectStore } from '../../store/projectStore';

const modelValue = defineModel<boolean>({ required: true });

const emit = defineEmits<{
    insert: [config: {
        timelineId: number;
        timelineName: string;
        filterMode: 'all' | 'epoch' | 'range';
        epochId?: string;
        dateFrom?: string;
        dateTo?: string;
    }];
}>();

const projectStore = useProjectStore();
const { loadTimelinesByProject } = useTimelines();

const timelines = ref<any[]>([]);
const selectedId = ref(0);
const loadingTimelines = ref(false);
const filterMode = ref<'all' | 'epoch' | 'range'>('all');
const selectedEpochId = ref('');
const dateFrom = ref('');
const dateTo = ref('');

const selectedEpochs = computed(() => {
    const tl = timelines.value.find(t => t.id === selectedId.value);
    return tl?.epochs || [];
});

watch(selectedId, () => {
    filterMode.value = 'all';
    selectedEpochId.value = '';
    dateFrom.value = '';
    dateTo.value = '';
});

watch(modelValue, async (open) => {
    if (open) {
        selectedId.value = 0;
        timelines.value = [];
        filterMode.value = 'all';
        const projectId = projectStore.currentProject?.id;
        if (!projectId) return;
        loadingTimelines.value = true;
        try {
            timelines.value = await loadTimelinesByProject(projectId);
        } catch { /* ignore */ }
        finally { loadingTimelines.value = false; }
    }
});

const close = () => { modelValue.value = false; };

const handleInsert = () => {
    const tl = timelines.value.find(t => t.id === selectedId.value);
    if (!tl) return;
    emit('insert', {
        timelineId: tl.id,
        timelineName: tl.name,
        filterMode: filterMode.value,
        epochId: filterMode.value === 'epoch' ? selectedEpochId.value : undefined,
        dateFrom: filterMode.value === 'range' ? dateFrom.value : undefined,
        dateTo: filterMode.value === 'range' ? dateTo.value : undefined,
    });
    close();
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
