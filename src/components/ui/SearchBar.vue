<template>
  <div class="relative">
    <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      :value="modelValue"
      @input="onInput"
      :placeholder="placeholder"
      class="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
    />
    <button v-if="modelValue" @click="clear"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string;
  placeholder?: string;
}>(), {
  modelValue: '',
  placeholder: 'Search...',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}

function clear() {
  emit('update:modelValue', '');
}
</script>
