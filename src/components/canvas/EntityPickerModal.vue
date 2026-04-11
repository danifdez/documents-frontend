<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Insert Entity</h3>
                        <p class="text-xs text-text-muted mt-0.5">Select an entity to place on the canvas</p>
                    </div>

                    <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        <!-- Search -->
                        <input v-model="searchTerm" type="text" placeholder="Search entities..."
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />

                        <div v-if="loading" class="flex justify-center py-4">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                        </div>

                        <div v-else-if="filtered.length > 0" class="space-y-1 max-h-64 overflow-y-auto">
                            <label v-for="ent in filtered" :key="ent.id"
                                class="flex items-center gap-2.5 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1.5 transition-colors"
                                :class="{ 'bg-accent-subtle': selectedId === ent.id }">
                                <input type="radio" :value="ent.id" v-model="selectedId" name="entity"
                                    class="text-accent focus:ring-accent/20" />
                                <div class="w-2 h-2 rounded-full shrink-0"
                                    :style="{ backgroundColor: typeColor(ent.entityType?.name) }"></div>
                                <span class="truncate">{{ ent.name }}</span>
                                <span class="text-[10px] text-text-muted ml-auto shrink-0">{{ ent.entityType?.name }}</span>
                            </label>
                        </div>

                        <div v-else class="py-4 text-center">
                            <p class="text-sm text-text-muted">{{ searchTerm ? 'No matching entities' : 'No entities found' }}</p>
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
import apiClient from '../../services/api';

const modelValue = defineModel<boolean>({ required: true });

const emit = defineEmits<{
    insert: [config: { entityId: number; entityName: string; entityType: string }];
}>();

const entities = ref<any[]>([]);
const selectedId = ref(0);
const loading = ref(false);
const searchTerm = ref('');

const typeColors: Record<string, string> = {
    PERSON: '#6366f1', PER: '#6366f1',
    ORG: '#3b82f6', ORGANIZATION: '#3b82f6',
    GPE: '#10b981', LOCATION: '#10b981', LOC: '#10b981',
    EVENT: '#f59e0b', WORK: '#ec4899', DATE: '#14b8a6',
};
const typeColor = (t: string) => typeColors[t?.toUpperCase()] || '#94a3b8';

const filtered = computed(() => {
    if (!searchTerm.value) return entities.value;
    const q = searchTerm.value.toLowerCase();
    return entities.value.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.entityType?.name?.toLowerCase().includes(q)
    );
});

watch(modelValue, async (open) => {
    if (open) {
        selectedId.value = 0;
        searchTerm.value = '';
        entities.value = [];
        loading.value = true;
        try {
            const res = await apiClient.get('/entities');
            entities.value = res.data;
        } catch { /* ignore */ }
        finally { loading.value = false; }
    }
});

const close = () => { modelValue.value = false; };

const handleInsert = () => {
    const ent = entities.value.find(e => e.id === selectedId.value);
    if (!ent) return;
    emit('insert', {
        entityId: ent.id,
        entityName: ent.name,
        entityType: ent.entityType?.name || 'UNKNOWN',
    });
    close();
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
