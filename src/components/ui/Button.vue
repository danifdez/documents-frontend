<template>
    <button :class="[
        'rounded-md transition-colors duration-200 ease-in-out',
        'text-gray-600 border border-gray-300',
        'hover:text-white hover:bg-gray-400 hover:border-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
    ]" :disabled="disabled" @click="$emit('click', $event)">
        <slot></slot>
    </button>
</template>

<script setup lang="ts">
defineProps({
    disabled: {
        type: Boolean,
        default: false
    },
    className: {
        type: String,
        default: ''
    }
});

defineEmits(['click']);
</script>