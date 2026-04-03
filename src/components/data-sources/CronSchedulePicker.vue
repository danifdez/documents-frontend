<template>
    <div class="space-y-3">
        <div class="grid grid-cols-3 gap-2">
            <button v-for="preset in presets" :key="preset.value || 'manual'" @click="selectPreset(preset)"
                class="px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center"
                :class="isSelected(preset)
                    ? 'border-accent bg-accent-subtle text-accent-dark'
                    : 'border-border text-text-secondary hover:bg-surface-hover'">
                {{ preset.label }}
            </button>
        </div>
        <div v-if="showCustom" class="space-y-1.5">
            <label class="block text-xs font-medium text-text-secondary">Cron expression</label>
            <input v-model="customCron" type="text" placeholder="0 */6 * * *"
                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                @input="emitCustom" />
            <p class="text-[10px] text-text-muted">Format: minute hour day-of-month month day-of-week</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
    modelValue: string | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string | null];
}>();

const presets = [
    { label: 'Manual only', value: null },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 6 hours', value: '0 */6 * * *' },
    { label: 'Daily (6 AM)', value: '0 6 * * *' },
    { label: 'Weekly (Mon)', value: '0 6 * * 1' },
    { label: 'Custom', value: '__custom__' },
];

const customCron = ref('');
const showCustom = ref(false);

watch(() => props.modelValue, (val) => {
    if (val && !presets.some(p => p.value === val)) {
        showCustom.value = true;
        customCron.value = val;
    }
}, { immediate: true });

const isSelected = (preset: typeof presets[0]) => {
    if (preset.value === '__custom__') return showCustom.value;
    if (preset.value === null) return !props.modelValue && !showCustom.value;
    return props.modelValue === preset.value && !showCustom.value;
};

const selectPreset = (preset: typeof presets[0]) => {
    if (preset.value === '__custom__') {
        showCustom.value = true;
        customCron.value = props.modelValue || '';
    } else {
        showCustom.value = false;
        emit('update:modelValue', preset.value);
    }
};

const emitCustom = () => {
    emit('update:modelValue', customCron.value || null);
};
</script>
