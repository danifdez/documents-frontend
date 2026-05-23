<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="bg-surface-elevated rounded-xl shadow-2xl border border-border max-w-2xl w-full mx-4 overflow-hidden flex flex-col" style="max-height: 85vh;">
                    <div class="px-5 py-3 border-b border-border-light flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-text-primary">Suggested columns</h3>
                        <span class="text-xs text-text-muted">{{ suggestions.length }} proposed</span>
                    </div>
                    <div class="flex-1 overflow-y-auto divide-y divide-border-light">
                        <div v-if="suggestions.length === 0" class="px-5 py-8 text-center text-sm text-text-muted">
                            No suggestions returned.
                        </div>
                        <label v-for="(col, i) in suggestions" :key="col.key || i"
                            class="block px-5 py-3 hover:bg-surface-hover cursor-pointer"
                            :class="{ 'opacity-50': isConflict(col) }">
                            <div class="flex items-start gap-3">
                                <input type="checkbox" :value="col.key" v-model="selectedKeys" :disabled="isConflict(col)"
                                    class="mt-1" />
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-sm font-medium text-text-primary">{{ col.name }}</span>
                                        <span class="text-[10px] text-text-muted">{{ col.key }}</span>
                                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
                                            {{ col.type }}
                                        </span>
                                        <span v-if="isConflict(col)"
                                            class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                            Conflict — will be skipped
                                        </span>
                                    </div>
                                    <p class="mt-1 text-xs text-text-secondary leading-snug">{{ col.description }}</p>
                                    <p v-if="col.type === 'select' && col.options?.length"
                                        class="mt-1 text-[10px] text-text-muted">
                                        Options: {{ col.options.join(', ') }}
                                    </p>
                                </div>
                            </div>
                        </label>
                    </div>
                    <div class="px-5 py-3 border-t border-border-light flex justify-end gap-2">
                        <button type="button" @click="emit('close')"
                            class="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-hover cursor-pointer">
                            Cancel
                        </button>
                        <button type="button" @click="addSelected" :disabled="selectedKeys.length === 0"
                            class="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-dark cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            Add {{ selectedKeys.length }} column{{ selectedKeys.length === 1 ? '' : 's' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { DatasetField } from '../../services/datasets/useDatasets';

const props = defineProps<{
    isOpen: boolean;
    suggestions: DatasetField[];
    existingKeys: Set<string>;
}>();
const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'add', selected: DatasetField[]): void;
}>();

const selectedKeys = ref<string[]>([]);

watch(() => props.isOpen, (open) => {
    if (open) {
        // Default-select every non-conflict suggestion. Faster acceptance is the common path.
        selectedKeys.value = props.suggestions
            .filter((s) => s.key && !props.existingKeys.has(s.key))
            .map((s) => s.key);
    } else {
        selectedKeys.value = [];
    }
});

const isConflict = (col: DatasetField): boolean => !!col.key && props.existingKeys.has(col.key);

const addSelected = () => {
    const map = new Map(props.suggestions.map((s) => [s.key, s]));
    const out: DatasetField[] = [];
    for (const key of selectedKeys.value) {
        const col = map.get(key);
        if (col && !isConflict(col)) out.push(col);
    }
    emit('add', out);
};
</script>
