<template>
    <button type="button" class="block w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary cursor-pointer transition-colors duration-150"
        :class="className" role="menuitem" @click="$emit('click', $event)">
        <slot></slot>
    </button>
</template>

<script setup lang="ts">
defineProps({
    className: {
        type: String,
        default: ''
    }
});

defineEmits(['click']);
</script>