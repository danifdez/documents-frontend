<template>
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-subtle text-accent-dark text-sm font-medium">
        <span>{{ label }} "{{ term }}"</span>
        <button @click="$emit('clear')"
            class="p-0.5 rounded-full hover:bg-accent/10 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd" />
            </svg>
        </button>
    </div>
</template>

<script setup lang="ts">
defineProps({
    term: { type: String, default: '' },
    label: { type: String, default: 'Filtered by' },
});
</script>
