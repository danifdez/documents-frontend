<template>
    <div class="grid grid-cols-[6rem_1fr] items-start gap-x-2 px-3 py-2">
        <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider pt-1">{{ label }}</span>
        <div>
            <slot>
                <InlineEditField :value="modelValue" :type="type" :options="options" :placeholder="placeholder"
                    :display-format="displayFormat" @save="$emit('update:modelValue', $event)" />
            </slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import InlineEditField from '../ui/InlineEditField.vue';

withDefaults(defineProps<{
    label: string;
    modelValue?: string | number | null;
    type?: 'text' | 'select' | 'date';
    options?: Array<string | { label: string; value: string }>;
    placeholder?: string;
    displayFormat?: (val: string | number | null) => string;
}>(), {
    type: 'text',
    placeholder: 'Click to edit',
});

defineEmits<{
    'update:modelValue': [value: string | number];
}>();
</script>
