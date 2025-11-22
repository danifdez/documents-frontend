<template>
    <div class="mt-2 flex items-center gap-3 text-sm">
        <span class="px-2 py-1 rounded bg-yellow-50 text-yellow-800">{{ label }} "{{ term }}"</span>
        <Button size="small" variant="secondary" className="ml-2" @click="$emit('clear')">Clear</Button>
    </div>
</template>

<script setup lang="ts">
import Button from '../ui/Button.vue';

const props = defineProps({
    term: { type: String, default: '' },
    label: { type: String, default: 'Filtered by' },
});
</script>
