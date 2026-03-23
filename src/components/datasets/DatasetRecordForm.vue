<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div
                    class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">
                            {{ record ? 'Edit Record' : 'New Record' }}
                        </h3>
                    </div>
                    <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div v-for="field in schema" :key="field.key">
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">
                                {{ field.name }}
                                <span v-if="field.required" class="text-red-400">*</span>
                            </label>

                            <!-- Text -->
                            <input v-if="field.type === 'text'" v-model="formData[field.key]" type="text"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />

                            <!-- Number -->
                            <input v-else-if="field.type === 'number'" v-model.number="formData[field.key]"
                                type="number"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />

                            <!-- Boolean -->
                            <label v-else-if="field.type === 'boolean'"
                                class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="formData[field.key]"
                                    class="rounded border-border text-accent focus:ring-accent/20" />
                                <span class="text-sm text-text-primary">{{ formData[field.key] ? 'Yes' : 'No' }}</span>
                            </label>

                            <!-- Date -->
                            <input v-else-if="field.type === 'date'" v-model="formData[field.key]" type="date"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />

                            <!-- Datetime -->
                            <input v-else-if="field.type === 'datetime'" v-model="formData[field.key]" type="datetime-local"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />

                            <!-- Time -->
                            <input v-else-if="field.type === 'time'" v-model="formData[field.key]" type="time"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />

                            <!-- Select -->
                            <select v-else-if="field.type === 'select'" v-model="formData[field.key]"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option value="">-- Select --</option>
                                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="$emit('close')" variant="secondary">Cancel</Button>
                        <Button @click="handleSubmit" variant="info" :disabled="saving">
                            {{ saving ? 'Saving...' : 'Save' }}
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { DatasetField, DatasetRecord } from '../../services/datasets/useDatasets';
import Button from '../ui/Button.vue';

const props = defineProps<{
    isOpen: boolean;
    schema: DatasetField[];
    record?: DatasetRecord | null;
}>();

const emit = defineEmits<{
    close: [];
    save: [data: Record<string, any>];
}>();

const formData = ref<Record<string, any>>({});
const saving = ref(false);

watch(() => props.isOpen, (open) => {
    if (open) {
        if (props.record) {
            formData.value = { ...props.record.data };
        } else {
            formData.value = {};
            for (const field of props.schema) {
                formData.value[field.key] = field.type === 'boolean' ? false : '';
            }
        }
    }
});

const handleSubmit = () => {
    saving.value = true;
    emit('save', { ...formData.value });
    setTimeout(() => { saving.value = false; }, 300);
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
