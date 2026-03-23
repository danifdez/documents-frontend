<template>
  <div>
    <label v-if="label" :for="fieldId" class="input-label">{{ label }}</label>
    <textarea v-if="type === 'textarea'" :id="fieldId" :value="modelValue" @input="onInput"
      :placeholder="placeholder" :required="required" :rows="rows"
      class="input-field resize-none" />
    <select v-else-if="type === 'select'" :id="fieldId" :value="modelValue" @change="onSelect"
      :required="required" class="input-field">
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in normalizedOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <input v-else :id="fieldId" :type="type" :value="modelValue" @input="onInput"
      :placeholder="placeholder" :required="required" class="input-field" />
    <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
    <p v-if="hint" class="mt-1 text-xs text-text-muted">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  label?: string;
  modelValue?: string | number;
  type?: 'text' | 'textarea' | 'select' | 'password' | 'email' | 'number' | 'date' | 'url';
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  rows?: number;
  options?: Array<string | { label: string; value: string }>;
}>(), {
  type: 'text',
  rows: 3,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const fieldId = computed(() => `field-${props.label?.toLowerCase().replace(/\s+/g, '-') || 'input'}`);

const normalizedOptions = computed(() =>
  (props.options || []).map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  )
);

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', props.type === 'number' ? Number(target.value) : target.value);
}

function onSelect(e: Event) {
  const target = e.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
}
</script>
