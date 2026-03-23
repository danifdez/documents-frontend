<template>
  <div @dblclick="startEdit" class="group" :class="{ 'cursor-text': !isEditing }">
    <!-- Display mode -->
    <template v-if="!isEditing">
      <span class="text-sm" :class="value ? 'text-text-primary' : 'text-text-muted italic'">
        {{ displayValue || placeholder }}
      </span>
      <svg v-if="!isEditing" xmlns="http://www.w3.org/2000/svg"
        class="inline h-3 w-3 ml-1 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </template>

    <!-- Edit mode -->
    <template v-else>
      <select v-if="type === 'select'" ref="inputRef" :value="editValue" @change="onSelectChange"
        @blur="save" @keydown.enter="save" @keydown.escape="cancel"
        class="input-field text-sm">
        <option v-for="opt in normalizedOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <input v-else ref="inputRef" :type="type" :value="editValue" @input="onInput"
        @blur="save" @keydown.enter="save" @keydown.escape="cancel"
        class="input-field text-sm" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

const props = withDefaults(defineProps<{
  value: string | number | null;
  type?: 'text' | 'select' | 'date' | 'number';
  placeholder?: string;
  options?: Array<string | { label: string; value: string }>;
  displayFormat?: (val: string | number | null) => string;
}>(), {
  type: 'text',
  placeholder: 'Click to edit',
});

const emit = defineEmits<{
  save: [value: string | number];
}>();

const isEditing = ref(false);
const editValue = ref<string | number>(props.value ?? '');
const inputRef = ref<HTMLInputElement | HTMLSelectElement | null>(null);

const normalizedOptions = computed(() =>
  (props.options || []).map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  )
);

const displayValue = computed(() => {
  if (props.displayFormat) return props.displayFormat(props.value);
  if (props.type === 'select' && props.options) {
    const opt = normalizedOptions.value.find((o) => o.value === String(props.value));
    return opt?.label || String(props.value ?? '');
  }
  return String(props.value ?? '');
});

async function startEdit() {
  editValue.value = props.value ?? '';
  isEditing.value = true;
  await nextTick();
  inputRef.value?.focus();
}

function save() {
  isEditing.value = false;
  if (editValue.value !== props.value) {
    emit('save', editValue.value);
  }
}

function cancel() {
  isEditing.value = false;
  editValue.value = props.value ?? '';
}

function onInput(e: Event) {
  editValue.value = (e.target as HTMLInputElement).value;
}

function onSelectChange(e: Event) {
  editValue.value = (e.target as HTMLSelectElement).value;
  save();
}
</script>
