<template>
    <div class="space-y-3">
        <div v-for="field in fields" :key="field.key">
            <label :for="`${formId}-schema-field-${field.key}`" class="block text-xs font-medium text-text-secondary mb-1.5">
                {{ field.title }}
                <span v-if="field.required" class="text-red-400">*</span>
            </label>
            <p v-if="field.description" class="text-[10px] text-text-muted mb-1">{{ field.description }}</p>

            <!-- Select / enum -->
            <select :id="`${formId}-schema-field-${field.key}`" v-if="field.enum" v-model="model[field.key]"
                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                <option v-for="opt in field.enum" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- Boolean -->
            <label v-else-if="field.type === 'boolean'" class="flex items-center gap-2 cursor-pointer">
                <input :id="`${formId}-schema-field-${field.key}`" type="checkbox" v-model="model[field.key]"
                    class="rounded border-border text-accent focus:ring-accent/20" />
                <span class="text-sm text-text-primary">{{ field.title }}</span>
            </label>

            <!-- Number -->
            <input :id="`${formId}-schema-field-${field.key}`" v-else-if="field.type === 'number'" type="number" v-model.number="model[field.key]"
                :placeholder="field.description || ''"
                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />

            <!-- Text (default) -->
            <input :id="`${formId}-schema-field-${field.key}`" v-else v-model="model[field.key]"
                :placeholder="field.description || ''"
                :class="[
                    'block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent',
                    field.isSecret ? 'font-mono' : ''
                ]"
                :type="field.isSecret ? 'password' : 'text'" />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ProviderSchema } from '../../services/data-sources/useDataSources';
import { useId, computed } from 'vue';

const formId = useId();

const props = defineProps<{
    schema: ProviderSchema;
    modelValue: Record<string, unknown>;
    secretFields?: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: Record<string, unknown>];
}>();

const model = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
});

interface FieldDef {
    key: string;
    title: string;
    description?: string;
    type: string;
    enum?: string[];
    required: boolean;
    isSecret: boolean;
    default?: unknown;
}

const fields = computed<FieldDef[]>(() => {
    if (!props.schema?.properties) return [];

    const required = props.schema.required || [];
    return Object.entries(props.schema.properties).map(([key, prop]) => {
        // Initialize default values
        if (model.value[key] === undefined && prop.default !== undefined) {
            model.value[key] = prop.default;
        }

        return {
            key,
            title: prop.title || key,
            description: prop.description,
            type: prop.type || 'string',
            enum: prop.enum,
            required: required.includes(key),
            isSecret: props.secretFields || key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret'),
            default: prop.default,
        };
    });
});
</script>
