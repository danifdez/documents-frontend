<template>
    <div class="block px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary cursor-pointer transition-colors duration-150"
        :class="className" role="menuitem" tabindex="-1" @click="$emit('click', $event)">
        <slot></slot>
    </div>
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