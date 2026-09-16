<template>
  <div class="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface p-1">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="min-h-8 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer"
      :class="modelValue === option.value
        ? 'bg-surface-elevated text-text-primary shadow-sm ring-1 ring-border/70'
        : 'text-text-muted hover:bg-surface-hover hover:text-text-secondary'"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
